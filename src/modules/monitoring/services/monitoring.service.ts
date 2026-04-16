import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CreateMonitoringDto } from "../dto/create-monitoring.dto";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { InjectModel } from "@nestjs/mongoose";
import { MonitoringDocument, MonitoringSchema } from "../schema/monitoring.schema";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonFunctions } from "src/modules/common/common_functions";
import * as fs from 'fs';
import * as esl from "modesl";



@Injectable()

export class MonitoringService {
   // commonFn: any;

    /*
    @Usage              : To load monitoring schema and other libraries
    @Param @InjectModel : It will load monitoring schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [monitoring,commonFn,commonDbFn] 
    */

   constructor(
        @InjectModel(MonitoringSchema.name) private readonly monitoring: Model<MonitoringDocument>,
        private readonly commonDbFn: CommonDBFunctions,
            private readonly commonFn : CommonFunctions 
	
    ) { }

   /*
    @Usage                          : First it will check whether given extension exist or not , if not then new monitoring will be created else it will throw error
    @Param createMonitoringDto  : Request paramter that we set into dto
    @return Object                  : Success / Error 
    */


    async callMonitoringCreate(createMonitoringDto: CreateMonitoringDto) {
        const { extension, call_uuid, domain } = createMonitoringDto;
 
  //reloadacl

       await this.commonFn.callMonitoring(extension, call_uuid, domain) ;
  
   return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,`Monitoring created successfully`)
     }     



    async callBargeCreate(createMonitoringDto: CreateMonitoringDto) {
        const { extension, call_uuid, domain } = createMonitoringDto;
    
//reloadacl

        await this.commonFn.callBarge(extension, call_uuid, domain) ;

return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,`Barge created successfully`)


     }     


     async callWhisperCreate(createMonitoringDto: CreateMonitoringDto) {
        const { extension, call_uuid,  domain  } = createMonitoringDto;

//reloadacl

        await this.commonFn.callWhisper(extension, call_uuid, domain) ;

return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,`Whisper created successfully`)

     }     
     
}