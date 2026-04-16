import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CreateExtensionDto } from "../dto/create-extension-dto";
import { ExtensionDocument, ExtensionSchema } from "../schema/extension.schema";
import * as fs from "fs";
import * as xml2js from "xml2js";
import * as esl from "modesl";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { SipProfileDocument, SipProfileSchema } from "src/modules/sip-profile/schema/sip-profile-schema";
//import connection from "../../../db";

@Injectable()

export class ExtensionService {

    /*
    @Usage              : To load extension schema and other libraries
    @Param @InjectModel : It will load extension schema
    @Param commonFn     : To use common created function
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [extension,commonFn,commonDbFn]
    */

    constructor(
        @InjectModel( "extension" ) private readonly extensions: Model<ExtensionDocument>,
        @InjectModel( TenantSchema.name ) private readonly tenant: Model<TenantDocument>,
        @InjectModel( SipProfileSchema.name ) private readonly sip_profile: Model<SipProfileDocument>,
        private readonly commonFn: CommonFunctions,
        private readonly commonDbFn: CommonDBFunctions,
    ) { }

    /*
    @Usage                 : First it will check whether given username, tenant_uuid or not , if not then new extension will be created else it will throw error
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         : Success / Error
    */

    async create ( createExtensionDto: CreateExtensionDto ) {

        const { username, tenant_uuid, role, parent_uuid } = createExtensionDto;
        let where = [ { username, tenant_uuid } ];
        let decodePassword = createExtensionDto.password;
        createExtensionDto.password = this.commonFn.encode( createExtensionDto.password );
        let logMessages = {
            logErrorMsg: "SIP device already exist \n",
            logSuccessMsg: "SIP device created successfully \n"
        }
        const result = await this.commonDbFn.findAndInsert( this.extensions, where, createExtensionDto, JSON.stringify( logMessages ), "and", true );
        if ( result.statusCode == 201 ) {
            if ( process.env.OPENSIPS === 'YES' ) {
                try {
                    const last_uuid = result.message.uuid;
                    const  callerIdName =result.message.caller_id_name;
                    const  callerIdNumber =result.message.caller_id_number;
                    const  user_uuid =result.message.user_uuid;
		 let tenantData: any = await this.tenant.findOne( { uuid: tenant_uuid }, { domain: 1, _id: 0 } ).exec();
        let domain = tenantData?.domain;
              //  const [result] = await (await connection).query('INSERT INTO subscriber (username, domain, password, email_address, ha1, ha1_sha256, ha1_sha512t256, rpid) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
               // [username,'Domain', decodePassword, 'anajli', 'abc', 'abc', 'abc', null]);
	// const [insertResult] = await (await connection).query(
    // 'INSERT INTO subscriber (username, domain, password, email_address, ha1, ha1_sha256, ha1_sha512t256, rpid, tenant_uuid, user_uuid, extension_uuid, effective_caller_id_name, effective_caller_id_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    // [username, domain, decodePassword, 'anajli', 'abc', 'abc', 'abc', null, tenant_uuid, user_uuid,last_uuid, callerIdName, callerIdNumber]
    // );
                } catch ( err ) {
                    console.error( 'Error inserting data:', err );
                    //return null;
                }
            }

            createExtensionDto.tenant_uuid = role == "manager" ? parent_uuid : tenant_uuid;
            let voicemail = {
                voicemail_status: 0,
                password: "",
                mail_to: "",
                attach_file: ""
            };
            this.generateTenantXml( createExtensionDto, decodePassword, result.message.uuid, voicemail );
        }
        // delete result.message;
        return result;
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of extension with data
    */
    async findAll(queryParams, loggedInUserDetails) {
        let searchParams: any[] = [];
        let showAssignedListToManager;
        let query: any = {};
        let checkRole: any = {};
        let searchFields = ["username", "device_name"];
        let populateFields = [
            { path: "user", select: "username email" },
            { path: "tenant", select: "tenant_name username domain" },
        ];
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);
        let pagination = true, queryResponse, totalCount = 0;
    
        // Check search parameters
        if (queryParams.search) {
            searchFields.forEach((field) => {
                searchParams.push({ [field]: { $regex: queryParams.search, $options: "i" } });
            });
            query = { $or: searchParams };
        }
    
        // Determine pagination based on query parameters
        if (!queryParams.limit && !queryParams.page || queryParams.list === "all") {
            pagination = false;
        }
    
        // Check Role
        let { role, uuid, tenant_uuid, assigned_manager_role } = loggedInUserDetails;
        console.log("extension findAll role", role);
    
        // Handle different roles
        if (role === "tenant") {
            checkRole = { tenant_uuid: uuid };
        }
    
        if (role === "agent") {
            checkRole = { tenant_uuid, uuid: { $ne: queryParams.extension_uuid } };
        }
    
        if (role === "manager") {
            showAssignedListToManager = await this.commonDbFn.getManagerRoleInfo(assigned_manager_role, queryParams.module);
        }
    
        // Determine query response based on pagination and role
        if (pagination) {
            if (role === "manager") {
                queryResponse = await this.extensions
                    .find({ $and: [query, { $or: [{ tenant_uuid: uuid }, { uuid: { $in: showAssignedListToManager } }] }] })
                    .limit(perPage)
                    .skip(skip)
                    .populate(populateFields)
                    .sort({ _id: -1 })
                    .exec();
            } else {
                queryResponse = await this.extensions
                    .find({ $and: [query, checkRole] })
                    .limit(perPage)
                    .skip(skip)
                    .populate(populateFields)
                    .sort({ _id: -1 })
                    .exec();
            }
        } else {
            if (queryParams.extension_uuid) {
                if (role === "agent") {
                    queryResponse = await this.extensions
                        .find({ $and: [{ $or: [checkRole] }, { $or: [query] }] })
                        .populate(populateFields)
                        .sort({ _id: -1 })
                        .exec();
                } else {
                    query["is_assigned"] = "1";
                    queryResponse = await this.extensions
                        .find({ $and: [{ $or: [checkRole] }, { $or: [{ uuid: queryParams.extension_uuid }, query] }] })
                        .populate(populateFields)
                        .sort({ _id: -1 })
                        .exec();
                }
            } else {
                if (role === "manager") {
                    queryResponse = await this.extensions
                        .find({ $or: [{ tenant_uuid: uuid }, { uuid: { $in: showAssignedListToManager } }] })
                        .populate(populateFields)
                        .sort({ _id: -1 })
                        .exec();
                } else {
                    queryResponse = await this.extensions
                        .find({ $and: [query, checkRole] })
                        .populate(populateFields)
                        .sort({ _id: -1 })
                        .exec();
                }
            }
        }
    
        // Get total count for pagination
        if (pagination) {
            if (role === "manager") {
                totalCount = await this.extensions
                    .find({ $and: [query, { $or: [{ tenant_uuid: uuid }, { uuid: { $in: showAssignedListToManager } }] }] })
                    .count()
                    .exec();
            } else {
                totalCount = await this.extensions
                    .find({ $and: [query, checkRole] })
                    .count()
                    .exec();
            }
        }
    
        // Get all sip profiles
        let sipProfiles = await this.sip_profile
            .find({}, { name: 1, _id: 0 })
            .sort({ _id: -1 })
            .exec();
    
        // Parse XML response
        console.log("queryResponse",queryResponse);
        console.log("sipProfiles",sipProfiles);

        let result: any = await this.parseXML(queryResponse, sipProfiles);
    
        // Process the response data
        let finalArray: any[] = [];
        for (let data of queryResponse) {
            let tenantDomain = data?.tenant?.[0]?.domain || "";
            let checkIfExist = result.filter(
                (e) => e.username === data.username && e.domain === tenantDomain
            );
    
            if (checkIfExist.length === 1) {
                data.extension_status = "0";
            }
            finalArray.push(data);
        }
    
        // Send response
        return this.commonDbFn.sendResponseWithCount(
            queryResponse.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND,
            finalArray,
            totalCount
        );
    }
    
