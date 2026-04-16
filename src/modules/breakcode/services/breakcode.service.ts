import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateBreakcodeDto } from "../dto/create-breakcode.dto";
import { BreakcodeDocument, BreakcodeSchema } from "../schema/breakcode.schema";
import { ExtensionDocument, ExtensionSchema } from "../../extension/schema/extension.schema";
import { ConferenceDocument, ConferenceSchema } from "../../conference/schema/conference.schema";
import { AgentLoginLogoutDocument, AgentLoginLogoutSchema } from "src/modules/call-center/schema/agent-login-logout.schema";
import { AgentLoginLogoutReportDto } from "src/modules/call-center/dto/agent-login-logout-report.dto";
import { CommonFunctions } from "src/modules/common/common_functions";


@Injectable()

export class BreakcodeService {

  /*
  @Usage : To load breakcode schema and other libraries
  @Param @InjectModel: It will load breakcode schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[breakcode,commonFn,commonDbFn]
  */

  constructor( @InjectModel( BreakcodeSchema.name ) private readonly breakcode: Model<BreakcodeDocument>,
    @InjectModel( ExtensionSchema.name ) private readonly extensions: Model<ExtensionDocument>,
    @InjectModel( ConferenceSchema.name ) private readonly conference: Model<ConferenceDocument>,
    @InjectModel( AgentLoginLogoutSchema.name ) private readonly agent_login_logout_report: Model<AgentLoginLogoutDocument>,
    private readonly commonDbFn: CommonDBFunctions,
    private readonly commonFn: CommonFunctions,
  ) { }


  /*
  @Usage                 : First it will check whether given name exist or not , if not then new breakcode will be created else it will throw error
  @Param createBreakcodeDto    : Request paramter that we set into dto
  @return Object         :  Success / Error
  */

  async create ( createBreakcodeDto: CreateBreakcodeDto ) {
    const { break_code, tenant_uuid } = createBreakcodeDto;
    let where = [ { break_code }, { tenant_uuid } ];
    let logMessages = {
      logErrorMsg: "Break Code already exist \n",
      logSuccessMsg: "Break Code created successfully \n"
    }
    return this.commonDbFn.findAndInsert( this.breakcode, where, createBreakcodeDto, JSON.stringify( logMessages ), "and" );
  }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of breakcode with data
  */

  async findAll ( queryParams ) {
    let searchFields = [ "name", "description" ];
    let populateFields = [ { path: "tenant", select: "tenant_name" },
    ];
    if ( !queryParams.limit ) {
      queryParams.list = "all";
    }
    return this.commonDbFn.findAllWithPagination( this.breakcode, queryParams, searchFields, populateFields, "", true, true );
  }

  /*
  @Usage          : To get single breakcode record based on uuid
  @Param uuid     : Search breakcode by uuid
  @return Object  : Result of breakcode
  */

  async findOne ( uuid: string ) {
    const user = await this.breakcode.findOne( { uuid } ).exec();
    if ( user == null ) {
      Logger.error( `Break code not found by uuid : ${uuid} \n`, getMethod ); throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Breakcode not found" } )
    }
    Logger.debug( `Break code success fetched by uuid : ${uuid} \n` );
    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, user );
  }

  /*
  @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update did by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error
  */

  async update ( uuid: string, updateBreakcodeDto: CreateBreakcodeDto ) {
    const { break_code, tenant_uuid } = updateBreakcodeDto;
    const getBreakcodeData = await this.breakcode.findOne( { uuid } ).exec();

    if ( getBreakcodeData?.break_code != break_code ) {
      const checkNameExist = await this.breakcode.find( { $and: [ { break_code, tenant_uuid } ] } ).count().exec();
      if ( checkNameExist > 0 ) {
        Logger.error( "Break Code already exist \n", putMethod );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Break Code already exist` );
      }
    }

    const breakcodeUpdate = await this.breakcode.updateOne( { uuid }, updateBreakcodeDto ).exec();

    if ( breakcodeUpdate.matchedCount == 0 && breakcodeUpdate.modifiedCount == 0 ) {
      Logger.error( `Breakcode uuid was incorrect ${uuid} \n`, putMethod );
      throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Break Code id was incorrect" } )
    }
    Logger.debug( `BreakCode updated successfully by uuid ${uuid} \n` );
    updateBreakcodeDto.uuid = uuid;
    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Break Code updated successfully" );
  }

  /*
  @Usage         : To update status of breakcode[Active/Inactive]
  @Param uuid    : uuid of breakcode
  @Param body    : Contains update body
  @return Object : Success / Error
  */

  async patch ( uuid: string, body ) {
    let logMessages = {
      logErrorMsg: `Break Code not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Break Code status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update( this.breakcode, uuid, body, JSON.stringify( logMessages ) );
  }

  /*
  @Usage         : Delete single or multiple breakcode using uuid
  @Param uuid    : To delete single breakcode pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error
  */

  async remove ( uuid: string ) {
    let logMessages = {
      logErrorMsg: `Break Code not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Break Code deleted successfully by uuid : ${uuid} \n`
    };
    return this.commonDbFn.delete( this.breakcode, { uuid }, JSON.stringify( logMessages ) );
  }

  /*
  @Usage              : To search breakcode using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of breakcode with data
  */

  async advancedSearch ( searchParams ) {
    let populateFields = [ { path: "tenant", select: "tenant_name" }
    ];
    return this.commonDbFn.advancedSearch( this.breakcode, searchParams, populateFields );
  }

  /*
@Usage                 : user break in
@Param agentLoginLogoutReportDto    : Request paramter that we set into dto
@return Object         :  Success / Error
*/

  async inbreak ( agentLoginLogoutReportDto: AgentLoginLogoutReportDto ) {
    try {
      let logMessages = {
        logErrorMsg: `Break in already exist \n`,
        logSuccessMsg: `Break in entry added in agent login logout report \n`
      }
      const { breakcode_uuid, uuid } = agentLoginLogoutReportDto;
      agentLoginLogoutReportDto.agent_uuid = uuid;
      agentLoginLogoutReportDto.date = await this.commonFn.getTodayDate();
      let utCDate = new Date().toISOString();
      agentLoginLogoutReportDto.date_time = utCDate;
      console.log( agentLoginLogoutReportDto );
      console.log( "agentLoginLogoutReportDto==============" );

      agentLoginLogoutReportDto.breakcode_uuid = breakcode_uuid;
      let response = await this.commonDbFn.insert( this.agent_login_logout_report, agentLoginLogoutReportDto, JSON.stringify( logMessages ) );
      if ( response.statusCode == 201 ) {
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, `Break in added` )
      }

    } catch ( error ) {
      Logger.error( `Error in adding entry in agent login logout report`, error.message );
    }
  }

}

