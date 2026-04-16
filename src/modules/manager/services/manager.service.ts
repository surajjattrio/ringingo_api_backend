import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CreateManagerDto } from "src/modules/manager/dto/create-manager.dto";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";

@Injectable()

export class ManagerService {

    /*
    @Usage              : To load manager schema and other libraries
    @Param @InjectModel : It will load manager schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [manager,commonDbFn]
    */

    constructor(
        @InjectModel( ManagerSchema.name ) private readonly manager: Model<ManagerDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
    ) { }

    /*
    @Usage                     : First it will check whether given name,email exist or not , if not then new manager will be created else it will throw error
    @Param createManagerDto    : Request paramter that we set into dto
    @return Object             : Success / Error
    */

    async create ( createManagerDto: CreateManagerDto ) {
        const { username, email, tenant_uuid, password } = createManagerDto;
        let where = [ { username }, { email }, { tenant_uuid } ];
        let logMessages = {
            logErrorMsg: "Manager already exist \n",
            logSuccessMsg: "Manager created successfully \n"
        }
        // console.log( "==========password==============" );
        createManagerDto.password = this.commonFn.encode( createManagerDto.password );
        //createManagerDto.password = (createManagerDto.password);
        // console.log( "============password============" );
        return this.commonDbFn.findAndInsert( this.manager, where, createManagerDto, JSON.stringify( logMessages ), "and" );
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of manager with data
    */

    async findAll ( queryParams ) {
        let searchFields = [ "username", "first_name", "last_name", "email" ];
        let populateFields = [ { path: "manager_role", select: "role_name" }, { path: "extension_details", select: 'username' } ];
        return this.commonDbFn.findAllWithPagination( this.manager, queryParams, searchFields, populateFields );
    }

    /*
    @Usage          : To get single manager record based on uuid
    @Param uuid     : Search manager by uuid
    @return Object  : Result of manager
    */

    async findOne ( uuid: string ) {
        const getManagerDetail = await this.manager.findOne( { uuid } ).exec();
        if ( getManagerDetail == null ) {
            Logger.error( `Manager not found by uuid : ${uuid} \n`, getMethod ); throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Manager not found" } )
        }
        Logger.debug( `Manager fetched successfully by uuid : ${uuid} \n` );
        getManagerDetail.password = await this.commonFn.decode( getManagerDetail.password );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, getManagerDetail );
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error
    */

    async update ( uuid: string, createManagerDto: CreateManagerDto ) {
        const { username, email } = createManagerDto;
        const getManager = await this.manager.findOne( { uuid } ).exec();

        //Check username exist
        if ( getManager?.username != username ) {
            let result = await this.checkDuplicate( username, "username" );
            if ( result?.statusCode == 409 ) { return result };
        }

        //Check email exist
        if ( getManager?.email != email ) {
            let result = await this.checkDuplicate( email, "email" );
            if ( result?.statusCode == 409 ) { return result };
        }

        // console.log("========================");
        createManagerDto.password = this.commonFn.encode( createManagerDto.password );
        // console.log(createManagerDto.password);
        // console.log("========================");

        let logMessages = {
            logErrorMsg: `Manager not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Manager updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.manager, uuid, createManagerDto, JSON.stringify( logMessages ) );
    }

    /*
    @Usage              : To search manager using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of manager with data
    */

    async advancedSearch ( searchParams ) {
        let populateFields = [ { path: "manager_role", select: "role_name" }, { path: "extension_details", select: 'username' } ];
        return this.commonDbFn.advancedSearch( this.manager, searchParams, populateFields );
    }

    /*
    @Usage         : To update status of manager[Active/Inactive]
    @Param uuid    : uuid of manager
    @Param body    : Contains update body
    @return Object : Success / Error
    */

    async patch ( uuid: string, body ) {
        let logMessages = {
            logErrorMsg: `Manager not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Manager status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update( this.manager, uuid, body, JSON.stringify( logMessages ) );
    }

    /*
    @Usage         : Delete single or multiple manager using uuid
    @Param uuid    : To delete single manager pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

    async remove ( uuid: string ) {
        let logMessages = {
            logErrorMsg: `Manager not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Manager deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete( this.manager, { uuid }, JSON.stringify( logMessages ) );
    }

    /*
    @Usage          : Check duplicate username,email
    @Param value    : Contains email/username any
    @return Object  : Success / Error
    */

    async checkDuplicate ( value, fieldName ) {
        let result;
        switch ( fieldName ) {
            case "username":
                result = await this.manager.find( { username: value } ).count().exec();
                break;
            case "email":
                result = await this.manager.find( { email: value } ).count().exec();
                break;
        }

        if ( result > 0 ) {
            let errorMsg = fieldName.toString().charAt( 0 ).toUpperCase() + fieldName.toString().slice( 1 );
            Logger.error( `${errorMsg} already exist \n`, putMethod );
            return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `${errorMsg} already exist` );
        }
    }
}
