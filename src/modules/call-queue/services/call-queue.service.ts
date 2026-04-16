import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { deleteMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CallQueueAgentDocument, CallQueueAgentSchema } from "../schema/call-queue-agent.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { CallQueueDocument, CallQueueSchema } from "../schema/call-queue.schema";
import * as fs from "fs";
import { CommonFunctions } from "src/modules/common/common_functions";

@Injectable()

export class CallQueueService {

    /*
    @Usage              : To load call_queue schema and other libraries
    @Param @InjectModel : It will load call_queue schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [call_queue,commonDbFn] 
    */

    constructor(
        @InjectModel(CallQueueSchema.name) private readonly call_queue: Model<CallQueueDocument>,
    @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
    @InjectModel(CallQueueAgentSchema.name) private readonly call_queue_agent: Model<CallQueueAgentDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn : CommonFunctions
    ) { }

    /*
    @Usage                 : First it will check whether given name exist or not , if not then new call queue will be created else it will throw error
    @Param createTenantDto : Request paramter that we set into dto
    @return Object         : Success / Error 
    */

    async create(createCallQueueDto) {
        const { name, tenant_uuid, agent_info , agent_timeout , for_pbx, role } = createCallQueueDto;
        let where = [{ name }, { tenant_uuid }];
        let logMessages = {
            logErrorMsg: "Call queue already exist \n",
            logSuccessMsg: "Call queue created successfully \n"
        }

        if (role == "manager") {
            //Fetch tenant of manager
            let tenantInfo;
            const lookupUuid = createCallQueueDto.manager_uuid || tenant_uuid;
            tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
            if (tenantInfo) {
                createCallQueueDto.tenant_uuid = tenantInfo.tenant_uuid;
                createCallQueueDto.manager_uuid = lookupUuid as string;
            } else {
                createCallQueueDto.manager_uuid = lookupUuid as string;
            }
        }

        let response = await this.commonDbFn.findAndInsert(this.call_queue, where, createCallQueueDto, JSON.stringify(logMessages), "and", true);

        if (response.statusCode == 409) { return response; }

        let callQueueLastinsertedUUID = response.message.uuid;

	//Insert extension information only when mode is pbx
        if(for_pbx == "0"){
	    agent_info["tenant_uuid"] = tenant_uuid;
            agent_info["agent_timeout"] = agent_timeout;
            this.createCallQueueAgent(agent_info, callQueueLastinsertedUUID);
        }
	
        this.createCallAgentXML();
        await this.commonFn.reloadCallCenter();
        delete response.message
        return response;
    }

    /*
    @Usage                      : To insert call queue agent details into call_queue_agent
    @Param agent_info           : Agent information object
    @Param last_inserted_uuid   : Last inserted id of call_queue
    @return Object              : Success / Error 
    */

