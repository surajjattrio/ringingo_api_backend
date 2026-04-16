import { HttpStatus, Injectable , Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { TrunkDocument, TrunkSchema } from "src/modules/trunk/schema/trunk.schema";
import { CreateSipProfileDto} from "../dto/create-sip-profile.dto";
import { StartRescanProfileDto } from "../dto/start-rescan-profile.dto";
import { SipProfileDocument, SipProfileSchema } from "../schema/sip-profile-schema";
import * as fs from "fs";

@Injectable()

export class SipProfileService {

    /*
    @Usage              : To load tenant schema and other libraries
    @Param @InjectModel : It will load tenant schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return             : Object[sip_profile,commonDbFn] 
    */

    constructor(
        @InjectModel(SipProfileSchema.name) private readonly sip_profile: Model<SipProfileDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        @InjectModel(TrunkSchema.name) private readonly trunk: Model<TrunkDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions
    ) { }

    /*
    @Usage                     : First it will check whether given sip profile exist or not , if not then new sip profile will be created else it will throw error
    @Param createSipProfileDto : Request paramter that we set into dto
    @return Object             :  Success / Error  
    */

    async create(createSipProfileDto: CreateSipProfileDto) {
        const { name } = createSipProfileDto;
        let logMessages = {
            logErrorMsg: "SIP profile already exist \n",
            logSuccessMsg: "SIP profile created successfully \n"
        }
        let response = await this.commonDbFn.findAndInsert(this.sip_profile, { name }, createSipProfileDto, JSON.stringify(logMessages), "", true);

        if (response.statusCode == 409) { return response; }

        //Fetch all tenant with this sip profile
        let allTenants = await this.tenant.find({ sip_profile_uuid: response.message.uuid }, { domain: 1, _id: 0 }).exec();

        //Fetch all trunk with this sip profile
        let allTrunks = await this.trunk.find({ sip_profile_uuid: response.message.uuid }).exec();
        
	//Generate sip profile
	await this.commonFn.generateSipProfile(response.message, allTenants, allTrunks);

	//Start & rescan sip profile
        await this.commonFn.startSipProfile(name);
	await this.commonFn.rescanSipProfile(name);

        delete response.message
        return response;
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of sip profile with data 
    */

    async findAll(queryParams) {
        let searchFields = ["name", "sip_ip", "sip_port"];
        return this.commonDbFn.findAllWithPagination(this.sip_profile, queryParams, searchFields);
    }

    /*
    @Usage         : To get single sip profile record based on uuid
    @Param uuid    : Search sip profile by uuid
    @return Object : Result of sip profile
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Sip profile not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Sip profile success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.sip_profile, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                  : To update sip profile
    @Param uuid             : update sip profile by uuid
    @Param updateTenantDto  : Request parameters for update
    @return Object          : Success / Error 
    */

    async update(uuid: string, createSipProfileDto: CreateSipProfileDto) {
        const { name } = createSipProfileDto;
        let logMessages = {
            logErrorMsg: `SIP profile not found by uuid : ${uuid} \n`,
            logSuccessMsg: `SIP profile updated successfully by uuid : ${uuid} \n`
        }
        let response = await this.commonDbFn.update(this.sip_profile, uuid, createSipProfileDto, JSON.stringify(logMessages));

        if (response.statusCode == 404) { return response; }

        /*Create SIP Profile*/

        let sip_profile_uuid = uuid;
        createSipProfileDto.uuid = uuid;

        //Fetch all tenant with this sip profile
        let allTenants = await this.tenant.find({ sip_profile_uuid }, { domain: 1, _id: 0 }).exec();

        //Fetch all trunks correspondence to this sip profile
        let allTrunks = await this.trunk.find({ sip_profile_uuid }).exec();
	
	//Generate sip profile
        await this.commonFn.generateSipProfile(createSipProfileDto, allTenants, allTrunks);
        
	//Start & rescan sip profile
	//await this.commonFn.startSipProfile(name);
        await this.commonFn.rescanSipProfile(name);

        return response;
    }

    /*
    @Usage         : Delete single or multiple tenant using uuid
    @Param uuid    : To delete single tenant pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `SIP profile not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `SIP profile deleted successfully by uuid : ${uuid} \n`
        }
	const path = `${process.env.SIP_PROFILE_DIRECTORY}${uuid}.xml`;
	fs.unlink(path, (result) => {
            Logger.debug(`Successfully deleted ${uuid}.xml file`);
        });
	await this.commonFn.reloadModSofia();
        return this.commonDbFn.delete(this.sip_profile, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search sip profile using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of sip profile with data 
    */

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.sip_profile, searchParams);
    }

    /*
    @Usage         : To update status of sip profile[Active/Inactive]
    @Param uuid    : uuid of sip profile
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `SIP profile not found by ${uuid} \n`,
            logSuccessMsg: `SIP profile status updated successfully by uuid ${uuid} \n`
        }
        return this.commonDbFn.update(this.sip_profile, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage                          : To reload sip profile
    @Param reloadType               : start / rescan
    @Param sipProfileName           : Name of sip profile
    */

    reloadProfile(sipProfileName,reloadType){
	if(reloadType == "start"){
           this.commonFn.startSipProfile(sipProfileName);
        }else if(reloadType == "rescan"){
           this.commonFn.rescanSipProfile(sipProfileName);
        }
        return { statusCode : HttpStatus.OK, data : `${sipProfileName} profile ${reloadType} successfully`};
    }
}
