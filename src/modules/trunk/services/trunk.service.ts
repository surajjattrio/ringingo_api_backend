import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { SipProfileDocument, SipProfileSchema } from "src/modules/sip-profile/schema/sip-profile-schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { CreateTrunkDto } from "../dto/create-trunk.dto";
import { TenantTrunkDto } from "../dto/tenant-trunk.dto";
import { TrunkDocument, TrunkSchema } from "../schema/trunk.schema";

@Injectable()

export class TrunkService {

    /*
    @Usage              : To load trunk schema and other libraries
    @Param @InjectModel : It will load trunk schema
    @Param commonFn     : To use common created function
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [trunk,commonFn,commonDbFn] 
    */

    constructor(
        @InjectModel(TrunkSchema.name) private readonly trunk: Model<TrunkDocument>,
        private readonly commonFn: CommonFunctions,
        private readonly commonDbFn: CommonDBFunctions,
        @InjectModel(SipProfileSchema.name) private readonly sip_profile: Model<SipProfileDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,


    ) { }

    /*
    @Usage                 : First it will check whether given trunk name exist or not , if not then new trunk will be created else it will throw error
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         :  Success / Error 
    */

    async create(createTrunkDto: CreateTrunkDto) {
        let { name } = createTrunkDto;
        createTrunkDto.password = this.commonFn.encode(createTrunkDto.password);
        let logMessages = {
            logErrorMsg: "Trunk already exist \n",
            logSuccessMsg: "Trunk created successfully \n"
        }
        let response = await this.commonDbFn.findAndInsert(this.trunk, { name }, createTrunkDto, JSON.stringify(logMessages));

        if (response.statusCode == 409) { return response; }

        /*Create SIP Profile*/
        this.getDetailsToGenerateSipProfile(createTrunkDto.sip_profile_uuid);
        return response;
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of trunk with data 
    */

    /*async findAll(queryParams) {
        let searchFields = ["domain", "name"];
        let populateFields = [{ path: "sip-profile", select: "name" }, { path: "tenant", select: "tenant_name" }];
        return this.commonDbFn.findAllWithPagination(this.trunk, queryParams, searchFields, populateFields);
    }*/

    async findAll(queryParams) {
        let searchFields : any = ["domain", "name"];
        let populateFields = [{ path: "sip-profile", select: "name" }, { path: "tenant", select: "tenant_name" }];
        const { tenant_uuid , role, parent_uuid } = queryParams;

        let searchParams = [], query: any = {}, checkRole: any = {}, result, totalCount = 0, pagination = true;
        const perPage = Number(queryParams.limit) || 10;
        const currentPage = Number(queryParams.page) || 1;
        const skip = perPage * (currentPage - 1);

        //Send all data
        if (queryParams.limit == undefined && queryParams.page == undefined) {
            pagination = false;
        }

        //Check search parameters
        if (queryParams.search != "" && queryParams.search != undefined && searchFields != "") {
            searchFields.map((data) => {
                searchParams.push({ [data]: { '$regex': queryParams.search, '$options': 'i' } })
            })
            query = { '$or': searchParams };
        }

        //Check pagination flag
        /*if (pagination) {
            result = await this.trunk.find({ $and: [{ tenant_uuid }, query] }).limit(perPage).skip(skip).populate(populateFields).sort({ _id: -1 }).exec();
        } else {
            result = await this.trunk.find({ $and: [{ tenant_uuid }, query] },{name :1 , uuid : 1 , _id : 0 , status : 1}).sort({ _id: -1 }).exec();
        }

        //Do query for count only when pagination set to true
        if (result.length > 0 && pagination == true) {
            totalCount = await this.trunk.find({ $and: [{ tenant_uuid }, query] }).count().exec();
        }*/
        
        //Get result based on role
        result = await this.getDataBasedOnRole( role, tenant_uuid, query, perPage, skip, populateFields, parent_uuid, queryParams, pagination );
	let count = result.count
	result = result.data;

    let register_array = [], unregister_array = [];
        register_array = await this.commonFn.get_register_flag();
        console.log( register_array );
        // register_array = register_flag.body.trim().split( ' ' );

        unregister_array = await this.commonFn.get_unregister_flag();
        console.log( unregister_array );
        // unregister_array = unregister_flag.body.trim().split( ' ' );
        if ( result != '' ) {
            result?.map( ( data ) => {
                // console.log( data[ 'name' ] )
                if ( data[ 'name' ] != '' ) {
                    // console.log( 'coming' );
                    // console.log( data );
                    if ( register_array.includes( data[ 'name' ] ) ) {
                        // console.log( 'registered' );
                        data[ 'register_flag' ] = 0;
                    } else if ( unregister_array.includes( data[ 'name' ] ) ) {
                        // console.log( 'unregisterd' );
                        data[ 'register_flag' ] = 1;
                        // data.push( { 'register_flag': 1 } );
                    }
                }
                // console.log( data );
            } )
            // console.log( "RESULT" );
            // console.log( result );

        }

        let finalResponse = this.commonDbFn.sendResponseWithCount(result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, result, count);
	//if (pagination == false) delete finalResponse.count;
        return finalResponse;
    }

    /*
    @Usage          : To get single trunk record based on uuid
    @Param uuid     : Search trunk by uuid
    @return Object  : Result of trunk 
    */

    async findOne(uuid: string) {
        const trunk = await this.trunk.findOne({ uuid }).exec();
        if (trunk == null) {
            Logger.error(`Trunk not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Trunk not found" })
        }
        Logger.debug(`Trunk success fetched by uuid : ${uuid} \n`);
        trunk.password = await this.commonFn.decode(trunk.password);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, trunk);
    }

    /*
    @Usage                  : To update trunk
    @Param uuid             : Update trunk by uuid
    @Param createTrunkDto   : Request parameters for update
    @return Object          : Success / Error 
    */

    async update(uuid: string, createTrunkDto: CreateTrunkDto) {
        createTrunkDto.password = this.commonFn.encode(createTrunkDto.password);
        let logMessages = {
            logErrorMsg: `Trunk not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Trunk updated successfully by uuid : ${uuid} \n`
        }
        let response = await this.commonDbFn.update(this.trunk, uuid, createTrunkDto, JSON.stringify(logMessages));

        if (response.statusCode == 404) { return response; }

        /*Create SIP Profile*/
        this.getDetailsToGenerateSipProfile(createTrunkDto.sip_profile_uuid,createTrunkDto.name);
        return response;
    }

    /*
    @Usage         : Delete single or multiple trunk using uuid
    @Param uuid    : To delete single role pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

   /* async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Trunk not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Trunk deleted successfully by uuid : ${uuid} \n`
        }
	//let trunkName = await this.trunk.find({ uuid },{name : 1}).exec();
	//await this.getDetailsToGenerateSipProfile(uuid,trunkName[0].name);
        let response = await this.commonDbFn.delete(this.trunk, { uuid }, JSON.stringify(logMessages));
	if (response.statusCode == 200) {
		console.log("INSiDE");
	  let trunkName = await this.trunk.find({ uuid },{name : 1}).exec();

          await this.getDetailsToGenerateSipProfile(uuid, trunkName[0].name);
	  console.log("TRUNKNAME","");
	  //console.log("IN");
	  //await this.commonFn.killGateway(trunkName[0]?.name, killGateway);
	  //await this.commonFn.rescanSipProfile(sipProfile[0]?.name);
	  //console.log("OUT");
        }
	response = await response;
        return response;
	
    }*/

    async remove(uuid: string) { 
	let logMessages = {
            logErrorMsg: `Trunk not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Trunk deleted successfully by uuid : ${uuid} \n`
        }

	let trunkData = await this.trunk.find({ uuid }, { name: 1 , sip_profile_uuid : 1 }).exec();
        let sipProfileUUID = trunkData[0].sip_profile_uuid;
        let trunkName = trunkData[0].name;

        this.getDetailsToGenerateSipProfile(sipProfileUUID,trunkName);
	console.log("Reload");

        let response = await this.commonDbFn.delete(this.trunk, { uuid }, JSON.stringify(logMessages));
        if (response.statusCode == 200) {
            this.getDetailsToGenerateSipProfile(sipProfileUUID);
	    console.log("Deleted after reload")
        }
        return response;
    }

    /*
    @Usage              : To search trunk using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of trunk with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "sip-profile", select: "name" }];
        searchParams.tableName = 'trunk';
        return this.commonDbFn.advancedSearch(this.trunk, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of trunk[Active/Inactive]
    @Param uuid    : uuid of trunk
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Trunk not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Trunk status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.trunk, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : To assign trunk to single or multiple tenant
    @Param uuid    : uuid of trunk
    @Param body    : Contains uuids of tenant
    @return Object : Success / Error 
    */

    async assignTrunk(uuid: string, body) {
        let { tenant_uuid } = body;
        tenant_uuid = tenant_uuid.split(",");
        let logMessages = {
            logErrorMsg: `Tenant not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Trunk assigned successfully by uuid ${uuid} \n`
        }
        return this.commonDbFn.update(this.trunk, uuid, { tenant_uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage                 : Common code to generate sip profile
    @Param sipProfileuuid  : Request paramter that we set into dto
    @return Object         : Success / Error 
    */

    async getDetailsToGenerateSipProfile(sip_profile_uuid,killGateway:any = ""){
        //Fetch all tenant with this sip profile
        let allTenants = await this.tenant.find({ sip_profile_uuid }, { domain: 1, _id: 0 }).exec();

        //Fetch sip profile detail.
        let sipProfile = await this.sip_profile.find({ uuid: sip_profile_uuid }).exec();

        //Fetch all trunks correspondence to this sip profile
        let allTrunk = await this.trunk.find({ sip_profile_uuid }).exec();

        //Generate sip profile
        await this.commonFn.generateSipProfile(sipProfile[0], allTenants, allTrunk);
        
        if (killGateway != "") {
            //Kill gateway
            await this.commonFn.killGateway(sipProfile[0]?.name,killGateway);
        }

        //Reload sip profile
        await this.commonFn.rescanSipProfile(sipProfile[0]?.name);

	//Restart sip profile
        //await this.commonFn.restartSipProfile(sipProfile[0]?.name);
    }

    /*For Tenant */

    /*
    @Usage                 : To create trunk for tenant
    @Param tenantTrunkDto  : Request paramter that we set into dto
    @return Object         :  Success / Error 
    */

    async createTrunkForTenant(tenantTrunkDto: TenantTrunkDto) {
        let { name , tenant_uuid , role , parent_uuid } = tenantTrunkDto;
	let mainAddingEntityUUID = tenant_uuid;
	tenant_uuid = role == "manager" ? parent_uuid : tenant_uuid;

        let sipProfileUUID = await this.tenant.find({ uuid : tenant_uuid },{ sip_profile_uuid : 1 , _id : 0 }).exec();
        let where = [{name},{tenant_uuid}];
        tenantTrunkDto.created_flag = "1";
        tenantTrunkDto.password = this.commonFn.encode(tenantTrunkDto.password);
        tenantTrunkDto.sip_profile_uuid = sipProfileUUID[0]?.sip_profile_uuid;
        let logMessages = {
            logErrorMsg: "Trunk already exist \n",
            logSuccessMsg: "Trunk created successfully \n"
        }
	tenantTrunkDto.tenant_uuid = mainAddingEntityUUID;
        let response = await this.commonDbFn.findAndInsert(this.trunk, where, tenantTrunkDto, JSON.stringify(logMessages),"and");

        if (response.statusCode == 409) { return response; }

        /*Create SIP Profile*/
        this.getDetailsToGenerateSipProfile(tenantTrunkDto.sip_profile_uuid);
        return response;
    }

    /*
    @Usage                  : To update trunk
    @Param uuid             : Update trunk by uuid
    @Param tenantTrunkDto   : Request parameters for update
    @return Object          : Success / Error 
    */

    async updateTrunkForTenant(uuid: string, tenantTrunkDto: TenantTrunkDto) {
        let { name , tenant_uuid , role , parent_uuid } = tenantTrunkDto;
	let mainAddingEntityUUID = tenant_uuid;
        const getConference = await this.trunk.findOne({ uuid }).exec();
        if (getConference?.name != name) {
            const checkConferenceExist = await this.trunk.find({ $and:[{name},{tenant_uuid}] }).count().exec();
            if (checkConferenceExist > 0) {
                Logger.error("Trunk already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Trunk already exist`);
            }
        }
	tenant_uuid = role == "manager" ? parent_uuid : tenant_uuid; 
        let sipProfileUUID = await this.tenant.find({ uuid : tenant_uuid },{ sip_profile_uuid : 1 , _id : 0 }).exec();
        tenantTrunkDto.created_flag = "1";
        tenantTrunkDto.password = this.commonFn.encode(tenantTrunkDto.password);
        tenantTrunkDto.sip_profile_uuid = sipProfileUUID[0]?.sip_profile_uuid;
        let logMessages = {
            logErrorMsg: `Trunk not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Trunk updated successfully by uuid : ${uuid} \n`
        }
	tenantTrunkDto.tenant_uuid = mainAddingEntityUUID;
        let response = await this.commonDbFn.update(this.trunk, uuid, tenantTrunkDto, JSON.stringify(logMessages));

        if (response.statusCode == 404) { return response; }

        /*Create SIP Profile*/
        this.getDetailsToGenerateSipProfile(tenantTrunkDto.sip_profile_uuid,name);
        return response;
    }

    /*
    @Usage                  : Common function to get data based on role
    @Param role             : [manager,tenant,master_admin]
    @Param tenant_uuid      : uuid of logged in entity
    @Param perPage          : data per page
    @Param skip             : data to skip
    @Param populateFields   : populate reference details
    @Param parent_uuid      : uuid of parent
    @Param queryParams      : request parameters
    @Param pagination       : pagination status[true/false]
    @return Array           : contains data with count
    */

    async getDataBasedOnRole ( role, tenant_uuid, query, perPage, skip, populateFields, parent_uuid, queryParams, pagination ) {
        let result, tenatUUIDs = [], finalResult = [], totalCount = 0,response;
        switch ( role ) {
            case "master_admin":
                if ( queryParams.list == "all" ) {
                    result = await this.trunk.find( { $and: [ { tenant_uuid }, query ] }, { name: 1, uuid: 1, _id: 0, status: 1 } ).sort( { _id: -1 } ).exec();
                } else {
                    result = await this.trunk.find( { $and: [ { tenant_uuid }, query ] } ).limit( perPage ).skip( skip ).populate( populateFields ).sort( { _id: -1 } ).exec();
                    if ( result.length > 0 ) {
                        totalCount = await this.trunk.find( { $and: [ { tenant_uuid }, query ] } ).count().exec();
                    }
                }
                break;
            case "tenant":
                result = await this.commonDbFn.fetchAllManagersOfTenant( tenant_uuid );
                result.push( tenant_uuid );
                if ( queryParams.list == "all" ) {
                    result = await this.trunk.find( { $and: [ query, { $or: [ { tenant_uuid: { $in: result } } ] } ] }, { name: 1, uuid: 1, _id: 0, status: 1 } ).sort( { _id: -1 } ).exec();
                } else {
                    response = await this.trunk.find( { $and: [ query, { $or: [ { tenant_uuid: { $in: result } } ] } ] } ).limit( perPage ).skip( skip ).populate( populateFields ).sort( { _id: -1 } ).exec();
                    if ( response.length > 0 ) {
                        totalCount = await this.trunk.find( { $and: [ query, { $or: [ { tenant_uuid: { $in: result } } ] } ] } ).count().exec();
                    }
		    result = response;
                }
                break;
            case "manager":
                tenatUUIDs.push( tenant_uuid, parent_uuid );
                if ( queryParams.list == "all" ) {
                    result = await this.trunk.find( { $and: [ query, { $or: [ { tenant_uuid: { $in: tenatUUIDs } } ] } ] }, { name: 1, uuid: 1, _id: 0, status: 1 } ).sort( { _id: -1 } ).exec();
                } else {
                    result = await this.trunk.find( { $and: [ query, { $or: [ { tenant_uuid: { $in: tenatUUIDs } } ] } ] } ).limit( perPage ).skip( skip ).populate( populateFields ).sort( { _id: -1 } ).exec();
                    if ( result.length > 0 ) {
                        totalCount = await this.trunk.find( { $and: [ query, { $or: [ { tenant_uuid: { $in: tenatUUIDs } } ] } ] } ).count().exec();
                    }
                }
                break;
        }
	return {
	  data : result,
	  count : totalCount
	}
    }
}

