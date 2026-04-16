import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { MailService } from "src/modules/common/mail-service";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { UpdatePasswordDto } from "../dto/update-password.dto";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { MailConfigurationDocument, MailConfigurationSchema } from "src/modules/mail-configuration/schema/mail-configuration.schema";

@Injectable()

export class PasswordHandlerService {

    constructor(
        @InjectModel( TenantSchema.name ) private tenant: Model<TenantDocument>,
        @InjectModel( UserSchema.name ) private user: Model<UserDocument>,
        @InjectModel( MailConfigurationSchema.name ) private mail_configuration: Model<MailConfigurationDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly mail_service: MailService,
        private readonly commonFn: CommonFunctions
    ) { }

    /*
    @Usage                     : To check given username/email exist , if exist then send mail
    @Param ForgotPasswordDto   : Contains username/email
    @return Object             : Success / Error
    */

    async getEntityDetails ( ForgotPasswordDto: ForgotPasswordDto ) {
        let { username, entity, tenant_domain } = ForgotPasswordDto;
        entity = entity.toLowerCase();
        let user;
        if ( entity == "tenant" ) {
            user = await this.commonDbFn.selectOne( this.tenant, username );
        } else {
            let tenantDetail = await this.tenant.findOne( { domain: tenant_domain }, { _id: 0, uuid: 1 } ).exec();

            /*if (tenantDetail == null) {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Tenant not found by given domain");
            }*/

            let uuid = tenantDetail?.uuid;
            // user = await this.user.findOne({ $and: [{ username }, { tenant_uuid: uuid }] }).exec();
            user = await this.user.findOne( { $and: [ { $or: [ { tenant_uuid: uuid } ] }, { $or: [ { email: username }, { username } ] } ] } ).exec();
        }

        //For future may be we need to add condition for admin
        if ( user == null ) {
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "User not found" );
        }

        //Get SMTP details of parent entity
        let parentSMTPDetails, mailSentURL;
        if ( entity == "tenant" ) {
            mailSentURL = `https://${process.env.TENANT_PORTAL_DOMIAN}:${process.env.TENANT_PORTAL_PORT}/forgot-password`;
            parentSMTPDetails = await this.mail_configuration.findOne( { tenant_uuid: user.creation_uuid } ).exec();
        } else {
            mailSentURL = `https://${tenant_domain}/forgot-password`;
            parentSMTPDetails = await this.mail_configuration.findOne( { tenant_uuid: user.tenant_uuid } ).exec();
        }

        if ( parentSMTPDetails == null ) {
            Logger.error( `SMTP not configured or status is disabled` );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "There is a configuration error" );
        }

        parentSMTPDetails.password = this.commonFn.decode( parentSMTPDetails?.password );
        //Send mail
        let result = this.mail_service.sendMail( user, parentSMTPDetails, mailSentURL );
        if ( result ) {
            if ( entity == "tenant" ) {
                //Update mail_link_status to 0 - Mail sent successfully
                let response = await this.tenant.updateOne( { uuid: user.uuid }, { mail_link_status: "0" } ).exec();
                if ( response.modifiedCount > 0 ) {
                    Logger.debug( `mail_link_status set to 0 == Mail sent` );
                }
            } else {
                //Update mail_link_status to 0 - Mail sent successfully
                let response = await this.user.updateOne( { uuid: user.uuid }, { mail_link_status: "0" } ).exec();
                if ( response.modifiedCount > 0 ) {
                    Logger.debug( `mail_link_status set to 0 == Mail sent` );
                }
            }
        }
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Reset password link successfully sent to your email id" );
    }

    /*
    @Usage                     : To update password
    @Param updatePasswordDto   : Contains encoded uuid and password
    @return Object             : Success / Error
    */

    async updatePassword ( updatePasswordDto: UpdatePasswordDto ) {
        let { password, uuid, entity } = updatePasswordDto;
        let decodeUUID, user;
        entity = entity.toLowerCase();
        //Decode received uuid.
        try {
            decodeUUID = this.commonFn.decode( uuid );
        } catch ( error ) {
            Logger.error( "User not found", `Reason : ${error.reason} due to tampered data` );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, "User not found" );
        }

        if ( entity == "tenant" ) {
            user = await this.tenant.findOne( { uuid: decodeUUID }, { uuid: 1, mail_link_status: 1 } ).exec();
        } else {
            user = await this.user.findOne( { uuid: decodeUUID }, { uuid: 1, mail_link_status: 1 } ).exec();
        }

        //Check mail_link_status , same link is using multiple times or not[which we sent in mail].
        if ( user.mail_link_status == "1" ) {
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.FORBIDDEN, `Link has been expired` );
        }

        if ( user == null ) {
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.NOT_FOUND, `${entity.charAt( 0 ).toUpperCase() + entity.slice( 1 )} not found` );
        }
        let logMessages = {
            logErrorMsg: `${entity.charAt( 0 ).toUpperCase() + entity.slice( 1 )} not found by uuid : ${decodeUUID} \n`,
            logSuccessMsg: `Password updated successfully by uuid : ${decodeUUID} \n`
        }
        let encodePassword = this.commonFn.encode( password );

        if ( entity == "tenant" ) {
            return this.commonDbFn.update( this.tenant, decodeUUID, { password: encodePassword, mail_link_status: "1" }, JSON.stringify( logMessages ) );
        } else {
            return this.commonDbFn.update( this.user, decodeUUID, { password: encodePassword, mail_link_status: "1" }, JSON.stringify( logMessages ) );

        }
    }
}