    async createCallQueueAgent(agent_info, last_inserted_uuid) {
        let insert_array = [];
        let doc;
        agent_info.map((data) => {
            doc = {
                call_queue_uuid: last_inserted_uuid,
                name: data.name,
                status: data.status,
                extension_uuid: data.extension_uuid,
                level: data.level,
                position: data.position,
                tenant_uuid : agent_info.tenant_uuid,
		agent_timeout : agent_info.agent_timeout,
		user_uuid : data.user_uuid
            }
            insert_array.push(doc);
        });
        await this.call_queue_agent.insertMany(insert_array);
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of call queue with data 
    */

    async findAll(queryParams) {
       const { tenant_uuid } = queryParams;
        if(queryParams.mode == "call-center"){
            let response = await this.call_queue.find({tenant_uuid , for_pbx : "1"},{_id : 0 , name : 1 , uuid : 1 , status : 1 , for_pbx : 1}).exec();
            let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
            return this.commonDbFn.sendResponseWithMessage(statusCode,response);
        }else{
            let searchFields = ["name", "strategy"];
            let populateFields = [{ path: "user", select: 'username' }];
            return this.commonDbFn.findAllWithPagination(this.call_queue, queryParams, searchFields, populateFields, "", true, true);
        }
    }

    /*
    @Usage          : To get single call queue record based on uuid
    @Param uuid     : Search call queue by uuid
    @return Object  : Result of call queue 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Call queue not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Call queue success fetched by uuid : ${uuid} \n`
        }
        let callQueueResult = await this.commonDbFn.findOne(this.call_queue, uuid, JSON.stringify(logMessages));
        if (callQueueResult.statusCode == 404) { return callQueueResult; }
        let callQueueAgentResult = await this.call_queue_agent.find({ call_queue_uuid: uuid });
        callQueueResult["agent_info"] = callQueueAgentResult;
        return callQueueResult;
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update call queue by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createCallQueueDto) {
        const { name, tenant_uuid, agent_info,agent_timeout , for_pbx } = createCallQueueDto;
        const getCallQueue = await this.call_queue.findOne({ uuid }).exec();
        if (getCallQueue?.name != name) {
            const checkCallQueueExist = await this.call_queue.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
            if (checkCallQueueExist > 0) {
                Logger.error("Call queue already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Call queue already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Call queue not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Call queue updated successfully by uuid : ${uuid} \n`
        }
        let callQueueResult = await this.commonDbFn.update(this.call_queue, uuid, createCallQueueDto, JSON.stringify(logMessages));
        if (callQueueResult.statusCode == 409) { return callQueueResult; }
        let response = await this.call_queue_agent.deleteMany({ call_queue_uuid: uuid });
        if (response.deletedCount == 0) {
            Logger.error(`Call queue not found by uuid : ${uuid} \n`, deleteMethod);
        }
        
	//Insert extension information only when mode is pbx
        if(for_pbx == "0"){
	    agent_info["tenant_uuid"] = tenant_uuid;
            agent_info["agent_timeout"] = agent_timeout;
            this.createCallQueueAgent(agent_info, uuid);
        }

	this.createCallAgentXML();
        await this.commonFn.reloadCallCenter();
        return callQueueResult;
    }

    /*
    @Usage              : To search call queue using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of call queue with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "user", select: 'username' }];
        return this.commonDbFn.advancedSearch(this.call_queue, searchParams, populateFields);
    }

    /*
    @Usage         : To update status of call queue[Active/Inactive]
    @Param uuid    : uuid of call queue
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Call queue not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Call queue status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.call_queue, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple call queue using uuid
    @Param uuid    : To delete single call queue pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string , domain :string) {
        let logMessages = {
            logErrorMsg: `Call queue not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Call queue deleted successfully by uuid : ${uuid} \n`
        }
        let response = await this.commonDbFn.delete(this.call_queue, { uuid }, JSON.stringify(logMessages));
        let uuids = uuid.split(",");
        await this.call_queue_agent.deleteMany({ call_queue_uuid: { $in: uuids } });
        this.createCallAgentXML();
        await this.commonFn.reloadCallCenter();
        return response;
    }

    /*
    @Usage            : To create dialplan of call center
    @Param tenantInfo : Tenant information
    @return           : It will create CALL_CENTER.XML 
    */

    async createCallAgentXML() { 
        let response, populateFileds,xml_dial_plan="";
        populateFileds = [{ path: "waiting_greeting", select: 'name file' }];
        response = await this.call_queue.find({}).populate(populateFileds);
        xml_dial_plan = xml_dial_plan + '<document type="freeswitch/xml">\n';
        xml_dial_plan = xml_dial_plan + '<section name="configuration">\n';
        xml_dial_plan = xml_dial_plan + '<configuration name="callcenter.conf" description="CallCenter">\n';
        xml_dial_plan = xml_dial_plan + '<settings>\n';
        xml_dial_plan = xml_dial_plan + '</settings>\n';
        xml_dial_plan = xml_dial_plan + '<queues>\n';

        //Add all queues
        xml_dial_plan+= this.addAllQueues(response);

        //Add all agent
        populateFileds = [{ path: "extension", select: 'username' },{ path: "tenant", select: 'domain' },{ path: "call_queue_details", select: 'sticky_agent -_id' }];
        response = await this.call_queue_agent.find({}).populate(populateFileds);
        xml_dial_plan += this.addAllAgents(response);

        //Add all agent tiers
        xml_dial_plan += this.addAllTiers(response);

        xml_dial_plan = xml_dial_plan + '</configuration>\n';
        xml_dial_plan = xml_dial_plan + '</section>\n';
        xml_dial_plan = xml_dial_plan + '</document>\n';

        let tenant_uuid = "CALL_CENTER";
        let call_queue_file_name = `${process.env.CALL_CENTER_DIRECTORY}${tenant_uuid}.xml`;
        fs.writeFile(call_queue_file_name, xml_dial_plan.toString(), (err) => {
            if (err) {
                Logger.error(`${err} error to written in ${tenant_uuid}.xml`);
                throw err;
            }
            Logger.debug(`${tenant_uuid}.xml has been written to file successfully.`);
        });
    }

    /*
    @Usage                 : To add all queues in CALL_CENTER.XML
    @Param response        : Call queue data
    @Param xml_dial_plan   : XML file default data
    @return                : All queues data 
    */

    addAllQueues(response) {
        let queue = "";
        response?.map((data) => {
            queue = queue + `<queue name="${data.uuid}@default">\n`;
            queue = queue + `<param name="strategy" value="${data.strategy}"/>\n`;
            queue = queue + `<param name="moh-sound" value="${process.env.UPLOAD_DIRECTORY}${data.waiting_greeting[0]?.file}"/>\n`;
            queue = queue + `<param name="max-wait-time" value="${data.timeout}"/>\n`;
            queue = queue + '<param name="tier-rules-apply" value="true"/>\n';
            queue = queue + '<param name="tier-rule-wait-second" value="5"/>\n';
            queue = queue + '</queue>\n';
        })
        queue = queue + '</queues>\n';
        return queue;
    }

    /*
    @Usage                 : To add all agents in CALL_CENTER.XML
    @Param response        : Call queue agent data
    @Param xml_dial_plan   : Contain default and newly added queues in CALL_CENTER.XML 
    @return                : All agents data 
    */

    addAllAgents(response) {
        let agent = "";
        agent = agent + '<agents>\n';
        response?.map((data) => {
		agent = agent + `<agent name="${data?.extension[0]?.username}.${data?.tenant[0]?.domain}@default" type='callback' contact="[leg_timeout=${data.agent_timeout},sip_h_X-call_stick_type='call_queue',sip_h_X-call_stick_status='${data?.call_queue_details[0]?.sticky_agent}',sip_h_X-routing_uuid='${data?.call_queue_uuid}']user/${data?.extension[0]?.username}@${data?.tenant[0]?.domain}" status='Available' max-no-answer='100' wrap-up-time='2' reject-delay-time='60' busy-delay-time='60' no-answer-delay-time="60" />\n`;
        });
        agent = agent + '</agents>\n';
        return agent;
    }

    /*
    @Usage                 : To add all agents tiers in CALL_CENTER.XML
    @Param response        : Call queue agent data
    @Param xml_dial_plan   : Contain default and newly added queues,newly added agents in CALL_CENTER.XML 
    @return                : All agents tiers data 
    */

    addAllTiers(response) {
        let agentTier = "";
        agentTier = agentTier + '<tiers>\n';
        response?.map((data) => {

            agentTier = agentTier + `<tier agent="${data?.extension[0]?.username}.${data?.tenant[0]?.domain}@default" queue='${data.call_queue_uuid}@default' level='${data.level}' position='${data.position}'/>\n`;
        });
        agentTier = agentTier + '</tiers>\n';
        return agentTier;
    }
}