    // async findAll ( queryParams, loggedInUserDetails ) {
    //     let searchParams = [], showAssignedListToManager;
    //     let query: any = {};
    //     let checkRole: any = {};
    //     let searchFields = [ "username", "device_name" ];
    //     let populateFields = [ { path: "user", select: "username email" }, { path: "tenant", select: 'tenant_name username domain' } ];
    //     const perPage = Number( queryParams.limit ) || 10;
    //     const currentPage = Number( queryParams.page ) || 1;
    //     const skip = perPage * ( currentPage - 1 );
    //     let pagination = true, queryResponse, totalCount = 0;
    //     //Check search parameters
    //     if ( queryParams.search != "" && queryParams.search != undefined ) {
    //         searchFields.map( ( data ) => {
    //             searchParams.push( { [ data ]: { '$regex': queryParams.search, '$options': 'i' } } )
    //         } )
    //         query = { '$or': searchParams };
    //     }

    //     //Send all data
    //     if ( queryParams.limit == undefined && queryParams.page == undefined ) {
    //         pagination = false;
    //     } else if ( queryParams.list == "all" ) {
    //         pagination = false;
    //     }

    //     //Check Role
    //     let { role, uuid, tenant_uuid, assigned_manager_role } = loggedInUserDetails;
    //     console.log("extension findAll role",role);
    //     if ( role == "tenant" ) {
    //         checkRole = { tenant_uuid: uuid };

