import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CreateIpMappingDto } from "../dto/create-ip-mapping.dto";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { InjectModel } from "@nestjs/mongoose";
import { IpMappingDocument, IpMappingSchema } from "../schema/ip-mapping.schema";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonFunctions } from "src/modules/common/common_functions";
//import connection from "../../../db";

@Injectable()

export class IpMappingService {

    /*
    @Usage              : To load ip mapping schema and other libraries
    @Param @InjectModel : It will load ip mapping schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [ip_mapping,commonDbFn]
    */

    constructor(
        @InjectModel( IpMappingSchema.name ) private readonly ip_mapping: Model<IpMappingDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions
    ) { }

    /*
    @Usage                     : First it will check whether given IP & Prefix exist or not , if not then new Ip mapping will be created else it will throw error
    @Param createIpMappingDto  : Request paramter that we set into dto
    @return Object             : Success / Error
    */

    async create ( createIpMappingDto: CreateIpMappingDto ) {
        const { ip, prefix, tenant_uuid, status } = createIpMappingDto;
        let where = [ { ip }, { prefix }, { tenant_uuid } ];
        let logMessages = {
            logErrorMsg: "IP mapping already exist \n",
            logSuccessMsg: "IP mapping created successfully \n"
        }

        //reloadacl
        await this.commonFn.reloadACL();
        // return this.commonDbFn.findAndInsert(this.ip_mapping, where, createIpMappingDto, JSON.stringify(logMessages), "and");
        const ipmapdata = await this.commonDbFn.findAndInsert( this.ip_mapping, where, createIpMappingDto, JSON.stringify( logMessages ), "and", true );
        // console.log("ip map data");
        // console.log(ipmapdata.message);
        if ( process.env.OPENSIPS === 'YES' ) {
            const last_uuid = ipmapdata.message.uuid;
            try {
                // const [ result ] = await ( await connection ).query( 'INSERT INTO ip_mapping (ip, tenant_uuid, prefix, status, uuid) VALUES (?, ?, ?, ?, ?)',
                //     [ ip, tenant_uuid, prefix, status, last_uuid ] );
                //return result as OkPacket;
            } catch ( err ) {
                console.error( 'Error inserting data:', err );
                //return null;
            }
        }
        return ipmapdata;
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of ip mapping with data
    */

    async findAll ( queryParams ) {
        let searchFields = [ "ip", "prefix" ];
        return this.commonDbFn.findAllWithPagination( this.ip_mapping, queryParams, searchFields );
    }

    /*
    @Usage          : To get single ip mapping record based on uuid
    @Param uuid     : Search ip mapping by uuid
    @return Object  : Result of ip mapping
    */

    async findOne ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `IP mapping not found by uuid : ${uuid} \n`,
            logSuccessMsg: `IP mapping success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne( this.ip_mapping, uuid, JSON.stringify( logMessages ) );
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update ip mapping by uuid
    @Param createIpMappingDto  : Request parameters for update
    @return Object             : Success / Error
    */

    async update ( uuid: string, createIpMappingDto: CreateIpMappingDto ) {
        const { ip, prefix, tenant_uuid, status } = createIpMappingDto;
        const getIpMapping = await this.ip_mapping.findOne( { uuid } ).exec();
        if ( getIpMapping?.ip != ip || getIpMapping?.prefix != prefix ) {
            const checkIpMappingExist = await this.ip_mapping.find( { $and: [ { ip }, { prefix }, { tenant_uuid } ] } ).count().exec();
            if ( checkIpMappingExist > 0 ) {
                Logger.error( "IP mapping already exist \n", putMethod );
                return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `IP mapping already exist` );
            }
        }
        let logMessages = {
            logErrorMsg: `IP mapping not found by uuid : ${uuid} \n`,
            logSuccessMsg: `IP mapping updated successfully by uuid : ${uuid} \n`
        }
        // if ( process.env.OPENSIPS === 'YES' ) {
        //     try {
        //         // Perform the SQL UPDATE operation
        //         // const [ result ] = await ( await connection ).query( 'UPDATE ip_mapping SET ip = ?, tenant_uuid = ?, prefix = ?, status = ? WHERE uuid = ?',
        //         //     [ ip, tenant_uuid, prefix, status, uuid ] );
        //         console.log( [ result ] );
        //         console.log( 'MySQL update result:', result );

        //     } catch ( err ) {
        //         console.error( 'Error updating data:', err );
        //         return null;
        //     }
        // }

        //reloadacl
        await this.commonFn.reloadACL();
        return this.commonDbFn.update( this.ip_mapping, uuid, createIpMappingDto, JSON.stringify( logMessages ) );
    }

    /*
    @Usage              : To search ip mapping using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of ip mapping with data
    */

    async advancedSearch ( searchParams ) {
        return this.commonDbFn.advancedSearch( this.ip_mapping, searchParams );
    }

    /*
    @Usage         : To update status of IP mapping[Active/Inactive]
    @Param uuid    : uuid of ip mapping
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `IP mapping not found by uuid : ${uuid} \n`,
            logSuccessMsg: `IP mapping status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.ip_mapping, uuid, body, JSON.stringify( logMessages ) );
    }

    /*
    @Usage         : Delete single or multiple IP mapping using uuid
    @Param uuid    : To delete single IP mapping pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

  /*  async remove ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `IP mapping not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `IP mapping deleted successfully by uuid : ${uuid} \n`
        }
        //reloadacl
        await this.commonFn.reloadACL();
        return this.commonDbFn.delete( this.ip_mapping, { uuid }, JSON.stringify( logMessages ) );
    }*/

    async remove(uuid: string | string[]) {
        let logMessages;
    
        // If uuid is an array, it means multiple deletions are requested
        if (Array.isArray(uuid)) {
            // Construct log messages for multiple deletions
            logMessages = {
                logErrorMsg: `IP mappings not exist for the provided UUIDs: ${uuid.join(', ')} \n`,
                logSuccessMsg: `IP mappings deleted successfully for the provided UUIDs: ${uuid.join(', ')} \n`
            };
    
            // Check if OPENSIPS environment variable is set to 'YES' for MySQL deletion
            // if (process.env.OPENSIPS === 'YES') {
            //     try {
            //         // Perform deletion from MySQL using a single query with the IN clause
            //         const [result] = await (await connection).query(`
            //             DELETE FROM ip_mapping
            //             WHERE uuid IN (?)`, [uuid]
            //         );
            //         console.log('MySQL deletion result:', result);
            //     } catch (err) {
            //         console.error('Error deleting data:', err);
            //         // Handle error if needed
            //     }
            // }
        } else {
            // If uuid is a single string, it means a single deletion is requested
            logMessages = {
                logErrorMsg: `IP mapping not exist by uuid : ${uuid} \n`,
                logSuccessMsg: `IP mapping deleted successfully by uuid : ${uuid} \n`
            };
    
            // Check if OPENSIPS environment variable is set to 'YES' for MySQL deletion
            // if (process.env.OPENSIPS === 'YES') {
            //     try {
            //         // Perform deletion from MySQL for the single UUID
            //         const [result] = await (await connection).query(`
            //             DELETE FROM ip_mapping
            //             WHERE uuid = ?`, uuid
            //         );
            //         console.log('MySQL deletion result:', result);
            //     } catch (err) {
            //         console.error('Error deleting data:', err);
            //         // Handle error if needed
            //     }
            // }
        }
    
        // Reload ACL
        await this.commonFn.reloadACL();
    
        // Delete from MongoDB
        return this.commonDbFn.delete(this.ip_mapping, { uuid }, JSON.stringify(logMessages));
    }
     
    
}

