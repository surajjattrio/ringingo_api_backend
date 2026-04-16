import { Body, Delete , Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters , deleteDecoraters } from "src/swagger/swagger_decoraters";
import { CreateMonitoringDto } from "../dto/create-monitoring.dto";
import { MonitoringService } from "../services/monitoring.service";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { assertPrivateName } from "@babel/types";

@Controller("monitoring")

/*@Usage : To provide title of API in swagger */
@ApiTags("Monitoring")

export class MonitoringController {

     /*
    @Usage  : To load Monitoring service and other libraries
    @return : Object[monitoring] 
    */

   constructor(private readonly monitoring: MonitoringService) { }

   @Post()
   @postDecoraters("Monitoring created successfully", "Create a new Monitoring")

    /*
    @Usage                          : To create new Monitoring
    @Method                         : POST
    @Param extension                : string
    @Param call_uuid                : string
    @return success / error object  : { Monitoring created successfully / Monitoring already exist}
    */

   callMonitoringCreate(@Body() createMonitoringDto: CreateMonitoringDto) {
    return this.monitoring.callMonitoringCreate(createMonitoringDto);
}

   @Post("/barge")
   @postDecoraters("Barge created successfully", "Create a new Barge")

     /*
   @Usage                          : To create new Barge
   @Method                         : POST
   @Param extension                : string
   @Param call_uuid                : string
   @return success / error object  : { Barge created successfully / Barge already exist}
    */

   callBargeCreate(@Body() createMonitoringDto: CreateMonitoringDto) {
   return this.monitoring.callBargeCreate(createMonitoringDto);
}


  @Post("/whisper")
  @postDecoraters("Whisper created successfully", "Create a new Whisper")

  /*
  @Usage                          : To create new Monitoring
  @Method                         : POST
  @Param extension                : string
  @Param call_uuid                : string
  @return success / error object  : { Whisper created successfully / Whisper already exist}
  */

  callWhisperCreate(@Body() createMonitoringDto: CreateMonitoringDto) {
  return this.monitoring.callWhisperCreate(createMonitoringDto);
}
   
}