    //     }

    //     if ( role == "agent" ) {
    //         checkRole = { tenant_uuid, uuid: { $ne: queryParams.extension_uuid } }

    //     }
    //     if ( role == "manager" ) {
    //         showAssignedListToManager = await this.commonDbFn.getManagerRoleInfo( assigned_manager_role, queryParams.module );
    //     }

    //     if ( pagination ) {
    //         if ( role == "manager" ) {
    //             //queryResponse = await this.extensions.find({ $or: [{ tenant_uuid : uuid }, { uuid: { $in: showAssignedListToManager } }] }).limit(perPage).skip(skip).populate(populateFields).sort({ _id: -1 }).exec();
    //             queryResponse = await this.extensions.find( { $and: [ query, { $or: [ { tenant_uuid: uuid }, { uuid: { $in: showAssignedListToManager } } ] } ] } ).limit( perPage ).skip( skip ).populate( populateFields ).sort( { _id: -1 } ).exec();
    //         } else {
    //             queryResponse = await this.extensions.find( { $and: [ query, checkRole ] } ).limit( perPage ).skip( skip ).populate( populateFields ).sort( { _id: -1 } ).exec();
    //         }
    //     } else {
    //         //queryResponse = await this.extensions.find({ $and: [query, checkRole] }).populate(populateFields).sort({ _id: -1 }).exec();
    //         if ( queryParams.extension_uuid != undefined && queryParams.extension_uuid != "" ) {

    //             if ( role == "agent" ) {
    //                 queryResponse = await this.extensions.find( { $and: [ { $or: [ checkRole ] }, { $or: [ query ] } ] } ).populate( populateFields ).sort( { _id: -1 } ).exec();
    //             } else {

    //                 query[ "is_assigned" ] = "1";
    //                 queryResponse = await this.extensions.find( { $and: [ { $or: [ checkRole ] }, { $or: [ { uuid: queryParams.extension_uuid }, query ] } ] } ).populate( populateFields ).sort( { _id: -1 } ).exec();
    //             }
    //         } else {
    //             if ( role == "manager" ) {
    //                 queryResponse = await this.extensions.find( { $or: [ { tenant_uuid: uuid }, { uuid: { $in: showAssignedListToManager } } ] } ).populate( populateFields ).sort( { _id: -1 } ).exec();
    //             } else {
    //                 queryResponse = await this.extensions.find( { $and: [ query, checkRole ] } ).populate( populateFields ).sort( { _id: -1 } ).exec();
    //             }
    //         }
    //     }

