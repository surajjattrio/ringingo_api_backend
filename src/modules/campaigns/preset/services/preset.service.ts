import { HttpStatus, Injectable, Logger,NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod,getMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { PresetDocument, PresetSchema } from "../schema/preset.schema";
import { PresetDto } from "../dto/preset.dto";

@Injectable()

export class PresetService {

     /*
     @Usage              : To load dnc schema and other libraries
     @Param @InjectModel : It will load dnc schema
     @Param commonDbFn   : To use commonly created mongoDB functions
     @return Object      : [dnc,commonDbFn]
     */

     constructor(
          @InjectModel( PresetSchema.name ) private readonly preset: Model<PresetDocument>,
          private readonly commonDbFn: CommonDBFunctions,
     ) { }

     /*
     @Usage                     : First it will check whether given name exist or not , if not then new dnc will be created else it will throw error
     @Param createDncDto : Request paramter that we set into dto
     @return Object             : Success / Error
     */

     async create ( presetDto: PresetDto ) {
          const { number, campaign_uuid, name } = presetDto;
          let where = [ { number, campaign_uuid, name } ];
          let logMessages = {
               logErrorMsg: "Preset already exist \n",
               logSuccessMsg: "Preset created successfully \n"
          }
          return this.commonDbFn.findAndInsert( this.preset, where, presetDto, JSON.stringify( logMessages ), "and" );
     }

     /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of preset with data
    */

     async findAll ( queryParams ) {
          let searchFields = [ "number", "name" ];
          let { campaign_uuid, limit } = queryParams
          // let populateFields = [{ path: "tenant", select: 'username tenant_name'},{ path: "campaign", select: 'name' }];
          let response: any = await this.preset.find( { campaign_uuid: campaign_uuid } ).limit( limit ).exec();
          let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
          return this.commonDbFn.sendResponseWithCount( response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND, response, response.length );
     }

     /*
    @Usage          : To get single user record based on uuid
    @Param uuid     : Search user by uuid
    @return Object  : Result of user
    */

    async findOne ( uuid: string ) {
     const user = await this.preset.findOne( { uuid } ).exec();
     if ( user == null ) {
         Logger.error( `Preset not found by uuid : ${uuid} \n`, getMethod ); throw new NotFoundException( { statusCode: HttpStatus.NOT_FOUND, message: "Preset not found" } )
     }
     Logger.debug( `Preset success fetched by uuid : ${uuid} \n` );
     return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, user );
 }



     async update ( uuid: string, presetDto: PresetDto ) {
          const { number, tenant_uuid, campaign_uuid } = presetDto;
          const getPreset = await this.preset.findOne( { uuid } ).exec();
          if ( getPreset?.number != number ) {
               const checkPresetExist = await this.preset.find( { $and: [ { number }, { campaign_uuid } ] } ).count().exec();
               if ( checkPresetExist > 0 ) {
                    Logger.error( "Preset already exist \n", putMethod );
                    return this.commonDbFn.sendResponseWithMessage( HttpStatus.CONFLICT, `Preset already exist` );
               }
          }

          let logMessages = {
               logErrorMsg: `Preset not found by uuid : ${uuid} \n`,
               logSuccessMsg: `Preset updated successfully by uuid : ${uuid} \n`
          }
          return this.commonDbFn.update( this.preset, uuid, presetDto, JSON.stringify( logMessages ) );
     }

     /*
    @Usage         : Delete single or multiple Preset using uuid
    @Param uuid    : To delete single Preset pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error
    */

     async remove ( uuid: string ) {
          let logMessages = {
               logErrorMsg: `Preset not exist by uuid : ${uuid} \n`,
               logSuccessMsg: `Preset deleted successfully by uuid : ${uuid} \n`
          }
          return this.commonDbFn.delete( this.preset, { uuid }, JSON.stringify( logMessages ) );
     }

}

