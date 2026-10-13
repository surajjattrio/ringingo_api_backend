import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateOutgoingRulesDto } from "../dto/create-outgoing-rules.dto";
import { digitsOnly } from "../utils/cli-route";
import { OutgoingRulesDocument, OutgoingRulesSchema } from "../schema/outgoing-rules.schema";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";


@Injectable()

export class OutgoingRulesService {

    /*
    @Usage              : To load outgoing schema and other libraries
    @Param @InjectModel : It will load outgoing schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [outgoing_rules,commonDbFn] 
    */

    constructor(
        @InjectModel(OutgoingRulesSchema.name) private readonly outgoing_rules: Model<OutgoingRulesDocument>,
        @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                 : First it will check whether given role exist or not , if not then new role will be created else it will throw error
    @Param createRolesDto  : Request paramter that we set into dto
    @return Object         :  Success / Error 
    */

    /*
    @Usage : Validate rows of CLI based route
    */

    private validateCliRoute(createOutgoingRulesDto: CreateOutgoingRulesDto) {
        if (createOutgoingRulesDto?.route_type != "cli") return null;
        const rows: any[] = Array.isArray(createOutgoingRulesDto?.rules) ? (createOutgoingRulesDto.rules as any) : [];
        if (rows.length == 0) return "Please add at least one route";
        const isNumberList = (value: any) => (Array.isArray(value) ? value : String(value ?? "").split(",")).every((v: any) => String(v).trim() == "" || /^\d+$/.test(String(v).trim()));
        const isNumberOrEmpty = (value: any) => String(value ?? "").trim() == "" || /^\d+$/.test(String(value).trim());
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || {};
            const label = `Route ${i + 1}`;
            const clis = (Array.isArray(row.match_cli) ? row.match_cli : []).filter((cli: any) => digitsOnly(cli) != "");
            if (clis.length == 0) return `${label}: select at least one CLI`;
            if (!row.trunk_uuid) return `${label}: select trunk`;
            if (!isNumberList(row.cli_allowed_lengths) || !isNumberList(row.to_allowed_lengths)) return `${label}: allowed lengths must be numbers`;
            for (const key of ["", "failover_trunk_1_", "failover_trunk_2_"]) {
                if (!isNumberOrEmpty(row[`${key}cli_keep_last`]) || !isNumberOrEmpty(row[`${key}to_keep_last`])) return `${label}: keep last digits must be a number`;
            }
            for (const n of [1, 2]) {
                if (row[`failover_trunk_${n}_uuid`] && !row[`failover_trunk_${n}_call_id`]) return `${label}: select Caller ID for Failover Trunk ${n}`;
            }
        }
        return null;
    }

    async create(createOutgoingRulesDto: CreateOutgoingRulesDto) {
        const { name , tenant_uuid , role } = createOutgoingRulesDto;
        const cliRouteError = this.validateCliRoute(createOutgoingRulesDto);
        if (cliRouteError) return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, cliRouteError);
        let where = [{name},{tenant_uuid}];
        let logMessages = {
            logErrorMsg: "Outgoing rule already exist \n",
            logSuccessMsg: "Outgoing rule created successfully \n"
        }
	//createOutgoingRulesDto.created_flag = role == "tenant" ? "1" : "0";
	createOutgoingRulesDto.created_flag = role == "tenant" ? "1" : (role == "manager" ? "2" : "0");
        return this.commonDbFn.findAndInsert(this.outgoing_rules, where, createOutgoingRulesDto, JSON.stringify(logMessages),"and");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of outgoing rules with data 
    */

    /*async findAll(queryParams) {
        let searchFields : any = ["name", "description"];
        const { role, tenant_uuid } = queryParams;
        if (role == "master_admin") {
            return this.commonDbFn.findAllWithPagination(this.outgoing_rules, queryParams, searchFields);
        } else { //For Tenant

            //Get assigned outgoing rule to current tenant
            let { outgoing_rule_uuid } = await this.tenant.findOne({ uuid: tenant_uuid }, { outgoing_rule_uuid: 1, _id: 0 }).exec();

            let searchParams = [], query: any = {}, result, totalCount = 0, pagination = true, populate: any = "";
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
            if (pagination) {
                result = await this.outgoing_rules.find({ $and: [{ $or: [{ tenant_uuid }, { uuid: outgoing_rule_uuid }] }, { $or: [query] }] }).limit(perPage).skip(skip).populate(populate).sort({ _id: -1 }).exec();
            } else {
                result = await this.outgoing_rules.find({ $and: [{ $or: [{ tenant_uuid }, { uuid: outgoing_rule_uuid }] }, { $or: [query] }] }).populate(populate).sort({ _id: -1 }).exec();
            }

            //Do query for count only when pagination set to true
            if (result.length > 0 && pagination == true) {
                totalCount = await this.outgoing_rules.find({ $and: [{ $or: [{ tenant_uuid }, { uuid: outgoing_rule_uuid }] }, { $or: [query] }] }).count().exec();
            }

            let finalResponse = this.commonDbFn.sendResponseWithCount(result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, result, totalCount);
            if (pagination == false) {
                delete finalResponse.count;
            }
            return finalResponse;
        }
    }*/