    //     if ( pagination ) {
    //         if ( role == "manager" ) {
    //             // totalCount = await this.extensions.find({ $or: [{ tenant_uuid : uuid }, { uuid: { $in: showAssignedListToManager } }] }).count().exec();
    //             totalCount = await this.extensions.find( { $and: [ query, { $or: [ { tenant_uuid: uuid }, { uuid: { $in: showAssignedListToManager } } ] } ] } ).count().exec();
    //         } else {
    //             totalCount = await this.extensions.find( { $and: [ query, checkRole ] } ).count().exec();
    //         }
    //     }
    //     //Get all sip profiles
    //     let sipProfiles = await this.sip_profile.find( {}, { name: 1, _id: 0 } ).sort( { _id: -1 } ).exec();
    //     let result: any = await this.parseXML( queryResponse, sipProfiles );
    //     let finalArray = [];
    //     let newValues: any = result;
    //     //queryResponse.map((data) => {
    //     for ( let data of queryResponse ) {
    //         let tenantDomain: any = "";
    //         tenantDomain = data?.tenant[ 0 ] !== undefined ? data?.tenant[ 0 ][ "domain" ] : "";
    //         let checkIfExist = result.filter( e => e.username === data.username && e.domain === tenantDomain );

    //         if ( checkIfExist.length == 1 ) {
    //             data.extension_status = "0";
    //             finalArray.push( data );
    //         } else {
    //             finalArray.push( data );
    //         }
    //     };
    //     return this.commonDbFn.sendResponseWithCount( queryResponse.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND, finalArray, totalCount );
    // }

    /*async findAll(queryParams) {
        let searchFields = ["username", "device_name"];
        let populateFields = [{ path: "user", select: "username email" }, { path: "tenant", select: 'tenant_name username domain' }];
        let response = await this.commonDbFn.findAllWithPagination(this.extensions, queryParams, searchFields, populateFields,"",true,true);

        if(response.statusCode == 404){ return response; }

        let queryResponse = response.data;

              //Get all sip profiles
        let sipProfiles = await this.sip_profile.find({}, { name: 1, _id: 0 }).sort({ _id: -1 }).exec();
        let result: any = await this.parseXML(queryResponse, sipProfiles);
        let finalArray = [];
        queryResponse.map((data) => {
            let tenantDomain: any = "";
            tenantDomain = data?.tenant[0] !== undefined ? data?.tenant[0]["domain"] : "";
            let checkIfExist = result.filter(e => e.username === data.username && e.domain === tenantDomain);

            if (checkIfExist.length == 1) {
                data.extension_status = "0";
                finalArray.push(data);
            } else {
                finalArray.push(data);
            }
        });
        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, finalArray, response.count);
    }*/

    /*
    @Usage              : To parse
    @Param username     : check username
    @Param domain       : check domain
    @Param sipDetails   : Array of registered extension
    @return Boolean
    */

    async parseXML ( queryResponse, sipProfiles ) {
        let resLen, res2Len, sipUser, domain, obj = {}, sipDetails = [], i, j, k, finalArray = [], xml, conn, self = this;
        const parser = new xml2js.Parser( { attrkey: "ATTR" } );
        let lenSipProfile = sipProfiles?.length;
        return new Promise( async function ( resolve, reject ) {
            conn = await self.commonFn.fetchFsConnection();
            // console.log("::yaksh:: connnnnnn",conn);
            // resolve( "" );
            // conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
            for ( j = 0; j < lenSipProfile; j++ ) {
                conn.api( `sofia xmlstatus profile ${sipProfiles[ j ].name} reg`, function ( res ) {
                    //res is an esl.Event instance
                    xml = res?.getBody().trim();
                    if ( xml !== "Invalid Profile!" ) {

                        parser.parseString( xml, function ( error, result ) {
                            if ( error === null ) {
                                let response = JSON.parse( JSON.stringify( result ) );
                                response = response.profile?.registrations;
                                resLen = response?.length;
                                for ( i = 0; i < resLen; i++ ) {
                                    let val = response[ i ]?.registration;
                                    res2Len = val?.length;
                                    for ( k = 0; k < res2Len; k++ ) {
                                        sipUser = val[ k ][ "sip-auth-user" ][ 0 ];
                                        domain = val[ k ][ "sip-auth-realm" ][ 0 ];
                                        obj = { username: sipUser, domain: domain }
                                        sipDetails.push( obj );
                                    }
                                }
                                resolve( sipDetails );
                            } else {
                                reject( error )
                                console.log( "else", error );
                            }
                        } );
                    }

                } );
            }
            // });
        } );
    }

