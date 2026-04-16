import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Voice, VoiceDocument } from "src/modules/voice-alert/schema/voice-alert.schema";
import { CommonFunctions } from "src/modules/common/common_functions";
import { GreetingService } from "src/modules/greeting/services/greeting.service";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { DidDocument, DidSchema } from "src/modules/did/schema/did.schema";
import { UserGroupDocument, UserGroupSchema } from "src/modules/user-group/schema/user-group.schema";
import { OutgoingRulesDocument, OutgoingRulesSchema } from "src/modules/outgoing-rules/schema/outgoing-rules.schema";
import { TrunkDocument, TrunkSchema } from "src/modules/trunk/schema/trunk.schema";

@Injectable()
export class VoiceAlertService {

    constructor(
        @InjectModel(Voice.name) private readonly voice_alert_model: Model<VoiceDocument>,
        @InjectModel(DidSchema.name) private readonly did: Model<DidDocument>,
        @InjectModel(UserGroupSchema.name) private readonly user_group: Model<UserGroupDocument>,
        @InjectModel(OutgoingRulesSchema.name) private readonly outgoing_rule: Model<OutgoingRulesDocument>,
        @InjectModel(TrunkSchema.name) private readonly trunk: Model<TrunkDocument>,
        private readonly greetingService: GreetingService,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions
    ) { }

