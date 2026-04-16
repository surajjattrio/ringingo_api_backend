import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { MasterAdmin, MasterAdminDocument } from "src/modules/master-admin/schema/master-admin";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { ChangePasswordDto } from "../dto/change-password.dto";
import * as bcrypt from 'bcrypt';
import { WebHookDto } from "../dto/web-hook.dto";
import { WebHookDocument, WebHookSchema } from "../schema/web-hook.schema";

@Injectable()

export class ProfileService {

    /*
    @Usage              : To load schema's and other libraries
    @Param @InjectModel : It will load schema's
    @Param commonFn     : To use common created function
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [tenant,user,master_admin,commonFn,commonDbFn] 
    */

    constructor(
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        @InjectModel(MasterAdmin.name) private readonly master_admin: Model<MasterAdminDocument>,
	@InjectModel(WebHookSchema.name) private readonly web_hook: Model<WebHookDocument>,
        private readonly commonFn: CommonFunctions,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                    : To change password of tenant/agent/admin.
    @Param  changePasswordDto : string
    @return Object            : Success / Error  
    */

    async changePassword(changePasswordDto: ChangePasswordDto) {
        let { role, tenant_uuid, uuid, password, current_password } = changePasswordDto;
        let result, master_admin_uuid, error = "error", getCurrentPassword, decodeCurrentPassword;

        let logMessages = {
            logErrorMsg: `${role.charAt(0).toUpperCase() + role.slice(1)} not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Password updated successfully by uuid : ${uuid} \n`
        }

        Logger.debug(`Request to change password for ${role}`);
        switch (role) {
            case "master_admin":
                master_admin_uuid = tenant_uuid;
                getCurrentPassword = await this.master_admin.findOne({ master_admin_uuid }, { password: 1 }).exec();
		console.log("PASS",getCurrentPassword.password,current_password);
                result = await bcrypt.compare(current_password,getCurrentPassword.password);
		console.log("result",result);
                if (result) {
                    error = "";
                    try {
                        let salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_HASH_ROUND));
                        let hash = await bcrypt.hash(password, salt);
                        password = hash;
                    } catch (error) {
                        Logger.error("Error in generating password", error.message)
                        return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Error in generating password");
                    }
                    result = await this.commonDbFn.update(this.master_admin, master_admin_uuid, { password }, JSON.stringify(logMessages));
                }
		console.log("error",error);
                break;
            case "tenant":
                error = "error";
                uuid = tenant_uuid;
                getCurrentPassword = await this.tenant.findOne({ uuid }, { password: 1 }).exec();
                decodeCurrentPassword = this.commonFn.decode(getCurrentPassword.password);
                if (decodeCurrentPassword == current_password) {
                    error = "";
                    password = this.commonFn.encode(password);
                    result = await this.commonDbFn.update(this.tenant, uuid, { password }, JSON.stringify(logMessages));
                }
                break;
            case "agent":
                getCurrentPassword = await this.user.findOne({ uuid }, { password: 1 }).exec();
                decodeCurrentPassword = this.commonFn.decode(getCurrentPassword.password);
                if (decodeCurrentPassword == current_password) {
                    error = "";
                    password = this.commonFn.encode(password);
                    result = await this.commonDbFn.update(this.user, uuid, { password }, JSON.stringify(logMessages));
                }
                break;
        }
        if (error !== "") {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Please enter correct old password");
        }
        return result;
    }

    /*
    @Usage                          : To add web hook
    @Param webHookDto               : Request DTO
    @return success / error object  : { Web hook added successfully }
    */

    async addWebHookDetails(webHookDto: WebHookDto) {
        const { tenant_uuid } = webHookDto;
        await this.web_hook.updateOne({tenant_uuid},webHookDto,{upsert : true}).exec();
        Logger.debug(`Web hook details updated successfully with tenant ${tenant_uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,`Web hook updated successfully`)
    }

    /*
    @Usage                 : To fetch web hook details for particular tenant
    @Param tenant_uuid     : uuid of tenant
    @return object         : Success / Error
    */

    async getWebHookDetails(tenant_uuid) {
        let response = await this.web_hook.findOne({ tenant_uuid }).exec();
	let statusCode = response != null ? HttpStatus.OK : HttpStatus.NOT_FOUND;
        return this.commonDbFn.sendResponseWithMessage(statusCode, response);
    }
}