    /*
    @Usage              : To check username and domain exist in parsedXML
    @Param username     : check username
    @Param domain       : check domain
    @Param sipDetails   : Array of registered extension
    @return Boolean
    */

    extensionExists ( username, domain, sipDetails ) {
        return sipDetails.some( function ( el ) {
            return el.username === username && el.domain === domain;
        } );
    }

    /*
    @Usage          : To get single extension record based on uuid
    @Param uuid     : Search extension by uuid
    @return Object  : Result of extension
    */

    async findOne ( uuid: string ) {
        const extensionExist = await this.extensions.findOne( { uuid } ).exec();
        if ( extensionExist == null ) {
            Logger.error( `SIP device not found by uuid : ${uuid} \n`, getMethod ); throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "SIP device not found" } )
        }
        Logger.debug( `SIP device success fetched by uuid : ${uuid} \n` );
        extensionExist.password = await this.commonFn.decode( extensionExist.password );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, extensionExist );

    }

    /*
    @Usage                     : Check username , tenant_uuid which comes in request for update already exist or not with given tenant_uuid, if not it will update else it will throw error
    @Param uuid                : Update extension by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update ( uuid: string, createExtensionDto: CreateExtensionDto ) {
        const { username, tenant_uuid, role, parent_uuid } = createExtensionDto;
        const getExtensionData = await this.extensions.findOne( { uuid } ).exec();
        let decodePassword = createExtensionDto.password;

        if ( getExtensionData.username != username ) {
            const checkUsernameExist = await this.extensions.find( { tenant_uuid, username } ).count().exec();
            if ( checkUsernameExist > 0 ) {
                Logger.error( "SIP device already exist \n", putMethod );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `SIP device already exist` );
            }
        }
        createExtensionDto.password = this.commonFn.encode( createExtensionDto.password );
        //createExtensionDto.tenant_uuid = role == "manager" ? parent_uuid : tenant_uuid;
        const extensionUpdate = await this.extensions.updateOne( { uuid }, createExtensionDto ).exec();
        const extensionExist = await this.extensions.findOne( { uuid } ).exec();

        if ( extensionUpdate.matchedCount == 0 && extensionUpdate.modifiedCount == 0 ) {
            Logger.error( `SIP device uuid was incorrect ${uuid} \n`, putMethod );
            throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "SIP device id was incorrect" } )
        }
        Logger.debug( `SIP device updated successfully by uuid ${uuid} \n` );
        createExtensionDto.tenant_uuid = role == "manager" ? parent_uuid : tenant_uuid;
        //Get voicemail
        const { voicemail } = await this.extensions.findOne( { uuid }, { voicemail: 1, _id: 0 } ).exec();
        if ( process.env.OPENSIPS === 'YES' ) {
            try {
        let callerIdName = createExtensionDto.caller_id_name;
        let callerIdNumber = createExtensionDto.caller_id_number;
        let user_uuid = createExtensionDto.user_uuid;
	let tenantData: any = await this.tenant.findOne( { uuid: tenant_uuid }, { domain: 1, _id: 0 } ).exec();
        let domain = tenantData?.domain;
//         const [result] = await (await connection).query(`
//     UPDATE subscriber
//     SET username = ?, domain = ?, password = ?, email_address = ?, ha1 = ?, ha1_sha256 = ?, ha1_sha512t256 = ?, rpid = ?, tenant_uuid = ?, user_uuid = ?,extension_uuid =?, effective_caller_id_name = ?, effective_caller_id_number = ?
//     WHERE extension_uuid = ?`,
//     [username, domain, decodePassword, 'anajli', 'abc', 'abc', 'abc', null, tenant_uuid, user_uuid, uuid,callerIdName, callerIdNumber, uuid]
// );
                //return result as OkPacket;
            } catch ( err ) {
                console.error( 'Error updating data:', err );
                //return null;
            }
        }

        this.generateTenantXml( createExtensionDto, decodePassword, uuid, voicemail );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "SIP device updated successfully" );
    }

    /*
    @Usage         : Delete single or multiple extension using uuid
    @Param uuid    : To delete single extension pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    /*async remove ( uuid: string, loggedInUserDetails ) {
        const { domain } = loggedInUserDetails;
        let logMessages = {
            logErrorMsg: `SIP device not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `SIP device deleted successfully by uuid : ${uuid} \n`
        }
        if ( uuid.includes( "," ) ) {
            let uuids: any = uuid.split( "," );
            uuids.map( async ( data ) => {
                let uuid = data.uuid;
                this.removeExtensionFile( uuid, domain );
            } )
        } else {
            this.removeExtensionFile( uuid, domain );
        }
        return this.commonDbFn.delete( this.extensions, { uuid }, JSON.stringify( logMessages ) );
    }*/

    async remove(uuid: string, loggedInUserDetails) {
        const { domain } = loggedInUserDetails;
        let logMessages = {
            logErrorMsg: `SIP device(s) not exist for the provided UUID(s)\n`,
            logSuccessMsg: `SIP device(s) deleted successfully for the provided UUID(s)\n`
        };
    
        // Check if multiple UUIDs are provided
        if (uuid.includes(",")) {
            let uuids: string[] = uuid.split(",");
    
            // Remove extension files for each UUID
            uuids.forEach(async (uuid) => {
                await this.removeExtensionFile(uuid, domain);
            });
    
            // Check if OPENSIPS environment variable is set to 'YES' for MySQL deletion
            // if (process.env.OPENSIPS === 'YES') {
            //     try {
            //   //  let extension_uuid = uuids;
            //         // Perform deletion from MySQL using a single query with the IN clause
            //         const [result] = await (await connection).query(`
            //             DELETE FROM subscriber
            //             WHERE extension_uuid IN (?)`, [uuids]
            //         );
            //         console.log('MySQL deletion result:', result);
            //         //return result;
            //     } catch (err) {
            //         console.error('Error deleting data:', err);
            //     }
            // }
        } else {
            // Remove extension files for single UUID
            await this.removeExtensionFile(uuid, domain);
    
            // Check if OPENSIPS environment variable is set to 'YES' for MySQL deletion
            // if (process.env.OPENSIPS === 'YES') {
            //     try {
            //   //  let extension_uuid = uuid;
            //         // Perform deletion from MySQL for the single UUID
            //         const [result] = await (await connection).query(`
            //             DELETE FROM subscriber
            //             WHERE extension_uuid = ?`, [uuid]
            //         );
            //         console.log('MySQL deletion result:', result);
            //       //  return result;
            //     } catch (err) {
            //         console.error('Error deleting data:', err);
            //     }
            // }
        }
    
        // If OPENSIPS environment variable is not set to 'YES', delete from MongoDB
        return this.commonDbFn.delete(this.extensions, { uuid }, JSON.stringify(logMessages));
    }
    

    /*
    @Usage         : To remove extension file
    @Param uuid    : uuid of extension
    @Param domain  : Tenant domain
    @return Object : Success / Error
    */

    async removeExtensionFile ( uuid, domain ) {
        const getExtensionDetail = await this.extensions.findOne( { uuid }, { _id: 0, username: 1, tenant_uuid: 1 } ).exec();
        const username = getExtensionDetail?.username;
        const path = `${process.env.EXTENSION_DIRECTORY}${username}.${domain}.xml`;
        fs.unlink( path, ( result ) => {
            console.log( `Successfully deleted ${username}.${domain}.xml file` );
        } );
    }

    /*
    @Usage         : To update status of extension[Active/Inactive]
    @Param uuid    : uuid of extension
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `SIP device not found by uuid : ${uuid} \n`,
            logSuccessMsg: `SIP device status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.extensions, uuid, body, JSON.stringify( logMessages ) );
    }

    /*
    @Usage              : To search extension using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of extension with data
    */

    async advancedSearch ( searchParams ) {
        let populateFields = [ { path: "user", select: "username email" }, { path: "tenant", select: 'tenant_name username' } ];
        return this.commonDbFn.advancedSearch( this.extensions, searchParams, populateFields );
    }

    /*
    @Usage           : To update other feature of extension[call_forwarding,voicemail,follow_me]
    @Param uuid      : Extension uuid
    @Param body      : To update which filed with data
    @return Object   : Success / Error
    */

    async updateExtensionOtherFeature ( uuid: string, fieldName, logMessages, key, role, parent_uuid ) {
        let where = { [ key ]: fieldName };
        if ( key == "voicemail" ) {
            //Get extension detail
            const extension = await this.extensions.findOne( { uuid }, { _id: 0, uuid: 1, password: 1, username: 1, caller_id_name: 1, caller_id_number: 1, tenant_uuid: 1, user_uuid: 1 } ).exec();
            extension.tenant_uuid = role == "manager" ? parent_uuid : extension.tenant_uuid;
            const decodePassword = this.commonFn.decode( extension.password );
            this.generateTenantXml( extension, decodePassword, extension.uuid, fieldName );
        }
        return this.commonDbFn.update( this.extensions, uuid, where, JSON.stringify( logMessages ) );
    }

    /*
    @Usage                  : To create XML file of extension
    @Param extensionDetails : Contains extension details
    @return Object          : XML file will be created
    */

    async generateTenantXml ( extensionDetails, decodePassword, extensionUUID, voicemail ) {
        console.log("generateT9enantXml Calll",extensionDetails);
        const { username, caller_id_name, caller_id_number, tenant_uuid, user_uuid } = extensionDetails;
        const { voicemail_status, password, mail_to, attach_file } = voicemail;
        let extPassword = decodePassword;
        const getExtension = await this.tenant.findOne( { uuid: extensionDetails.tenant_uuid }, { domain: 1 } ).exec();
        var tenant;
        if ( getExtension ) {
            tenant = ( getExtension.domain == "" || getExtension.domain == null ) ? '' :
                getExtension.domain;
        } else {
            Logger.debug( `GenerateTenatXML tenant not found by uuid : ${extensionDetails.tenant_uuid} \n` );
        }

        //Directory DATA
        var file_path_directory = `${process.env.READ_TENANT_XML}`;
        var data_dir = fs.readFileSync( file_path_directory, 'utf8' );
        var directory_data = data_dir.toString();

        //Extension details
        directory_data = directory_data.replaceAll( '#EXT_USERNAME#', username );
        directory_data = directory_data.replaceAll( '#TENANT#', tenant );
        directory_data = directory_data.replaceAll( '#EXT_PASSWORD#', extPassword );
        directory_data = directory_data.replaceAll( '#TENANT_UUID#', tenant_uuid );
        directory_data = directory_data.replaceAll( '#USER_UUID#', user_uuid );
        directory_data = directory_data.replaceAll( '#EXTENSION_UUID#', extensionUUID );
        directory_data = directory_data.replaceAll( '#EXT_CID_NAME#', caller_id_name );
        directory_data = directory_data.replaceAll( '#EXT_CID_NUMBER#', caller_id_number );
        //Voicemail details
        directory_data = directory_data.replaceAll( '#VOICEMAIL_STATUS#', voicemail_status == 0 ? "true" : "false" );
        directory_data = directory_data.replaceAll( '#VOICEMAIL_PASSWORD#', password );
        directory_data = directory_data.replaceAll( '#VOICEMAIL_MAIL#', mail_to );
        directory_data = directory_data.replaceAll( '#VOICEMAIL_ATTACH#', attach_file );

        var directory_file_name = `${process.env.EXTENSION_DIRECTORY}${username}.${tenant}.xml`;
        fs.writeFileSync( directory_file_name, directory_data.toString() );
        console.log( directory_file_name );
        Logger.debug( `File written successfully with : ${username}.${tenant}.xml \n` );

    }
}