    async findAll(queryParams) {
        let searchFields: any = ["name", "description"];
        let { role, tenant_uuid , parent_uuid } = queryParams;

        let searchParams = [], query: any = {}, checkRole: any = {},result, totalCount = 0, pagination = true, populate: any = "";
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
	
	let response = await this.getDataBasedOnRole( tenant_uuid, parent_uuid, perPage, skip, populate, query, role, queryParams );
        //Check pagination flag
        /*if (pagination) {
            //check role
            if(role == "master_admin"){
                result = await this.outgoing_rules.find({ $and: [{ tenant_uuid }, query] }).limit(perPage).skip(skip).populate(populate).sort({ _id: -1 }).exec();
            } else{
	       let entityUUID = role == "manager" ? parent_uuid : tenant_uuid;
               let outgoingRuleDetails = await this.tenant.findOne({ uuid: entityUUID }, { outgoing_rule_uuid: 1, _id: 0 }).exec();
               let outgoing_rule_uuid = outgoingRuleDetails?.outgoing_rule_uuid; 
	       
	       if ( role == "manager" ) {
		    let tenantUUIDs = [];
		    tenantUUIDs.push(tenant_uuid,parent_uuid);
		    result = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: tenantUUIDs } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] } ).limit( perPage ).skip( skip ).populate( populate ).sort( { _id: -1 } ).exec();

                } else {
                    let response = await this.commonDbFn.fetchAllManagersOfTenant( tenant_uuid );
                    response.push( tenant_uuid );
                    result = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: response } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] } ).limit( perPage ).skip( skip ).populate( populate ).sort( { _id: -1 } ).exec();
                }
	       //result = await this.outgoing_rules.find({ $and: [{ $or: [{ tenant_uuid }, { uuid: outgoing_rule_uuid }] }, { $or: [query] }] }).limit(perPage).skip(skip).populate(populate).sort({ _id: -1 }).exec();
            }
        } else {
            if(role == "master_admin" || role == "manager"){
                result = await this.outgoing_rules.find({ $and: [{ tenant_uuid }, query] },{ name : 1 , uuid : 1 , _id : 0 , status : 1 , created_flag : 1}).sort({ _id: -1 }).exec();
            } else{
              let outgoingRuleDetails = await this.tenant.findOne({ uuid: tenant_uuid }, { outgoing_rule_uuid: 1, _id: 0 }).exec();
              let outgoing_rule_uuid = outgoingRuleDetails?.outgoing_rule_uuid;  
	      result = await this.outgoing_rules.find({ $and: [{ $or: [{ tenant_uuid }, { uuid: outgoing_rule_uuid }] }, { $or: [query] }] },{ name : 1 , uuid : 1 , _id : 0 , status : 1 , created_flag : 1}).sort({ _id: -1 }).exec();
            }
        }

        //Do query for count only when pagination set to true
        if (result.length > 0 && pagination == true) {
            if(role == "master_admin" || role == "manager"){
                totalCount = await this.outgoing_rules.find({ $and: [{ tenant_uuid }, query] }).count().exec();
	    } else{
                let outgoingRuleDetails = await this.tenant.findOne({ uuid: tenant_uuid }, { outgoing_rule_uuid: 1, _id: 0 }).exec();
                let outgoing_rule_uuid = outgoingRuleDetails?.outgoing_rule_uuid;
		totalCount = await this.outgoing_rules.find({ $and: [{ $or: [{ tenant_uuid }, { uuid: outgoing_rule_uuid }] }, { $or: [query] }] }).count().exec();
            }
        }*/
	
        let finalResponse = this.commonDbFn.sendResponseWithCount(response?.data?.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, response.data, response.count);
        if (pagination == false) {
            delete finalResponse.count;
        }
        return finalResponse;
    }

