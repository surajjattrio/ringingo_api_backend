import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { PassportStrategy } from "@nestjs/passport";
import { Model } from "mongoose";
import { Strategy } from "passport-local";
import * as bcrypt from 'bcrypt';
import { MasterAdmin, MasterAdminDocument } from "../master-admin/schema/master-admin";
import { CommonDBFunctions } from "../common/common_db_functions";
import { TenantDocument, TenantSchema } from "../tenant/schema/tenant.schema";
import { CommonFunctions } from "../common/common_functions";
import { ManagerDocument, ManagerSchema } from "../manager/schema/manager.schema";
import { TimezoneDocument, TimezoneSchema } from "../timezone/schema/timezone.schema";
import { SipProfileDocument, SipProfileSchema } from "../sip-profile/schema/sip-profile-schema";

@Injectable()
export class PassportLocalStrategy extends PassportStrategy(Strategy) {

    /*
    @Usage : To inject or load schema , so we can do operation with that schema(collection).
    @return object of that schema , then after we will use object to perform CRUD operations.
    */

    public tenantTimezone;
    public sipUUID;

    constructor(
        @InjectModel(MasterAdmin.name) private master_admin: Model<MasterAdminDocument>,
        @InjectModel(TenantSchema.name) private tenant: Model<TenantDocument>,
        @InjectModel(ManagerSchema.name) private manager: Model<ManagerDocument>,
        @InjectModel(TimezoneSchema.name) private timezone: Model<TimezoneDocument>,
	@InjectModel(SipProfileSchema.name) private sip_profile: Model<SipProfileDocument>,
	private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions
    ) {
        super({ passReqToCallback: true });
    }

