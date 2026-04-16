import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { LeadreportDocument, LeadreportSchema } from "../schema/lead-report.schema";
import { DispositionDocument, DispositionSchema } from "src/modules/disposition/schema/disposition.schema";
import { LeadManagementDocument, LeadManagementSchema } from "src/modules/lead-management/schema/lead-management.schema";


@Injectable()

export class LeadreportService {
  commonFn: any;

  /*
  @Usage : To load voicemail schema and other libraries
  @Param @InjectModel: It will load voicemail schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[voicemail,commonFn,commonDbFn]
  */


  constructor(
    @InjectModel( LeadreportSchema.name ) private readonly lead_report: Model<LeadreportDocument>,
    @InjectModel( TenantSchema.name ) private readonly tenant: Model<TenantDocument>,
    @InjectModel( ExtensionSchema.name ) private readonly extensions: Model<ExtensionDocument>,
    @InjectModel( UserSchema.name ) private readonly user: Model<UserDocument>,
    @InjectModel( DispositionSchema.name ) private readonly disposition: Model<DispositionDocument>,
    @InjectModel(LeadManagementSchema.name) private readonly lead_management: Model<LeadManagementDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
      @Usage             : To get records based on limit,page,search
      @Param queryParams : It will contain page(default=1),limit(default=10),search
      @return Object     : Array of an object with total count of cdrs with data
      */

  async findAll ( queryParams ) {
    let populateFields = [ { path: "user", select: "username" }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username' }, { path: "lead_details", select: 'first_name last_name uuid -_id' }, { path: "disposition", select: "name code -_id" } ];
    let searchFields = [ "lead" ];
    return this.commonDbFn.findAllWithPagination( this.lead_report, queryParams, searchFields, populateFields );
  }


  // async leadreport ( lead_group_uuid: string ) {
  //   let searchFields = [ "lead_group_uuid" ];
  //   let populateFields = [ { path: "disposition", select: "name code -_id" } ];
  //   const getLeadreportData = await this.lead_report.find( { lead_group_uuid } ).populate( populateFields ).exec();
  //   console.log( getLeadreportData );
  //   return this.commonDbFn.sendResponseWithMessage( HttpStatus.OK, getLeadreportData );
  // }


  // async leadreport ( lead_group_uuid: string ) {
  //   let populateFields = [ { path: "disposition", select: "name code -_id" } ];
  //   const getLeadreportData: any = await this.lead_report
  //     .find( { lead_group_uuid } )
  //     .populate( populateFields )
  //     .exec();

  //   const dispositionData: any = await this.disposition.find().exec();
  //   // console.log( dispositionData );

  //   // Create a mapping between disposition_uuid and desired keys
  //   const uuidToKeyMap: Record<string, string> = {};
  //   const uuidToCodeMap: Record<string, string> = {}; // New mapping for codes
  //   dispositionData.forEach( ( item: any ) => {
  //     const { disposition_uuid, name, code } = item;
  //     uuidToKeyMap[ disposition_uuid ] = name;
  //     uuidToCodeMap[ disposition_uuid ] = code; // Store codes for each disposition_uuid
  //   } );

  //   // Create a result object to store the formatted data
  //   const result: { [ key: string ]: Record<string, any> } = {};

  //   // Loop through the data and format it as expected
  //   getLeadreportData.forEach( ( item ) => {
  //     const { disposition_uuid, called_count, count } = item;

  //     // Use the desired key based on the mapping
  //     const key = uuidToKeyMap[ disposition_uuid ];

  //     if ( !result[ key ] ) {
  //       result[ key ] = {
  //         code: uuidToCodeMap[ disposition_uuid ],
  //         disposition_name: key, // Include disposition_name property
  //       };
  //     }

  //     // Format the data as desired
  //     result[ key ][ `${called_count}` ] = `${count}`;
  //   } );

  //   // Log the formatted data
  //   for ( const key in result ) {
  //     console.log( `Key: "${key}"` );
  //     console.log( result[ key ] );
  //   }

  //   // You can return the result object if needed
  //   return result;
  // }

  //latest code
  // async leadreport ( lead_group_uuid: string ) {
  //   let populateFields = [ { path: "disposition", select: "name code -_id" } ];
  //   const getLeadreportData: any = await this.lead_report
  //     .find( { lead_group_uuid } )
  //     .populate( populateFields )
  //     .exec();

  //   const dispositionData: any = await this.disposition.find().exec();
  //   // console.log(dispositionData);

  //   // Create a mapping between disposition_uuid and desired keys
  //   const uuidToKeyMap: Record<string, string> = {};
  //   const uuidToCodeMap: Record<string, string> = {}; // New mapping for codes
  //   dispositionData.forEach( ( item: any ) => {
  //     const { disposition_uuid, name, code } = item;
  //     uuidToKeyMap[ disposition_uuid ] = name;
  //     uuidToCodeMap[ disposition_uuid ] = code; // Store codes for each disposition_uuid
  //   } );

  //   // Create an array to store the formatted data
  //   const result: any[] = [];

  //   // Loop through the data and format it as desired
  //   getLeadreportData.forEach( ( item ) => {
  //     const { disposition_uuid, called_count, count } = item;

  //     // Use the desired key based on the mapping
  //     const key = uuidToKeyMap[ disposition_uuid ];

  //     // Create a new object for each entry
  //     const entry: any = {
  //       code: uuidToCodeMap[ disposition_uuid ],
  //       disposition_name: key,
  //     };

  //     // Format the data as desired
  //     entry[ `${called_count}` ] = `${count}`;

  //     // Push the entry into the result array
  //     result.push( entry );
  //   } );

  //   // Log the formatted data
  //   for ( const entry of result ) {
  //     console.log( entry );
  //   }

  //   // You can return the result array if needed
  //   return result;
  // }

  async leadreport ( lead_group_uuid: string , queryParams ) {
    const { tenant_uuid } = queryParams;
    let populateFields = [ { path: "disposition", select: "name code -_id" } ];
    const getLeadreportData: any = await this.lead_report
      .find( { lead_group_uuid } )
      .populate( populateFields )
      .exec();

    const dispositionData: any = await this.disposition.find().exec();
    let newDispositionUUID;
    // Create a mapping between disposition_uuid and desired keys
    const uuidToKeyMap: Record<string, { name: string; code: string }> = {};
    dispositionData.forEach( ( item: any ) => {
      const { disposition_uuid, name, code } = item;
      /*if( newDispositionUUID == undefined && item.tenant_uuid == tenant_uuid && (code == "New" || code == "NEW") ){
       newDispositionUUID = disposition_uuid
      }*/
      if(code == "NEW") newDispositionUUID = disposition_uuid;

      uuidToKeyMap[ disposition_uuid ] = { name, code };
    } );

    // Array to store the formatted data
    const result: any[] = [];

    // Loop through the data and format it as expected
    getLeadreportData.forEach( ( item ) => {
      const { disposition_uuid, called_count, count } = item;

      // Use the desired key based on the mapping
      const keyData = uuidToKeyMap[ disposition_uuid ];

      // Check if the key already exists in the result array
      const existingEntry = result.find( ( entry ) => entry.disposition_name === keyData?.name );

      if ( existingEntry ) {
        // Update the existing entry with the new count
        existingEntry[ `${called_count}` ] = `${count}`;
      } else {
        // Create a new entry
        const entry: any = {
          code: keyData?.code,
          disposition_name: keyData?.name,
          [ `${called_count}` ]: `${count}`,
	  disposition_uuid
        };

        // Push the new entry into the result array
        result.push( entry );
      }
    } );

    let getNewDispositionCount = await this.lead_management.find({tenant_uuid,lead_group_uuid,lead_status : newDispositionUUID}).count();
    result.push({ code : "NEW" , disposition_name : "NEW" , disposition_count : getNewDispositionCount });
    // Create the response object with status code and data
    const response: { statusCode: number; data: any[] } = {
      statusCode: 200,
      data: result,
    };
     
    // Get count's of disposition
    const dipositionResultWithReportData = await this.getDispositionCount(tenant_uuid, result , lead_group_uuid);

    // Return the response object
    //let statusCode = dipositionResultWithReportData?.length ? HttpStatus.OK : HttpStatus.NOT_FOUND;
   // return this.commonDbFn.sendResponseWithMessage(statusCode,dipositionResultWithReportData);
    return response;
  }

  async advancedSearch ( searchParams ) {
    let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where: any = [], key, obj, result, count = 0;

    //Check Role type
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

    let populateFields = [ { path: "user", select: "username" }, { path: "extension", select: 'username' }, { path: "tenant", select: 'tenant_name username' }, ];
    if ( searchParams.callstart != undefined && searchParams.callend != undefined ) {
      obj = { "callstart": { "$gte": `${searchParams.callstart}`, "$lte": `${searchParams.callend}` } };
      where.push( obj );
    }

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
    result = await this.lead_report.find( { $and: where } ).limit( perPage ).skip( skip ).sort( { _id: -1 } ).exec();

    if ( result.length > 0 ) {
      count = await this.lead_report.find( { $and: where } ).count().exec();
      Logger.debug( count, "Search result count" );
      return this.commonDbFn.sendResponseWithCount( HttpStatus.OK, result, count )
    } else {
      Logger.error( count, "Search result count" );
      return this.commonDbFn.sendResponseWithCount( HttpStatus.NOT_FOUND, result, count )
    }
  }

  /*
  @Usage                : To get disposition count
  @Param tenant_uuid    : uuid of tenant
  @Param mainReportData : Report Data
  @return Object        : Array of an object with total count of disposition's with data
  */

  async getDispositionCount(tenant_uuid, mainReportData , lead_group_uuid) {
    const result = await this.lead_management.aggregate([
      {
        $match: { tenant_uuid , lead_group_uuid }
      },
      {
          $lookup: { from: "disposition", localField: "lead_status", foreignField: "disposition_uuid", as: "disposition" }
      },
      {
        $group: {
          _id: {
            lead_status: "$lead_status",
          },
	 // disposition_name: { "$first": "$disposition.name" },
	 // disposition_code: { "$first": "$disposition.code" },
	  //disposition_uuid : { "$first": "$disposition.disposition_uuid" },
	  count: { $sum: 1 },
        }
      },
    ]).exec();
    return;
    let finalData = [], filterData;
   //if (mainReportData.length) {
      result.map((data) => {
        filterData = mainReportData.filter(item => item.disposition_uuid == data._id.lead_status); //Compare disposition uuid
        if (filterData.length) {
	   finalData.push({ ...mainReportData[0], disposition_count: filterData[0].count}) 
        }else{
	   finalData.push({ code : data.disposition_code[0] , disposition_name : data.disposition_name[0] , disposition_uuid : data.disposition_uuid[0] , disposition_count: data.count})
	}
      });
  /* }else{
      finalData.push({ code : "NEW" , disposition_name : "NEW" , disposition_count: result[0]?.count != undefined ? result[0]?.count : 0})
   }*/
    return finalData;
  }

}