    /**
     * Creates a voice alert by validating input, resolving necessary resources,
     * generating the audio path, and initiating a FreeSWITCH call.
     * @param body - The request body containing category, phone_number, and text.
     * @param req - The request object containing user information.
     * @param queryParam - The query parameters containing the user group ID.
     * @returns An object with statusCode, message, and optional data.
     */
    async createVoiceAlert(body: any, req: any, queryParam: any) {
        try {
            const { id } = queryParam;
            const { user } = req;
            const { category, phone_number, text } = this.validateRequestBody(body);
            const payload = { category, phone_number, text, tenant_uuid: user.uuid, user_group_uuid: id };
            const audioPath = `${process.env.UPLOAD_DIRECTORY}voice_alert/${phone_number}.wav`;
            const callerId = await this.getRandomDidNumber(user.uuid);
            const userGroup = await this.getUserGroup(id, user.uuid);
            const outgoingRule = await this.getOutgoingRule(userGroup.outbound_rule);
            const { finalDialNumber, matchedRule } = this.getFinalDialNumber(phone_number, outgoingRule.rules);
            const trunk = await this.getTrunkName(matchedRule.trunk_uuid, user.uuid);

            await this.voice_alert_model.create(payload);

            const command = this.buildFsCommand({ callerId, finalDialNumber, trunk, audioPath });
            const fsConnection = this.commonFn.fetchFsConnection();
            const response = await fsConnection.api(command);

            Logger.debug(`Voice Alert command sent: ${command}`);
            return { statusCode: HttpStatus.OK, message: "Voice Alert call initiated", data: response };
        } catch (error) {
            Logger.error("Voice Alert Error", error);

            if (error instanceof HttpException) { return { statusCode: error.getStatus(), message: error.message }; }
            return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: "Voice Alert call failed" };
        }
    }

    /**
     * Validates the request body to ensure required fields are present.
     * @param body - The request body object.
     * @returns An object containing category, phone_number, and text.
     * @throws HttpException if required fields are missing.
     */
    private validateRequestBody(body: any) {
        const { category, phone_number, text } = body || {};

        if (!category || !phone_number || !text) { throw new HttpException("category, phone_number and text are required", HttpStatus.BAD_REQUEST); }
        return { category, phone_number, text };
    }

    /**
     * Retrieves a random DID number for the given tenant.
     * @param tenantUuid - The UUID of the tenant.
     * @returns A random DID number string.
     * @throws HttpException if no DID is available for the tenant.
     */
    private async getRandomDidNumber(tenantUuid: string) {
        const didDetails: any = await this.did.find({ tenant_uuid: tenantUuid }, { number: 1, _id: 0 });

        if (!didDetails || didDetails?.length === 0) { throw new HttpException("No DID available for this tenant", HttpStatus.BAD_REQUEST); }
        return didDetails[Math.floor(Math.random() * didDetails.length)].number;
    }

    /**
     * Retrieves the user group for the given UUID and tenant.
     * @param userGroupUuid - The UUID of the user group.
     * @param tenantUuid - The UUID of the tenant.
     * @returns The user group document.
     * @throws HttpException if the user group is not found.
     */
    private async getUserGroup(userGroupUuid: string, tenantUuid: string) {
        const group: any = await this.user_group.findOne({ uuid: userGroupUuid, tenant_uuid: tenantUuid });

        if (!group) { throw new HttpException("User group not found", HttpStatus.BAD_REQUEST); }
        return group;
    }

    /**
     * Retrieves the outgoing rule for the given UUID.
     * @param outboundRuleUuid - The UUID of the outbound rule.
     * @returns The outgoing rule document.
     * @throws HttpException if the outgoing rule is not configured or has no rules.
     */
    private async getOutgoingRule(outboundRuleUuid: string) {
        const outgoingRule: any = await this.outgoing_rule.findOne({ uuid: outboundRuleUuid });

        if (!outgoingRule?.rules?.length) { throw new HttpException("Outgoing rule not configured", HttpStatus.BAD_REQUEST); }
        return outgoingRule;
    }

    /**
     * Processes the phone number against outgoing rules to determine the final dial number.
     * Filters rules by length, then checks prefix, applies strip and prepend operations.
     * @param phoneNumber - The original phone number.
     * @param rules - Array of outgoing rules.
     * @returns An object containing the final dial number and the matched rule.
     * @throws HttpException if no matching rule is found or length doesn't match.
     */
    private getFinalDialNumber(phoneNumber: string, rules: any[]) {
        const normalizedNumber = phoneNumber.replace(/\D/g, "");
        const lengthMatchedRules = rules.filter((r: any) => r.length && normalizedNumber.length === Number(r.length));

        if (lengthMatchedRules?.length === 0) { throw new HttpException("Number length does not match any rule", HttpStatus.BAD_REQUEST); }
        let matchedRule: any = null;
        let finalDialNumber = normalizedNumber;

        for (const rule of lengthMatchedRules) {
            if (rule.prefix && !normalizedNumber.startsWith(rule.prefix)) { continue; }
            matchedRule = rule;
            let tempNumber = normalizedNumber;
            if (rule.strip && tempNumber.startsWith(rule.strip)) { tempNumber = tempNumber.slice(rule.strip.length); }
            if (rule.prepend) { tempNumber = rule.prepend + tempNumber; }
            finalDialNumber = tempNumber;
            break;
        }

        if (!matchedRule) { throw new HttpException("No matching outgoing rule", HttpStatus.BAD_REQUEST); }
        return { finalDialNumber, matchedRule };
    }

    /**
     * Retrieves the trunk name for the given trunk UUID and tenant.
     * @param trunkUuid - The UUID of the trunk.
     * @param tenantUuid - The UUID of the tenant.
     * @returns The trunk name string.
     * @throws HttpException if the trunk is not available for the tenant.
     */
    private async getTrunkName(trunkUuid: string, tenantUuid: string) {
        const trunkData: any = await this.trunk.findOne({ uuid: trunkUuid, tenant_uuid: tenantUuid });
        if (!trunkData?.name) { throw new HttpException("Trunk not available for this tenant", HttpStatus.BAD_REQUEST); }
        return trunkData.name;
    }

    /**
     * Builds the FreeSWITCH command string for originating the voice alert call.
     * @param params - An object containing callerId, finalDialNumber, trunk, and audioPath.
     * @returns The constructed FreeSWITCH command string.
     */
    private buildFsCommand({ callerId, finalDialNumber, trunk, audioPath }: { callerId: string; finalDialNumber: string; trunk: string; audioPath: string; }) {
        return `bgapi originate {ignore_early_media=true,origination_caller_id_name=${callerId},origination_caller_id_number=${callerId},sip_h_P-cb_destination=${finalDialNumber},effective_caller_id_number=${callerId},authentication_type=clicktocall,playback_file=${audioPath}}sofia/gateway/${trunk}/${finalDialNumber} &lua(${process.env.FS_SCRIPT}voice_alert.lua)`;
    }
}