    /*
    @Usage : Check username/email and password from Database , if it exist then returned user will be attached to the request, else it throw unauthorized expection.
    @Param  username : string
    @Param  password : string
    @return Details of authenticated user
    */
    async validate(req: any, username: string, password: string) {
        const { entity, tenant_domain } = req.body;
        Logger.debug(`Authentication processing... [user: ${username}, entity: ${entity}, domain: ${tenant_domain}] \n`);

        //Check for admin & tenant login
        let user, result, loginAdmin = true, tenantDecodePassword, role = "master_admin", tenantManagerDomain,timezoneDetails;
        if (username.trim() !== "niravadmin" && entity == undefined) {
        //if (username.trim() !== "admin" && password.trim() !== "H5xVo2rph4D8Xcq" && entity == undefined) {
            loginAdmin = false;
            const { company_code } = req.body;
            let tenant;
            if (company_code) {
                Logger.debug(`Searching tenant with company_code: ${company_code}`);
                tenant = await this.tenant.findOne({ company_code }).exec();
                if (!tenant) {
                    Logger.error(`Invalid Company Code: ${company_code}`);
                    return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Invalid Company Code");
                }
            } else {
                Logger.debug(`Searching tenant with username/email: ${username}`);
                tenant = await this.tenant.findOne({ $or: [{ username }, { email: username }] }).exec();
                if (!tenant) {
                    Logger.error(`Tenant not found with username/email: ${username}`);
                    return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Tenant not found with provided username/email");
                }
            }

            Logger.debug(`Tenant found with UUID: ${tenant.uuid}. Searching user...`);
            user = await this.tenant.findOne({ $and: [{ $or: [{ username }, { email: username }] }, { uuid: tenant.uuid }] }).populate([{ path: "roles", select: "-_id" }]).exec();
        } else if (entity == "manager") {
            loginAdmin = false;
            Logger.debug(`Searching manager with username/email: ${username}`);
            user = await this.manager.findOne({ $or: [{ username }, { email: username }] }).populate([{ path: "manager_role", select: "-_id -status" },{ path: "extension_details", select: "username password -_id" }]).exec();
        } else {
            Logger.debug(`Searching master admin with username: ${username}`);
            user = await this.commonDbFn.selectOne(this.master_admin, username);
        }
        let loginType = (entity != undefined && entity == "manager") ? "Manager" : "Tenant";

        if (!user && user == null) {
            if (loginAdmin) {
                Logger.error("Trying to login with [admin] username/email_address which is not exist \n");
            } else {
                Logger.error(`Trying to login with [${loginType}] username/email_address which is not exist \n`);
            }
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Invalid Credentails");
        }

        //Check domain exist or not of logged in entity
        if (!loginAdmin) { // For tenant and manager
            const { company_code } = req.body;
            if (entity == "manager") {
                Logger.debug(`Checking tenant status for manager's tenant_uuid: ${user.tenant_uuid}`);
                let tenantStatus = await this.checkTenantStatus(user.tenant_uuid);
                tenantManagerDomain = tenantStatus.domain;
		this.tenantTimezone = tenantStatus.time_zone_uuid;
		this.sipUUID = tenantStatus.sip_profile_uuid;

                if (tenantStatus.status == "1") {
                    Logger.error(`Tenant account is Inactive/Deleted for UUID: ${user.tenant_uuid}`);
                    throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Your account is Inactive/Deleted! Please contact to the administrator" });
                }
                
                if (company_code) {
                    result = true;
                } else {
                    Logger.debug(`Verifying domain for manager: ${tenantManagerDomain} vs ${tenant_domain}`);
                    result = await this.checkDomainExist(tenantManagerDomain, tenant_domain, "tenant");
                }
            } else {
                if (company_code) {
                    result = true;
                } else {
                    Logger.debug(`Verifying domain for tenant: ${user.domain} vs ${tenant_domain}`);
                    result = await this.checkDomainExist(user.domain, tenant_domain, "tenant");
                }
            }
        } else { //For admin
            result = true;//await this.checkDomainExist(process.env.TENANT_PORTAL_DOMIAN, tenant_domain, "admin");
        }
        if (!result) return { statusCode: HttpStatus.FORBIDDEN, data: "Access denied" };

        //Check tenant/manager status is active or not
        if (!loginAdmin && user.status == "1") {
            Logger.error(`${loginType} with uuid : ${user.uuid} has status inactive`);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Your account is Inactive/Deleted! Please contact to the administrator" });
        }

        if (loginAdmin) {
            result = password === user.password
        } else {
            role = (entity != undefined && entity == "manager") ? "manager" : "tenant";
            tenantDecodePassword = await this.commonFn.decode(user.password);
            result = (tenantDecodePassword !== password) ? false : true;
        }

        if (result) {
            Logger.log(`Authentication successful for ${loginType}: ${username} (uuid: ${user.uuid})`);
            user.role = role;
            if (entity == "manager") { 
		user.domain = tenantManagerDomain,
		user.time_zone_uuid = this.tenantTimezone
		user["parent_uuid"] = user.tenant_uuid

		//Get sip port
                Logger.debug(`Fetching SIP profile details for UUID: ${this.sipUUID}`);
                let sipProfileDetails = await this.sip_profile.findOne({ uuid: this.sipUUID }, { sip_port: 1, _id: 0 }).exec();
                user.sip_port = sipProfileDetails.sip_port;

                //Decode extension password
                if (user?.extension_details[0]?.password != undefined) {
                    let decodeExtensionPassword = this.commonFn.decode(user?.extension_details[0]?.password);
                    user.extension_details[0].password = decodeExtensionPassword;
                }
	    };

	    //Add timezone name in user object
            try {
                Logger.debug(`Fetching timezone details for UUID: ${user.time_zone_uuid}`);
                timezoneDetails = await this.timezone.findOne({ uuid: user.time_zone_uuid }, { timezone_name: 1, _id: 0 }).exec();
            } catch (error) {
                Logger.error(`Timezone not found for Admin`, error.message);
            }
            user["timezoneName"] = timezoneDetails?.timezone_name;
            return user;
        } else {
            if (loginAdmin) {
                Logger.error("Admin password not matched \n");
            } else {
                let error = (entity != undefined && entity == "manager") ? "Manager password not matched \n" : "Tenant password not matched \n";
                Logger.error(error);
            }
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Invalid Credentails");
        }
    }

    /*
    @Usage : To check tenant status active or not
    @return object
    */

    async checkTenantStatus(tenant_uuid) {
        let tenantDetails = await this.tenant.findOne({ uuid: tenant_uuid }, { _id: 0, status: 1, domain: 1 , time_zone_uuid: 1 , sip_profile_uuid: 1 }).exec();
        if (tenantDetails.status == "1") {
            Logger.verbose(`Manager status ==> Active , but status of there tenant ==> ${tenant_uuid} is inactive`);
        }
        return tenantDetails;
    }

    /*
    @Usage : To check domain is valid or not
    @return boolean
    */

    checkDomainExist(domain, requestDomain, entity) {
        let flag = true;
        if (entity == "admin") {
            if (requestDomain !== domain) {
                Logger.error(
                    `Given domain not matched for admin ==> Requested Domain : ${requestDomain} & Actual domain : ${domain}`
                );
                flag = false;
            }
        } else {
            if (requestDomain !== domain) {
                Logger.error(
                    `Given domain not matched for tenant ==> Requested Domain : ${requestDomain} & Actual domain : ${domain}`
                );
                flag = false;
            }
        }
        return flag;
    }
}

