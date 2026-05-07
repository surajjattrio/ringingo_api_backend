import { forwardRef, Inject, HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CreateUserDto } from "../dto/create-user.dto";
import { UserDocument, UserSchema } from "../schema/user.schema";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { LogoutUserDto } from "../dto/logout-user.dto";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { LicenseDocument, LicenseSchema } from "src/modules/master-admin/schema/license.schema";
import { ExtensionService } from "src/modules/extension/services/extension.service";
import { CreateExtensionDto } from "src/modules/extension/dto/create-extension-dto";
import { UserRabbitmqService } from "./user-rabbitmq.service";
import { RolesDocument, RolesSchema } from "src/modules/roles/schema/roles-schema";

@Injectable()

export class UserService {

    /*
    @Usage              : To load user schema and other libraries
    @Param @InjectModel : It will load user schema
    @Param commonFn     : To use common created function
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [user,commonFn,commonDbFn]
    */

    constructor(
        @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
        @InjectModel(ExtensionSchema.name) private readonly extension: Model<ExtensionDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
        @InjectModel(LicenseSchema.name) private license: Model<LicenseDocument>,
        @InjectModel(RolesSchema.name) private readonly rolesModel: Model<RolesDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
        @Inject(forwardRef(() => ExtensionService))
        private readonly extensionService: ExtensionService,
        private readonly userRabbitmqService: UserRabbitmqService

    ) { }

    private async checkTenantWhatsappPermission(tenant_uuid: any): Promise<boolean> {
        if (!tenant_uuid) return false;
        try {
            const tenantData = await this.tenant.findOne({ uuid: tenant_uuid }, { role_uuid: 1, _id: 0 }).exec();
            if (!tenantData?.role_uuid) return false;

            const role = await this.rolesModel.findOne({ uuid: tenantData.role_uuid.toString() }).exec();
            const whatsappPermission = role?.module_permission?.["messaging"]?.["whatsapp"];
            return Number(whatsappPermission) > 0;
        } catch (error) {
            Logger.error(`Error checking tenant WhatsApp permission: ${error.message}`, 'UserService');
            return false;
        }
    }

    /*
    @Usage                 : First it will check whether given domain exist or not , if not then new tenant will be created else it will throw error
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         : Success / Error
    */

    //    async create(createUserDto: CreateUserDto) {
    //         const { username, tenant_uuid, email , role } = createUserDto;
    //         let andQuery = [{ tenant_uuid }];
    //         let orQuery = [{ email }, { username }];
    //         let where = { andQuery, orQuery };
    //         createUserDto.password = this.commonFn.encode(createUserDto.password);
    //         let logMessages = {
    //             logErrorMsg: "User / Email already exist \n",
    //             logSuccessMsg: "User created successfully \n"
    //         }

    // 	if (role == "manager") {
    //             //Fetch tenant of manager
    //             let tenantInfo;
    //             tenantInfo = await this.manager.findOne({ uuid: tenant_uuid }, { tenant_uuid: 1 }).exec();
    //             createUserDto.tenant_uuid = tenantInfo.tenant_uuid;
    //         }
    //         createUserDto.manager_uuid = tenant_uuid;
    //         return this.commonDbFn.findAndInsert(this.user, where, createUserDto, JSON.stringify(logMessages), "and_with_or");
    //     }

    async create(createUserDto: CreateUserDto) {
        const { username, tenant_uuid, email, role, zoho_user_id, create_sip_device, caller_id_name, caller_id_number } = createUserDto;
        console.log("createUserDto", createUserDto)
        let andQuery = [{ tenant_uuid }];
        let orQuery;
        if (zoho_user_id != '') {
            orQuery = [{ email }, { username }, { zoho_user_id }];
        } else {
            orQuery = [{ email }, { username }];
        }

        let where = { andQuery, orQuery };
        const pass = createUserDto.password
        createUserDto.password = this.commonFn.encode(createUserDto.password);
        let logMessages = {
            logErrorMsg: "User / Email already exist \n",
            logSuccessMsg: "User created successfully \n"
        };

        // Fetch license details to get the available seats
        let licenseDetails = await this.license.find({}, { seats: 1 }).exec();
        // console.log( licenseDetails );
        // console.log( "=============licenseDetails========" );

        // Check if license details are fetched successfully
        if (licenseDetails && licenseDetails.length > 0) {
            let availableSeats: any = licenseDetails[0].seats;

            // Check if there are available seats for user creation
            if (availableSeats === 0) {
                // No available seats, return error
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `You are not allowed to create users`);
            }

            // Check the number of users in the table
            const userCount = await this.user.countDocuments(where).exec();
            // console.log( userCount );
            // console.log( "-------------userCount=======" );

            // Check if user count exceeds the available seats
            if (userCount >= availableSeats) {
                // Return error if user count exceeds available seats
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `You are not allowed to create users`);
            }

