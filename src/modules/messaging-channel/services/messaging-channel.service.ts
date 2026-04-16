import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateMessagingChannelDto } from "../dto/create-messaging-channel.dto";
import { MessagingChannelDocument, MessagingChannelSchema } from "../schema/messaging-channel.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";

@Injectable()

export class MessagingChannelService {

  /*
  @Usage : To load messaging channel schema and other libraries
  @Param @InjectModel: It will load messaging channel schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[messaging-channel,commonFn,commonDbFn]
  */

  constructor(
    @InjectModel( MessagingChannelSchema.name ) private readonly messaging_channel: Model<MessagingChannelDocument>,
    @InjectModel( ManagerSchema.name ) private readonly manager: Model<ManagerDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
  @Usage                 : First it will check whether given name exist or not , if not then new messaging channel will be created else it will throw error
  @Param createMessagingChannelDto    : Request paramter that we set into dto
  @return Object         :  Success / Error
  */

  async create ( createMessagingChannelDto: CreateMessagingChannelDto ) {
    const { name, tenant_uuid, role } = createMessagingChannelDto;
    let where = [ { name }, { tenant_uuid } ];
    let logMessages = {
      logErrorMsg: "Messaging channel already exist \n",
      logSuccessMsg: "Messaging channel created successfully \n"
    };

    if (role == "manager") {
      //Fetch tenant of manager
      let tenantInfo;
      const lookupUuid = createMessagingChannelDto.manager_uuid || tenant_uuid;
      tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
      if (tenantInfo) {
        createMessagingChannelDto.tenant_uuid = tenantInfo.tenant_uuid;
        createMessagingChannelDto.manager_uuid = lookupUuid as string;
      } else {
        createMessagingChannelDto.manager_uuid = lookupUuid as string;
      }
    }

    return this.commonDbFn.findAndInsert( this.messaging_channel, where, createMessagingChannelDto, JSON.stringify( logMessages ), "and" );
  }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of messaging channel with data
  */

  async findAll ( queryParams ) {
    let searchFields = [ "name" ];
    let populateFields = [ { path: "tenant", select: "tenant_name" },
    { path: "user", select: 'username' },
    ];
    return this.commonDbFn.findAllWithPagination( this.messaging_channel, queryParams, searchFields, populateFields, "", true, true );
  }

  /*
  @Usage          : To get single messaging channel record based on uuid
  @Param uuid     : Search messaging channel by uuid
  @return Object  : Result of messaging channel
  */

  async findOne ( uuid: string ) {
    const user = await this.messaging_channel.findOne( { uuid } ).exec();
    if ( user == null ) {
      Logger.error( `Messaging Channel not found by uuid : ${uuid} \n`, getMethod ); throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Messaging Channel not found" } )
    }
    Logger.debug( `Messaging Channel success fetched by uuid : ${uuid} \n` );
    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, user );
  }

  /*
  @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update name by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error
  */

  async update ( uuid: string, updateMessagingChannelDto: CreateMessagingChannelDto ) {
    const { name } = updateMessagingChannelDto;
    const getMessagingChannelData = await this.messaging_channel.findOne( { name } ).count().exec();

    if ( !getMessagingChannelData ) {
      const checkNameExist = await this.messaging_channel.find( { name } ).count().exec();
      if ( checkNameExist > 0 ) {
        Logger.error( "Name already exist \n", putMethod );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Messaging channel already exist` );
      }
    }

    const messagingchannelUpdate = await this.messaging_channel.updateOne( { uuid }, updateMessagingChannelDto ).exec();

    if ( messagingchannelUpdate.matchedCount == 0 && messagingchannelUpdate.modifiedCount == 0 ) {
      Logger.error( `Messaging channel uuid was incorrect ${uuid} \n`, putMethod );
      throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Messaging channel id was incorrect" } )
    }
    Logger.debug( `Messaging channel updated successfully by uuid ${uuid} \n` );
    updateMessagingChannelDto.uuid = uuid;
    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Messaging channel updated successfully" );
  }

  /*
  @Usage         : To update status of messaging channel[Active/Inactive]
  @Param uuid    : uuid of messaging channel
  @Param body    : Contains update body
  @return Object : Success / Error
  */

  async patch ( uuid: string, body ) {
    let logMessages = {
      logErrorMsg: `Messaging channel not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Messaging channel status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update( this.messaging_channel, uuid, body, JSON.stringify( logMessages ) );
  }

  /*
  @Usage         : Delete single or multiple messaging channel using uuid
  @Param uuid    : To delete single messaging channel pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error
  */

  async remove ( uuid: string ) {
    let logMessages = {
      logErrorMsg: `Messaging channel not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Messaging channel deleted successfully by uuid : ${uuid} \n`
    };
    return await this.commonDbFn.delete( this.messaging_channel, { uuid }, JSON.stringify( logMessages ) );
  }


  /*
  @Usage              : To search messaging channel using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of messaging channel with data
  */

  async advancedSearch ( searchParams ) {
    let populateFields = [ { path: "tenant", select: "tenant_name" },
    { path: "user", select: 'username' },
    ];
    return this.commonDbFn.advancedSearch( this.messaging_channel, searchParams, populateFields );
  }

  async omni_list ( queryParam ) {
    const { tenant_uuid } = queryParam;
    const messaging_channel_whatsapp = await this.messaging_channel.find( { tenant_uuid: tenant_uuid } ).exec();
    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, messaging_channel_whatsapp );
  }

}

