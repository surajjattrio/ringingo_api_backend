import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateMessagingQueueDto } from "../dto/create-messaging-queue.dto";
import { MessagingQueueDocument, MessagingQueueSchema } from "../schema/messaging-queue.schema";
import { AssignExtensionDto } from "../dto/assign-extension.dto";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";

@Injectable()

export class MessagingQueueService {

  /*
  @Usage : To load Messaging queue schema and other libraries
  @Param @InjectModel: It will load Messaging queue schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[messaging-queue,commonFn,commonDbFn]
  */

  constructor( 
    @InjectModel( MessagingQueueSchema.name ) private readonly messaging_queue: Model<MessagingQueueDocument>,
    @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
  @Usage                 : First it will check whether given name exist or not , if not then new Messaging queue will be created else it will throw error
  @Param createMessagingQueueDto    : Request paramter that we set into dto
  @return Object         :  Success / Error
  */

  async create ( createMessagingQueueDto: CreateMessagingQueueDto ) {
    const { name, tenant_uuid, role } = createMessagingQueueDto;
    let where = [ { name }, { tenant_uuid } ];
    let logMessages = {
      logErrorMsg: "Messaging queue already exist \n",
      logSuccessMsg: "Messaging queue created successfully \n"
    };
    if (role == "manager") {
      //Fetch tenant of manager
      let tenantInfo;
      const lookupUuid = createMessagingQueueDto.manager_uuid || tenant_uuid;
      tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
      if (tenantInfo) {
        createMessagingQueueDto.tenant_uuid = tenantInfo.tenant_uuid;
        createMessagingQueueDto.manager_uuid = lookupUuid as string;
      } else {
        createMessagingQueueDto.manager_uuid = lookupUuid as string;
      }
    }
    return this.commonDbFn.findAndInsert(this.messaging_queue, where, createMessagingQueueDto, JSON.stringify(logMessages), "and");
  }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of Messaging queue with data
  */

  async findAll ( queryParams ) {
    let searchFields = [ "name" ];
    let populateFields = [ { path: "tenant", select: "tenant_name" },
    { path: "user", select: 'username' },
    ];
    return this.commonDbFn.findAllWithPagination( this.messaging_queue, queryParams, searchFields, populateFields, "", true, true );
  }

  /*
  @Usage          : To get single Messaging queue record based on uuid
  @Param uuid     : Search Messaging queue by uuid
  @return Object  : Result of Messaging queue
  */

  async findOne ( uuid: string ) {
    const user = await this.messaging_queue.findOne( { uuid } ).exec();
    if ( user == null ) {
      Logger.error( `Messaging queue not found by uuid : ${uuid} \n`, getMethod ); throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Messaging queue not found" } )
    }
    Logger.debug( `Messaging queue success fetched by uuid : ${uuid} \n` );
    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, user );
  }

  /*
  @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update name by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error
  */

