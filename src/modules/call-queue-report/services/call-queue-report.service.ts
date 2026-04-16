import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CdrsDocument, CdrsSchema } from "../../cdrs/schema/cdrs.schema";

@Injectable()
export class CallQueueReportService {

     /*
     @Usage              : To load cdrs schema and other libraries
     @Param @InjectModel : It will load cdrs schema
     @Param commonDbFn   : To use commonly created mongoDB functions
     @return Object      : [cdrs,commonDbFn]
     */

     constructor(
          @InjectModel( CdrsSchema.name ) private readonly cdrs: Model<CdrsDocument>,
          private readonly commonDbFn: CommonDBFunctions,
          private readonly commonFn: CommonFunctions,

     ) { }

     /*
     @Usage              : To search cdrs using advanced search
     @Param searchParams : Contains search paramaters
     @return Object      : Array of an object with total count of cdrs with data
     */


     async findAll ( queryParams ) {
          console.log( queryParams );
          let populateFields = [ { path: "user", select: 'user_name username' }, { path: 'ring_group', select: 'name' }, { path: 'call_queue', select: 'name' }, { path: 'ivr', select: 'name' }, { path: 'time_condition', select: 'name' } ];
          let searchFields = [ "callstart", "caller_id_number", "destination_number" ];
          
          // Add callstate parameter for proper filtering
          queryParams.callstate = "call-queue";
          
          return this.commonDbFn.findAllWithPagination( this.cdrs, queryParams, searchFields, populateFields );
     }

     async advancedSearch ( searchParams ) {
          console.log( searchParams )
          let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where: any = [], key, obj, result, count = 0;

          //Check Role type
          where.push( { call_state: "call-queue" } )
          let { role, tenant_uuid, uuid } = searchParams;
          if ( role == "tenant" ) {
               where.push( { tenant_uuid: tenant_uuid } );
          } else if ( role == "agent" ) {
               where.push( { user_uuid: uuid } );
          }
          //Delete unnecessary details from request
          // if (searchParams.role == "master_admin" || searchParams.role == "tenant" || searchParams.role == "agent") {
          delete searchParams.tenant_uuid;
          delete searchParams.role;
          delete searchParams.domain;
          delete searchParams.uuid;
          // }

          let populateFields = [ { path: "user", select: 'user_name username' }, { path: 'ring_group', select: 'name' }, { path: 'call_queue', select: 'name' }, { path: 'ivr', select: 'name' }, { path: 'time_condition', select: 'name' } ];
          if ( searchParams.callstart != undefined && searchParams.callend != undefined ) {
               obj = { "callstart": { "$gte": `${searchParams.callstart}`, "$lte": `${searchParams.callend}` } };
               where.push( obj );
          }
          console.log( where )


          //Pagination
          const perPage = Number( searchParams.limit ) || 10;
          const currentPage = Number( searchParams.page ) || 1;
          const skip = perPage * ( currentPage - 1 );
          //End

          delete searchParams.callstart;
          delete searchParams.callend;


          objectKeys = Object.keys( searchParams );
          objectValues = Object.values( searchParams );
          len = objectKeys.length;

          /*if (len == 0) {
              return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
          }*/

          for ( i = 0; i < len; i++ ) {
               filedName = objectKeys[ i ];
               filedValue = objectValues[ i ];
               if ( filedName.includes( "|" ) ) {
                    key = filedName.split( "|" )[ 0 ].trim();
                    searchFlag = parseInt( filedName.split( "|" )[ 1 ].trim() );
               } else {
                    key = filedName;
                    searchFlag = -1;
               }

               switch ( searchFlag ) {
                    case 1: //Begins with
                         obj = { [ key ]: { $regex: `^${filedValue}`, $options: "i" } };
                         where.push( obj );
                         break;
                    case 2: // Contains
                         obj = { [ key ]: { $regex: filedValue, $options: "i" } };
                         where.push( obj );
                         break;
                    case 3: // Does not contains
                         obj = { [ key ]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
                         where.push( obj );
                         break;
                    case 4: // Is equal to
                         obj = { [ key ]: filedValue };
                         where.push( obj );
                         break;
                    case 5: // In not equal to
                         obj = { [ key ]: { $ne: filedValue } };
                         where.push( obj );
                         break;
                    case 6: //Ends with
                         obj = { [ key ]: { $regex: `${filedValue}$`, $options: "i" } };
                         where.push( obj );
                         break;

                    default: //Begins with
                         obj = { [ key ]: { $regex: `^${filedValue}`, $options: "i" } };
                         where.push( obj );
                         break;
               }
          }

          if ( where.length == 0 ) {
               where = [ {} ];
          }
          result = await this.cdrs.find( { $and: where } ).limit( perPage ).skip( skip ).sort( { _id: -1 } ).populate( populateFields ).exec();

          if ( result.length > 0 ) {
               count = await this.cdrs.find( { $and: where } ).count().exec();
               Logger.debug( count, "Search result count" );
               return this.commonDbFn.sendResponseWithCount( HttpStatus.OK, result, count )
          } else {
               Logger.error( count, "Search result count" );
               return this.commonDbFn.sendResponseWithCount( HttpStatus.NOT_FOUND, result, count )
          }
     }

}