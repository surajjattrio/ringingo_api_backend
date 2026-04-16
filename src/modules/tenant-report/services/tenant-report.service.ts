import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { TenantDocument, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { ExtensionDocument, ExtensionSchema } from "src/modules/extension/schema/extension.schema";
import { UserDocument, UserSchema } from "src/modules/user/schema/user.schema";
import { TenantreportDocument, TenantreportSchema } from "../schema/tenant-report.schema";
import { TenantreportsearchDcoument,TenantSummary, tenantreportsearchSummary } from "../schema/tenantreportsearch.schema";
import { CdrsDocument, CdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { CronExpression } from "@nestjs/schedule";
import { CronJob } from "cron";

@Injectable()

export class TenantreportService {
  commonFn: any;
    
  /*
  @Usage : To load voicemail schema and other libraries
  @Param @InjectModel: It will load voicemail schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[voicemail,commonFn,commonDbFn] 
  */
 

  constructor(
  @InjectModel(TenantreportSchema.name) private readonly tenant_report: Model<TenantreportDocument>,
  @InjectModel(TenantSchema.name) private readonly tenant: Model<TenantDocument>,
  @InjectModel(ExtensionSchema.name) private readonly extensions: Model<ExtensionDocument>,
  @InjectModel(UserSchema.name) private readonly user: Model<UserDocument>,
  @InjectModel(TenantSummary.name) private readonly tenant_report_search: Model<TenantreportsearchDcoument>,
  @InjectModel(CdrsSchema.name) private readonly cdrs: Model<CdrsDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


 /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of tenant with data 
    */

async findAll(queryParams) {
 let populateFields = [{ path: "tenant", select: 'tenant_name username' }];
 let searchFields = ["date","tenant_uuid"];
// const search_data = await this.tenant_report_search.find({}).exec();
//  console.log(search_data);
//     return this.commonDbFn.findAllWithPagination(this.tenant_report, queryParams, searchFields,populateFields);
const search_data = await this.tenant_report_search.find({}).exec();

//existing code to fetch the data
const data = await this.commonDbFn.findAllWithPagination(this.tenant_report, queryParams, searchFields, populateFields);

// Create the response object with both search_data and data
const response = {
   statusCode: 200,
   count: data.count,
   search_data: search_data, // Include your search_data here
  data: data, // Include your existing data here
};

return response;
  }

async tenantreport(tenant_uuid: string){
  let searchFields = ["tenant_uuid"];
  let populateFields = [{  path: "tenant", select: "tenant_name username" }];
    const getLeadreportData = await this.tenant_report.find({ tenant_uuid }).populate(populateFields).exec();
    console.log(getLeadreportData);
     return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, getLeadreportData);
}

async advancedSearch(searchParams) {
  let i, objectKeys, objectValues, len, filedName, filedValue, searchFlag, where : any = [], key, obj, result, count=0;

//Check Role type
  let { role, tenant_uuid, uuid } = searchParams;
  if (role == "tenant") {
      where.push({ tenant_uuid: tenant_uuid });
  } else if (role == "agent") {
      where.push({ user_uuid: uuid });
  }
  //Delete unnecessary details from request
 // if (searchParams.role == "master_admin" || searchParams.role == "tenant" || searchParams.role == "agent") {
      delete searchParams.tenant_uuid;
      delete searchParams.role;
      delete searchParams.domain;
      delete searchParams.uuid;
 // }

let populateFields = [{ path: "tenant", select: 'tenant_name username' },];
  if (searchParams.callstart != undefined && searchParams.callend != undefined) {
      obj = { "callstart": { "$gte": `${searchParams.callstart}`, "$lte": `${searchParams.callend}` } };
      where.push(obj);
  }

//Pagination
const perPage = Number(searchParams.limit) || 10;
  const currentPage = Number(searchParams.page) || 1;
  const skip = perPage * (currentPage - 1);
//End

  delete searchParams.callstart;
  delete searchParams.callend;


  objectKeys = Object.keys(searchParams);
  objectValues = Object.values(searchParams);
  len = objectKeys.length;
  
  /*if (len == 0) {
      return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, "Not found", 0);
  }*/

  for (i = 0; i < len; i++) {
      filedName = objectKeys[i];
      filedValue = objectValues[i];
      if (filedName.includes("|")) {
          key = filedName.split("|")[0].trim();
          searchFlag = parseInt(filedName.split("|")[1].trim());
      } else {
          key = filedName;
          searchFlag = -1;
      }

      switch (searchFlag) {
          case 1: //Begins with
              obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
              where.push(obj);
              break;
          case 2: // Contains
              obj = { [key]: { $regex: filedValue, $options: "i" } };
              where.push(obj);
              break;
          case 3: // Does not contains
              obj = { [key]: { $regex: `^((?!${filedValue}).)*$`, $options: "i" } };
              where.push(obj);
              break;
          case 4: // Is equal to
              obj = { [key]: filedValue };
              where.push(obj);
              break;
          case 5: // In not equal to
              obj = { [key]: { $ne: filedValue } };
              where.push(obj);
              break;
          case 6: //Ends with
              obj = { [key]: { $regex: `${filedValue}$`, $options: "i" } };
              where.push(obj);
              break;

          default: //Begins with
              obj = { [key]: { $regex: `^${filedValue}`, $options: "i" } };
              where.push(obj);
              break;
      }
  }
 
if(where.length == 0){
where = [{}];
}
  result = await this.tenant_report.find({ $and : where }).limit(perPage).skip(skip).sort({ _id: -1 }).populate(populateFields).exec();
 
  if (result.length > 0) {
      count = await this.tenant_report.find({ $and: where }).count().exec();
      Logger.debug(count, "Search result count");
      return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, result, count)
  } else {
      Logger.error(count, "Search result count");
      return this.commonDbFn.sendResponseWithCount(HttpStatus.NOT_FOUND, result, count)
  }
}

// =================report===================

async searchTenant(searchParams) {
	// console.log("SEARCH");
	// console.log(searchParams);
  let tenantdelete = searchParams.customer_tenant_uuid;
  searchParams.flag = 0;
  searchParams.tenant_uuid = searchParams.customer_tenant_uuid;
  await this.tenant_report.deleteMany({tenantdelete});
  await this.tenant_report_search.deleteMany({tenantdelete});
  // const { number } = createDidDto;
  let logMessages = {
    logErrorMsg: "searchUser already exist \n",
    logSuccessMsg: "searchUser created successfully \n"
  }
//  let cron = this.startcron(searchParams);
let cronJob = this.searchTenantreport(searchParams);
  return this.commonDbFn.insert(this.tenant_report_search,searchParams , JSON.stringify(logMessages));
}

// startcron(searchParams){
//   const cronJobName = "user performance report search";
//   console.log('Cron job in');
//   let exp = CronExpression.EVERY_MINUTE;
//   const job = new CronJob(exp, async () => {
//       console.log('Cron job is running');
//       this.searchTenantreport(searchParams);
//   });
//   console.log(searchParams);
//   if( searchParams == 'stop'){
//     console.log(searchParams);
//     console.log('Cron job is stop');
//     job.stop();
//   }else{
//     console.log('Cron job is start');
//     job.start();
//         }
// }

async searchTenantreport(searchParams) {
    
  const {tenant_uuid} =searchParams;
    // await this.tenant_report_search.updateMany({tenant_uuid}, { $set: { flag: 1 } });
    await this.tenant_report.deleteMany({tenant_uuid});
    
      const search_data = await this.tenant_report_search.findOne({tenant_uuid}).exec();
      if (search_data === null) {
		return;
      }
      console.log(search_data);
  let tenant = search_data.tenant_uuid;
  let callstart = search_data.callstart;
  let callend = search_data.callend;
  await this.tenant_report_search.updateMany({tenant_uuid}, { $set: { flag: 1 } });
      //const tenant_data = await this.cdrs.findOne({tenant_uuid}).exec();
        //  console.log(tenant_data);
      const inbound_count = await this.cdrs.find({ tenant_uuid: `${tenant}`, direction: "inbound" , "callstart": { "$gte": `${callstart}`, "$lte": `${callend}` }}).count().exec();
          console.log(inbound_count);
      const outbound_count = await this.cdrs.find({ tenant_uuid: `${tenant}` , direction: "outbound","callstart": { "$gte": `${callstart}`, "$lte": `${callend}` } }).count().exec();
          console.log(outbound_count);
// Convert 'billsecond' to an integer and compare it to 0
      const completed_call = await this.cdrs.find({ tenant_uuid: `${tenant}` ,$expr: { $gt: [{ $toInt: "$billsecond" }, 0] },"callstart": { "$gte": `${callstart}`, "$lte": `${callend}` } }).count().exec();
          console.log(completed_call);
      const less_six_second_count = await this.cdrs.countDocuments({ tenant_uuid: `${tenant}` , $expr: { $lte: [{ $toInt: "$billsecond" }, 6] },"callstart": { "$gte": `${callstart}`, "$lte": `${callend}` } }).count().exec();
          console.log(less_six_second_count);    
      const sum_of_duration = await this.cdrs.find({ tenant_uuid: `${tenant}`,"callstart": { "$gte": `${callstart}`, "$lte": `${callend}` } }).exec();
      const sumOfDurations = sum_of_duration.reduce((total, record) => total + parseInt(record.billsecond.toString(), 10), 0);      
          console.log(sumOfDurations);
      const acd = completed_call / sumOfDurations;
          console.log(acd);
      const totalCallCount = await this.cdrs.countDocuments({ tenant_uuid: `${tenant}`,"callstart": { "$gte": `${callstart}`, "$lte": `${callend}` } }).exec();
      console.log('Total Call Count:', totalCallCount);
      const asr = (completed_call / totalCallCount) * 100;
          console.log(asr);
          const result = {
              //tenant_data,
              tenant,
              inbound_count,
              outbound_count,
              completed_call,
              less_six_second_count,
              sumOfDurations,
              acd,
              totalCallCount,
              asr
          };
          const mappedResult = {
            tenant_uuid: result.tenant, 
            inbound_call_count: result.inbound_count,
            outbound_call_count: result.outbound_count,
            completed_call: result.completed_call,
            less_six_second_count: result.less_six_second_count,
            sum_of_duration: result.sumOfDurations,
            acd: result.acd,
            totalCallCount: result.totalCallCount,
            asr: result.asr
           
        };
        
        // Insert the mapped result into the tenant_report collection
        await this.tenant_report.insertMany([mappedResult]);
      
          // await this.tenant_report.insertMany(result);
          await this.tenant_report_search.updateMany({tenant_uuid}, { $set: { flag: 2 } });
          // let jobrun = 'stop';
          // let cronJob = this.startcron(jobrun);
          // console.log(cronJob);
          // console.log("cronJob---------");
       return result;
    }

    async checkflagstatus(queryParams){
        const flagstatus: any = await this.tenant_report_search.find().exec();
        // console.log(flagstatus);
        const data = flagstatus.map(item => ({ flag: item.flag }));
       
           return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,data);
      }

}