  async update ( uuid: string, updateMessagingQueueDto: CreateMessagingQueueDto ) {
    const { name } = updateMessagingQueueDto;
    const getMessagingQueueData = await this.messaging_queue.findOne( { name } ).count().exec();

    if ( !getMessagingQueueData ) {
      const checkNameExist = await this.messaging_queue.find( { name } ).count().exec();
      if ( checkNameExist > 0 ) {
        Logger.error( "Name already exist \n", putMethod );
        return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Messaging queue already exist` );
      }
    }

    const messagingqueueUpdate = await this.messaging_queue.updateOne( { uuid }, updateMessagingQueueDto ).exec();

    if ( messagingqueueUpdate.matchedCount == 0 && messagingqueueUpdate.modifiedCount == 0 ) {
      Logger.error( `Messaging queue uuid was incorrect ${uuid} \n`, putMethod );
      throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Messaging queue id was incorrect" } )
    }
    Logger.debug( `Messaging queue updated successfully by uuid ${uuid} \n` );
    updateMessagingQueueDto.uuid = uuid;
    return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, "Messaging queue updated successfully" );
  }

  /*
  @Usage         : To update status of Messaging queue[Active/Inactive]
  @Param uuid    : uuid of Messaging queue
  @Param body    : Contains update body
  @return Object : Success / Error
  */

  async patch ( uuid: string, body ) {
    let logMessages = {
      logErrorMsg: `Messaging queue not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Messaging queue status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update( this.messaging_queue, uuid, body, JSON.stringify( logMessages ) );
  }

  /*
  @Usage         : Delete single or multiple Messaging queue using uuid
  @Param uuid    : To delete single Messaging queue pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error
  */

  async remove ( uuid: string ) {
    let logMessages = {
      logErrorMsg: `Messaging queue not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Messaging queue deleted successfully by uuid : ${uuid} \n`
    };
    return await this.commonDbFn.delete( this.messaging_queue, { uuid }, JSON.stringify( logMessages ) );
  }


  /*
  @Usage              : To search Messaging queue using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of Messaging queue with data
  */

  async advancedSearch ( searchParams ) {
    let populateFields = [ { path: "tenant", select: "tenant_name" },
    { path: "user", select: 'username' },
    ];
    return this.commonDbFn.advancedSearch( this.messaging_queue, searchParams, populateFields );
  }


  /*
   @Usage                 : First it will check whether given number exist or not , if not then Extension will be created else it will throw error
   @Param createTenantDto : Request paramter that we set into dto
   @return Object         :  Success / Error
  */

  /*
   @Usage         : To assign Extension to single or multiple tenant
   @Param uuid    : uuid of Extension
   @Param body    : Contains uuids of tenant
   @return Object : Success / Error
   */

  // async assignExtension ( assignExtensionDto: AssignExtensionDto ) {
  //   let { messaging_queue_extensions } = assignExtensionDto;
  //   console.log( messaging_queue_extensions );
  //   // let extensions = messaging_queue_extensions.split( "," ); // Split the string into an array
  //   // let where = { messaging_queue_extensions: { $in: extensions } };
  //   let logMessages = {
  //     logErrorMsg: `extensions not found \n`,
  //     logSuccessMsg: `extensions assigned successfully  \n`
  //   };
  //   return this.commonDbFn.findAndInsert( this.messaging_queue, assignExtensionDto, logMessages, "and" );
  // }
  async assignExtension ( assignExtensionDto: AssignExtensionDto ) {
    try {
      // Construct MongoDB query based on messaging_queue_extensions
      let { messaging_queue_extensions } = assignExtensionDto;
      let extensions = messaging_queue_extensions.split( "," ); // Split the string into an array
      let where = { messaging_queue_extensions: { $in: extensions } };

      // Log the constructed query for debugging
      console.log( 'MongoDB query:', where );
      console.log( 'AssignExtensionDto:', assignExtensionDto );

      // Construct the JSON object with messaging_queue_extensions property
      let json = {
        messaging_queue_extensions: extensions
      };

      // Pass the constructed query to findAndInsert
      let logMessages = {
        logErrorMsg: `extensions not found \n`,
        logSuccessMsg: `extensions assigned successfully  \n`
      };

      // Log the stringified JSON for debugging
      console.log( 'Stringified JSON:', json );

      let jsonString = JSON.stringify( json );
      console.log( 'Stringified JSON:', jsonString );

      try {
        JSON.parse( jsonString );
      } catch ( error ) {
        console.error( 'Error parsing JSON string:', error );
      }


      return this.commonDbFn.findAndInsert( this.messaging_queue, where, jsonString, logMessages, "and" );
    } catch ( error ) {
      // Handle any errors that occur during the process
      console.error( 'Error in assignExtension:', error );
      // Optionally, you can return an error response or rethrow the error
      throw error;
    }
  }



  // updateDidAndAdd ( admin_did_uuid, uuid ) {
  //   let self = this;
  //   let result, didData, didArray = [], obj, allData;
  //   return new Promise( async ( resolve, reject ) => {
  //     try {
  //       allData = admin_did_uuid.map( async ( data ) => {
  //         result = await self.admin_did.updateOne( { uuid: data }, { assign_tenant_uuid: uuid } ).exec();
  //         didData = await self.admin_did.findOne( { uuid: data }, { _id: 0 } ).exec();
  //         obj = {
  //           number: didData.number,
  //           tenant_uuid: didData.assign_tenant_uuid,
  //           user_uuid: "",
  //           codec: didData.codec,
  //           timeout: didData.timeout,
  //           status: didData.status
  //         }
  //         didArray.push( obj );
  //       } );
  //       await Promise.all( allData );
  //       result = await this.did.insertMany( didArray, { ordered: false } );
  //     } catch ( error ) {
  //       console.log( "error", error.message );
  //     }
  //     resolve( result );
  //   } )
  // }


}