            // Proceed with user creation
            if (role == "manager") {
                //Fetch tenant of manager
                let tenantInfo;
                const lookupUuid = createUserDto.manager_uuid || tenant_uuid;
                tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
                if (tenantInfo) {
                    createUserDto.tenant_uuid = tenantInfo.tenant_uuid;
                    createUserDto.manager_uuid = lookupUuid as string;
                } else {
                    createUserDto.manager_uuid = createUserDto.manager_uuid || "";
                }
            }
            createUserDto.manager_uuid = tenant_uuid;
            const userResult = await this.commonDbFn.findAndInsert(
                this.user,
                where,
                createUserDto,
                JSON.stringify(logMessages),
                "and_with_or",
                true
            );
            // Check if create_sip_device is enabled (value is "0" for Yes)
            if (create_sip_device === "0" && userResult.statusCode === 201) {
                Logger.log("Creating SIP device for user", "UserService");
                console.log("SIP device creation initiated for user:", username);

                try {
                    // Prepare extension DTO
                    //  Create extension DTO using the class
                    const createExtensionDto = new CreateExtensionDto();
                    createExtensionDto.device_name = username;
                    createExtensionDto.username = username;
                    createExtensionDto.password = pass;
                    createExtensionDto.user_uuid = userResult.message?._doc?.uuid;
                    createExtensionDto.tenant_uuid = createUserDto.tenant_uuid;
                    createExtensionDto.status = "0";

                    //  Only add if values exist
                    if (caller_id_name) {
                        createExtensionDto.caller_id_name = caller_id_name;
                    }
                    if (caller_id_number) {
                        createExtensionDto.caller_id_number = Number(caller_id_number);
                    }

                    // Call extension service to create SIP device
                    const extensionResult = await this.extensionService.create(
                        createExtensionDto
                    );

                    if (extensionResult.statusCode === 201) {
                        Logger.log("SIP device created successfully", "UserService");
                        console.log("SIP device created successfully for user:", username);
                        console.log("extensionResult.message?._doc?.uuid", extensionResult);
                        console.log("extensionResult.data?.uuid", extensionResult.data?.uuid);


                        const extensionUUID = extensionResult.message?._doc?.uuid || extensionResult.data?.uuid;
                        if (extensionUUID) {
                            try {
                                await this.user.findOneAndUpdate(
                                    { uuid: userResult.message?._doc?.uuid },
                                    {
                                        $set: {
                                            default_extension: extensionUUID,
                                        }
                                    },
                                    { new: true }
                                ).exec();

                                Logger.log("User updated with default extension UUID", "UserService");
                                console.log(`User ${username} updated with extension UUID: ${extensionUUID}`);

                                // ✅ Update the userResult to include the extension info
                                if (userResult.message?._doc) {
                                    userResult.message._doc.default_extension = extensionUUID;
                                    userResult.message._doc.extension_type = "0";
                                }
                            } catch (updateErr) {
                                Logger.error("Error updating user with extension UUID", updateErr.message);
                                console.error("Failed to update user with extension UUID:", updateErr);
                            }
                        } else {
                            Logger.warn("Extension UUID not found in creation result", "UserService");
                        }
                    } else {
                        Logger.error("Failed to create SIP device", "UserService");
                        console.error("SIP device creation failed:", extensionResult);
                    }
                } catch (err) {
                    Logger.error("Error creating SIP device", err.message);
                    console.error("Error creating SIP device:", err);
                }
            }

            // Emit RabbitMQ event
            if (userResult.statusCode === 201) {
                const userUuid = userResult.message?._doc?.uuid || userResult.data?.uuid;
                if (await this.checkTenantWhatsappPermission(createUserDto.tenant_uuid)) {
                    this.userRabbitmqService.publish('user.created', { ...createUserDto, uuid: userUuid });
                } else {
                    Logger.debug(`Skipping RabbitMQ publish for user.created: WhatsApp permission not enabled for tenant ${createUserDto.tenant_uuid}`);
                }
            }