    /*
    @Usage          : To get single outgoing rule record based on uuid
    @Param uuid     : Search outgoing rule by uuid
    @return Object  : Result of outgoing rule 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Outgoing rule not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Outgoing rule success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.outgoing_rules, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update user role by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createOutgoingRulesDto: CreateOutgoingRulesDto) {
        const { name, tenant_uuid , role } = createOutgoingRulesDto;
        const cliRouteError = this.validateCliRoute(createOutgoingRulesDto);
        if (cliRouteError) return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, cliRouteError);
        const getOutgoingRules = await this.outgoing_rules.findOne({ uuid }).exec();
        if (getOutgoingRules?.name != name) {
            const checkOutgoingRulesExist = await this.outgoing_rules.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
            if (checkOutgoingRulesExist > 0) {
                Logger.error("Outgoing rule already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Outgoing rule already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Outgoing rule not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Outgoing rule updated successfully by uuid : ${uuid} \n`
        }
	//createOutgoingRulesDto.created_flag = role == "tenant" ? "1" : "0";
	createOutgoingRulesDto.created_flag = role == "tenant" ? "1" : (role == "manager" ? "2" : "0");
        return this.commonDbFn.update(this.outgoing_rules, uuid, createOutgoingRulesDto, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search outgoing rules using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of outgoing rules with data 
    */

    advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.outgoing_rules, searchParams);
    }

    /*
    @Usage         : To update status of outgoing rule[Active/Inactive]
    @Param uuid    : uuid of outgoing rule
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Outgoing rule not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Outgoing rule status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.outgoing_rules, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple outgoing rule using uuid
    @Param uuid    : To delete single outgoing rule pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Outgoing rule not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Outgoing rule deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.outgoing_rules, { uuid }, JSON.stringify(logMessages));
    }

    async getDataBasedOnRole ( tenant_uuid, parent_uuid, perPage, skip, populate, query, role, queryParams ) {
        let result, tenantUUIDs = [], totalCount = 0, outgoingRuleDetails, outgoing_rule_uuid;
        switch ( role ) {
            case "master_admin":
                if ( queryParams.list == "all" ) {
                    result = await this.outgoing_rules.find( { $and: [ { tenant_uuid }, query ] }, { name: 1, uuid: 1, _id: 0, status: 1, created_flag: 1 } ).sort( { _id: -1 } ).exec();
                } else {
                    result = await this.outgoing_rules.find( { $and: [ { tenant_uuid }, query ] } ).limit( perPage ).skip( skip ).populate( populate ).sort( { _id: -1 } ).exec();
                    if ( result.length > 0 ) {
                        totalCount = await this.outgoing_rules.find( { $and: [ { tenant_uuid }, query ] } ).count().exec();
                    }
                }
                break;
            case "tenant":
                tenantUUIDs = await this.commonDbFn.fetchAllManagersOfTenant( tenant_uuid );

                outgoingRuleDetails = await this.tenant.findOne( { uuid: tenant_uuid }, { outgoing_rule_uuid: 1, _id: 0 } ).exec();
                outgoing_rule_uuid = outgoingRuleDetails?.outgoing_rule_uuid;

                tenantUUIDs.push( tenant_uuid );

                if ( queryParams.list == "all" ) {
                    result = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: tenantUUIDs } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] }, { name: 1, uuid: 1, _id: 0, status: 1, created_flag: 1 } ).sort( { _id: -1 } ).exec();
                } else {
                    result = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: tenantUUIDs } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] } ).limit( perPage ).skip( skip ).populate( populate ).sort( { _id: -1 } ).exec();
                    if ( result.length > 0 ) {
                        totalCount = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: tenantUUIDs } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] } ).count().exec()
                    }
                }
                break;
            case "manager":
                tenantUUIDs = await this.commonDbFn.fetchAllManagersOfTenant(parent_uuid);
                tenantUUIDs.push(parent_uuid);

                outgoingRuleDetails = await this.tenant.findOne({ uuid: parent_uuid }, { outgoing_rule_uuid: 1, _id: 0 }).exec();
                outgoing_rule_uuid = outgoingRuleDetails?.outgoing_rule_uuid;
                //tenantUUIDs.push( tenant_uuid, parent_uuid );

                if ( queryParams.list == "all" ) {
                    result = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: tenantUUIDs } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] }, { name: 1, uuid: 1, _id: 0, status: 1, created_flag: 1 } ).sort( { _id: -1 } ).exec();
                } else {
                    result = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: tenantUUIDs } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] } ).limit( perPage ).skip( skip ).populate( populate ).sort( { _id: -1 } ).exec();
                    if ( result.length > 0 ) {
                        totalCount = await this.outgoing_rules.find( { $and: [ { $or: [ { tenant_uuid: { $in: tenantUUIDs } }, { uuid: outgoing_rule_uuid } ] }, { $or: [ query ] } ] } ).count().exec()
                    }
                }
                break;
        }
	return { data : result , count : totalCount }
    }
}
