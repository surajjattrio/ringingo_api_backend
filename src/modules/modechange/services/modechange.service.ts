import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateModechangeDto } from "../dto/create-modechange.dto";
import { ModechangeDocument, ModechangeSchema } from "../schema/modechange.schema";
import { ExtensionDocument, ExtensionSchema } from "../../extension/schema/extension.schema";
import { ConferenceDocument, ConferenceSchema } from "../../conference/schema/conference.schema";
import * as fs from 'fs';


@Injectable()

export class ModechangeService {
  commonFn: any;

  /*
  @Usage : To load modechange schema and other libraries
  @Param @InjectModel: It will load modechange schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[modechange,commonFn,commonDbFn]
  */

  constructor( @InjectModel( ModechangeSchema.name ) private readonly modechange: Model<ModechangeDocument>,
    @InjectModel( ExtensionSchema.name ) private readonly extensions: Model<ExtensionDocument>,
    @InjectModel( ConferenceSchema.name ) private readonly conference: Model<ConferenceDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }

  /*
  @Usage         : To update status of modechange[Active/Inactive]
  @Param uuid    : uuid of modechange
  @Param body    : Contains update body
  @return Object : Success / Error
  */

  // async patch ( uuid: string, body ) {
  //   let logMessages = {
  //     logErrorMsg: `Modechange not found by uuid : ${uuid} \n`,
  //     logSuccessMsg: `Modechange status updated successfully by uuid : ${uuid} \n`
  //   }
  //   return this.commonDbFn.update( this.modechange, uuid, body, JSON.stringify( logMessages ) );
  // }

  async patch ( user_uuid: string, body: any ): Promise<string> {
    // Find the modechange document with the specified user_uuid
    const existingModechange = await this.modechange.findOne( { user_uuid } );

    if ( !existingModechange ) {
      // If modechange with the specified user_uuid is not found, throw NotFoundException
      throw new NotFoundException( `Modechange not found by user_uuid: ${user_uuid}` );
    }

    // Update the status of the existing modechange
    existingModechange.status = body.status; // Assuming 'status' is the field to be updated

    // Save the updated modechange document
    await existingModechange.save();

    // Log success message
    const logMessages = {
      logErrorMsg: `Modechange status not updated. Modechange not found by user_uuid: ${user_uuid}\n`,
      logSuccessMsg: `Modechange status updated successfully by user_uuid: ${user_uuid}\n`
    };

    return JSON.stringify( logMessages ); // Return success message
  }

}