            return userResult;
        } else {
            // Error fetching license details
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Error fetching license details`);
        }
    }


    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of users with data
    */

    async findAll(queryParams) {
        let searchFields = ["username", "recording", "email"];
        let populateFields = [{ path: "user_roles", select: "name" }, { path: "tenant", select: 'tenant_name username' }, { path: "user_group", select: 'name' }, { path: "default_extension_detail", select: "username -_id -uuid" }];

        if (queryParams.webhook === 'true') {
            let result = await this.user.find({ tenant_uuid: queryParams.tenant_uuid }, { fullname: 1, uuid: 1, createdAt: 1, _id: 0 }).exec();
            const users = Array.isArray(result) ? result : (result as any)?.data || [];
            return { statusCode: HttpStatus.OK, data: users.map(user => ({ agentName: user.fullname, agentId: user.uuid })), message: "Users fetched successfully" };
        } else {
            return this.commonDbFn.findAllWithPagination(this.user, queryParams, searchFields, populateFields, { status: 1, _id: -1 });
        }
    }

    /*
    @Usage             : To get campaigns based on username
    @Param queryParams : It will contain user's username
    @return Object     : Array of an object with total count of allowed campaigns
    */

    async findAllowedCampaigns(queryParams) {
        const { domain, username, company_code } = queryParams;
        let matchQuery: any;
        if (company_code) {
            const tenant = await this.tenant.findOne({ company_code }, { uuid: 1 }).exec();
            matchQuery = { uuid: tenant ? tenant.uuid : "INVALID_UUID" };
        }
        //  else if (domain === commonDomain) {
        //     // If domain is common try to find user's tenant first
        //     const user = await this.user.findOne({ username }, { tenant_uuid: 1 }).exec();
        //     matchQuery = { uuid: user ? user.tenant_uuid : "INVALID_UUID" };
        // }
         else {
            matchQuery = { domain: domain };
        }

        const result = await this.tenant.aggregate([
            { $match: matchQuery },
            {
                $lookup: {
                    from: "user",
                    let: { tenantUuid: "$uuid" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$tenant_uuid", "$$tenantUuid"] },
                                        { $eq: ["$username", username] }
                                    ]
                                }
                            }
                        },
                        { $project: { allowed_campaign: 1, _id: 0 } }
                    ],
                    as: "user"
                }
            },
            { $unwind: "$user" },
            { $project: { allowed_campaign: "$user.allowed_campaign", _id: 0 } }
        ]);

        return result[0]?.allowed_campaign || [];
    }

    /*
    @Usage          : To get single user record based on uuid
    @Param uuid     : Search user by uuid
    @return Object  : Result of user
    */

    async findOne(uuid: string) {
        let user: any = await this.user.findOne({ uuid }).exec();
        if (user == null) {
            Logger.error(`User not found by uuid : ${uuid} \n`, getMethod);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "User not found" });
        }
        Logger.debug(`User success fetched by uuid : ${uuid} \n`);

        // Convert to plain object to add dynamic fields like tenant_role and whatspermissio
        user = user.toObject();

        user.password = await this.commonFn.decode(user.password);

        // Populate Tenant Role and check WhatsApp permission
        if (user.tenant_uuid) {
            const tenant = await this.tenant.findOne({ uuid: user.tenant_uuid }, { role_uuid: 1, _id: 0 }).exec();
            if (tenant?.role_uuid) {
                const role = await this.rolesModel.findOne({ uuid: tenant.role_uuid }).exec();
                if (role) {
                    user.tenant_role = role;
                }
            }
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
    }

    /*
    @Usage                     : Check user which comes in request for update already exist or not with given tenant_uuid, if not it will update else it will throw error
    @Param uuid                : Update user by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update(uuid: string, createUserDto: CreateUserDto) {

        const { username, tenant_uuid, email, default_extension, role, campaign_uuid } = createUserDto;
        console.log("createUserDto", createUserDto)
        const getUserData = await this.user.findOne({ uuid }).exec();

        if (getUserData?.username != username) {
            const checkUserExist = await this.user.find({ $and: [{ username, tenant_uuid }] }).count().exec();
            if (checkUserExist > 0) {
                Logger.error("User already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `User already exist`);
            }
        }
        if (getUserData?.email != email) {
            const checkEmailExist = await this.user.findOne({ email }).count().exec();
            if (checkEmailExist > 0) {
                Logger.error("Email already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Email already exist`);
            }
        }

        if (role == "manager") {
            //Fetch tenant of manager
            let tenantInfo;
            const lookupUuid = createUserDto.manager_uuid || tenant_uuid;
            tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
            if (tenantInfo) {
                createUserDto.tenant_uuid = tenantInfo.tenant_uuid;
                createUserDto.manager_uuid = lookupUuid as string;
            } else {
                createUserDto.manager_uuid = createUserDto.manager_uuid || "";
            }
        }

        createUserDto.password = this.commonFn.encode(createUserDto.password);
        let logMessages = {
            logErrorMsg: `User not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User updated successfully by uuid : ${uuid} \n`
        }
        let response = await this.commonDbFn.update(this.user, uuid, createUserDto, JSON.stringify(logMessages));

        if (response.statusCode == 200) {
            if (await this.checkTenantWhatsappPermission(getUserData?.tenant_uuid)) {
                this.userRabbitmqService.publish('user.updated', { ...createUserDto, uuid });
            } else {
                Logger.debug(`Skipping RabbitMQ publish for user.updated: WhatsApp permission not enabled for tenant ${getUserData?.tenant_uuid}`);
            }
        }

        if (response.statusCode == 404) { return response; }

        //Update is_assigned to 0[Because extension is now bind with this user, no need to show that extension to other users under same tenant]

        //Check extension has been changed or not
        if (getUserData?.default_extension != default_extension) {

            try {
                let logMessages = {
                    logErrorMsg: `User not found by uuid : ${uuid} \n`,
                    logSuccessMsg: `Extension flag is_assigned updated successfully by uuid : ${uuid} \n`
                }
                await this.extension.updateOne({ uuid: getUserData?.default_extension }, { is_assigned: "1" }); // Make old extension available to other users
                let result = await this.extension.updateOne({ uuid: default_extension }, { is_assigned: "0" });
                if (result.matchedCount == 0 && result.modifiedCount == 0) {
                    Logger.error(logMessages.logErrorMsg, putMethod);
                }
                Logger.debug(logMessages.logSuccessMsg);
            } catch (err) {
                Logger.error(`Unable to update extension`, err.message);
            }
        }

        return response;
    }

    /*
    @Usage         : To update status of user[Active/Inactive]
    @Param uuid    : uuid of user
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch(uuid: string, body, request = "") {
        let logMessages = {
            logErrorMsg: `User not found by uuid : ${uuid} \n`,
            logSuccessMsg: `User status updated successfully by uuid : ${uuid} \n`
        }
        if (request == "logout") {
            body.callkit_token = "";
        }
        
        const response = await this.commonDbFn.update(this.user, uuid, body, JSON.stringify(logMessages));

        if (response.statusCode == 200) {
            const getUserData = await this.user.findOne({ uuid }, { tenant_uuid: 1, vendor_uid: 1, _id: 0 }).exec();
            if (await this.checkTenantWhatsappPermission(getUserData?.tenant_uuid)) {
                this.userRabbitmqService.publish('user.updated', { ...body, uuid, vendor_uid: (getUserData as any)?.vendor_uid });
            } else {
                Logger.debug(`Skipping RabbitMQ publish for user.updated (patch): WhatsApp permission not enabled for tenant ${getUserData?.tenant_uuid}`);
            }
        }

        return response;
    }

    /*
    @Usage         : Delete single or multiple user using uuid
    @Param uuid    : To delete single user pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove(uuid: string) {
        // Fetch only required field (username)
        const user = await this.user.findOne({ uuid }, { username: 1 }).lean();

        if (!user?.username) return;

        // Directly delete extension using username
        const result = await this.extension.deleteOne({ username: user.username });

        if (result.deletedCount) {
            Logger.log("Delete Extension Sip device successfully");
        }

        let logMessages = {
            logErrorMsg: `User not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `User deleted successfully by uuid : ${uuid} \n`
        }

        const getUserData = await this.user.findOne({ uuid }, { team_user_uid:1, tenant_uuid: 1, vendor_uid: 1, _id: 0 }).exec();
        const response = await this.commonDbFn.delete(this.user, { uuid }, JSON.stringify(logMessages));

        if (response?.statusCode == 200) {
            if (await this.checkTenantWhatsappPermission(getUserData?.tenant_uuid)) {
                this.userRabbitmqService.publish('user.deleted', { 
                    uuid, 
                    vendor_uid: (getUserData as any)?.vendor_uid,
                    tenant_uuid: getUserData?.tenant_uuid ,
                    team_user_uid: getUserData?.team_user_uid
                });
            } else {
                Logger.debug(`Skipping RabbitMQ publish for user.deleted: WhatsApp permission not enabled for tenant ${getUserData?.tenant_uuid}`);
            }
        }

        return response;
    }

    /*
    @Usage              : To search users using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of users with data
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "user_roles", select: "name" }, { path: "tenant", select: 'tenant_name username' }, { path: "user_group", select: 'name' }, { path: "default_extension_detail", select: "username -_id -uuid" }];
        return this.commonDbFn.advancedSearch(this.user, searchParams, populateFields);
    }

    /*
    @Usage  : List all users having extension type = 1
    @Method : GET
    @return : Array of an object with total count of users with data
    */

    async getExternalOnly(queryParam) {
        console.log(queryParam);
        const { tenant_uuid } = queryParam;
        let result = await this.user.find({ tenant_uuid, extension_type: 1 }, { username: 1, uuid: 1, _id: 0 }).exec();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    }

    /*********************** For Mobile **********************/

    async logoutUser(logoutUserDto: LogoutUserDto) {
        try {
            const { username, domain } = logoutUserDto;
            let tenant_uuid = await this.tenant.findOne({ domain }, { uuid: 1, _id: 0 }).exec();
            if (tenant_uuid == null) {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Please enter valid domain`);
            }
            let response = await this.user.updateOne({ username, tenant_uuid: tenant_uuid.uuid }, { is_logged_in_mobile: "1", callkit_token: "" }).exec();
            if (response.matchedCount == 0 && response.modifiedCount == 0) {
                Logger.error(`Check your domain and username \n`, putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Please enter valid credentials`);
            }
            Logger.debug(`You are logged out from the Account \n`, putMethod);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `You are logged out from the Account`);

        } catch (error) {
            Logger.error(`Unable to logout user`, error.message);
        }
    }

    /*********************** For zoho **********************/

    /*async loginzohoUser ( zoho_user_id: string ) {
        console.log( zoho_user_id );
        console.log( "coming" );
        const users = await this.user.findOne( { zoho_user_id }, { username: 1, email: 1, password: 1, zoho_user_id: 1, tenant_uuid: 1 } ).exec();
        console.log( users );
        const extension = await this.extension.findOne( { tenant_uuid: users.tenant_uuid }, { device_name: 1, username: 1, password: 1, tenant_uuid: 1 } ).exec();
        console.log( extension );
        const tenant: any = await this.tenant.findOne( { uuid: users.tenant_uuid }, { tenant_name: 1, username: 1, domain: 1, uuid: 1 } ).populate( [ { path: "roles", select: "-_id" }, { path: "timezone", select: 'timezone_name' } ] ).exec();
        console.log( tenant );
        let decryptPassword = this.commonFn.decode( extension.password );
        return {
            username: extension.device_name,
            password: decryptPassword,
            domain: tenant.domain,
        };
    }*/

    async loginzohoUser(zoho_user_id: string) {
        console.log(zoho_user_id);
        console.log("coming");
        const users = await this.user.findOne({ zoho_user_id }, { username: 1, email: 1, password: 1, zoho_user_id: 1, tenant_uuid: 1 }).exec();
        console.log(users);
        const extension = await this.extension.findOne({ tenant_uuid: users.tenant_uuid }, { device_name: 1, username: 1, password: 1, tenant_uuid: 1 }).exec();
        console.log(extension);
        const tenant: any = await this.tenant.findOne({ uuid: users.tenant_uuid }, { tenant_name: 1, username: 1, domain: 1, uuid: 1 }).populate([{ path: "roles", select: "-_id" }, { path: "timezone", select: 'timezone_name' }]).exec();
        console.log(tenant);
        const allextension = await this.extension.find({ tenant_uuid: users.tenant_uuid, status: '0' }, { device_name: 1, username: 1, password: 1, tenant_uuid: 1, status: 1 }).exec();
        //console.log( allextension );

        // const filteredExtensions = allextension.filter((ext) => ext._id.toString() !== extension._id.toString());

        const fieldsToInclude = ['device_name', 'username', 'tenant_uuid'];

        // Filter out extension data from allextension array
        const filteredExtensions = allextension
            .filter((ext) => ext._id.toString() !== extension._id.toString())
            .map((ext) => {
                // Extract only the specified fields from each element
                const filteredExt = {};
                fieldsToInclude.forEach((field) => {
                    filteredExt[field] = ext[field];
                });
                return filteredExt;
            });

        //console.log( filteredExtensions );


        let decryptPassword = this.commonFn.decode(extension.password);
        return {
            username: extension.device_name,
            password: decryptPassword,
            domain: tenant.domain,
            allextension: filteredExtensions,
        };
    }

    async syncWaba(uuid: string) {
        const user = await this.user.findOne({ uuid }).exec();
        if (!user) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "User not found");
        }

        if (await this.checkTenantWhatsappPermission(user.tenant_uuid)) {
            try {
                await this.userRabbitmqService.syncManual('user.created', user);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "User synced successfully with external application");
            } catch (error) {
                const errorMessage = error.response?.data?.message || error.message || "Unknown error occurred during sync";
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, `Sync failed: ${errorMessage}`);
            }
        } else {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.FORBIDDEN, "WhatsApp permission not enabled for this tenant");
        }
    }

}
