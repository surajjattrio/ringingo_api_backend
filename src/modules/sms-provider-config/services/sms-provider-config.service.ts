import { BadRequestException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import {
    SmsProviderConfigDocument, SmsProviderConfigSchema, SMS_PROVIDER_DEFAULT_TIMEOUT_MS, SMS_PROVIDER_TIMEOUT_HARD_CAP_MS
} from "../schema/sms-provider-config.schema";
import { CreateSmsProviderConfigDto } from "../dto/create-sms-provider-config.dto";
import { UpdateSmsProviderConfigDto } from "../dto/update-sms-provider-config.dto";
import {
    findUnresolvedBodyTemplatePlaceholders, fitsSingleSegment, isParseableDotPath, renderTemplateForLengthCheck
} from "../utils/sms-validation.util";

@Injectable()
export class SmsProviderConfigService {

    constructor(
        @InjectModel(SmsProviderConfigSchema.name) private readonly configModel: Model<SmsProviderConfigDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
    ) { }

    /*
    @Usage : Validates the cross-field rules that can't be expressed as plain DTO decorators:
             messageIdPath is a parseable dot path, every {{placeholder}} in bodyTemplate
             resolves against the fixed reserved names plus this config's declared variables,
             and templateBody still fits a single SMS segment once those variables are filled in.
    */
    private assertCrossFieldValid(bodyTemplate: any, variables: string[], templateBody: string, messageIdPath?: string) {
        if (messageIdPath && !isParseableDotPath(messageIdPath)) {
            throw new BadRequestException(`messageIdPath "${messageIdPath}" is not a parseable dot path`);
        }
        const unresolved = findUnresolvedBodyTemplatePlaceholders(bodyTemplate, variables || []);
        if (unresolved.length > 0) {
            throw new BadRequestException(
                `bodyTemplate uses placeholder(s) not declared in variables: ${unresolved.join(", ")}`,
            );
        }
        const rendered = renderTemplateForLengthCheck(templateBody, variables || []);
        if (!fitsSingleSegment(rendered)) {
            throw new BadRequestException(
                `templateBody does not fit a single SMS segment once variables are filled in (rendered length: ${rendered.length})`,
            );
        }
    }

    private clampTimeout(timeoutMs?: number): number {
        return Math.min(timeoutMs || SMS_PROVIDER_DEFAULT_TIMEOUT_MS, SMS_PROVIDER_TIMEOUT_HARD_CAP_MS);
    }

    // Never returned by a GET — replaced with a boolean flag so the UI can show
    // "credentials configured" without ever seeing the plaintext or the cipher text.
    private mask(doc: any) {
        const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
        const { credentials, ...rest } = plain;
        return { ...rest, hasCredentials: Boolean(credentials) };
    }

    async create(tenantUuid: string, dto: CreateSmsProviderConfigDto) {
        this.assertCrossFieldValid(dto.bodyTemplate, dto.variables, dto.templateBody, dto.messageIdPath);
        const insertData: any = {
            ...dto,
            tenantUuid,
            timeoutMs: this.clampTimeout(dto.timeoutMs),
            credentials: this.commonFn.encode(JSON.stringify(dto.credentials || {})),
        };
        const doc = new this.configModel(insertData);
        await doc.save();
        Logger.debug(`SMS provider config "${dto.name}" created successfully for tenant ${tenantUuid}`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CREATED, this.mask(doc), "SMS provider config created successfully");
    }

    async findAll(tenantUuid: string) {
        const data = await this.configModel.find({ tenantUuid }).sort({ createdAt: -1 }).exec();
        const masked = data.map((doc) => this.mask(doc));
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, masked, masked.length);
    }

    async findOne(tenantUuid: string, uuid: string) {
        const doc = await this.configModel.findOne({ uuid, tenantUuid }).exec();
        if (!doc) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "SMS provider config not found");
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, this.mask(doc));
    }

    async update(tenantUuid: string, uuid: string, dto: UpdateSmsProviderConfigDto) {
        const existing = await this.configModel.findOne({ uuid, tenantUuid }).exec();
        if (!existing) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "SMS provider config not found");
        }

        const bodyTemplate = dto.bodyTemplate ?? existing.bodyTemplate;
        const variables = dto.variables ?? (existing.variables as unknown as string[]);
        const templateBody = dto.templateBody ?? existing.templateBody.toString();
        const messageIdPath = dto.messageIdPath ?? existing.messageIdPath?.toString();
        this.assertCrossFieldValid(bodyTemplate, variables, templateBody, messageIdPath);

        const updateData: any = { ...dto };
        if (dto.timeoutMs !== undefined) updateData.timeoutMs = this.clampTimeout(dto.timeoutMs);
        if (dto.credentials !== undefined) updateData.credentials = this.commonFn.encode(JSON.stringify(dto.credentials));

        const result = await this.configModel.updateOne({ uuid, tenantUuid }, updateData).exec();
        if (result.matchedCount === 0) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "SMS provider config not found");
        }
        Logger.debug(`SMS provider config ${uuid} updated successfully for tenant ${tenantUuid}`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "SMS provider config updated successfully");
    }

    async remove(tenantUuid: string, uuid: string) {
        const result = await this.configModel.deleteOne({ uuid, tenantUuid }).exec();
        if (result.deletedCount === 0) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "SMS provider config not found");
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "SMS provider config deleted successfully");
    }
}
