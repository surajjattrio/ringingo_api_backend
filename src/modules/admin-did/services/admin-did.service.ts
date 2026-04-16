import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateAdminDidDto } from "../dto/create-admin-did.dto";
import { AdminDidDocument, AdminDidSchema } from "../schema/admin-did.schema";
import { DidSchema , didSchema , DidDocument } from "src/modules/did/schema/did.schema";
import { parseStream } from 'fast-csv';
import * as fs from 'fs';

@Injectable()

export class AdminDidService {
  commonFn: any;

  /*
  @Usage : To load admin did schema and other libraries
  @Param @InjectModel: It will load admin did schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[admin_did,commonFn,commonDbFn] 
  */

  constructor(
    @InjectModel(AdminDidSchema.name) private readonly admin_did: Model<AdminDidDocument>,
    @InjectModel(DidSchema.name) private readonly did: Model<DidDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
  @Usage                 : First it will check whether given number exist or not , if not then new admin did will be created else it will throw error
  @Param createDidDto    : Request paramter that we set into dto
  @return Object         :  Success / Error 
  */

  async create(createAdminDidDto: CreateAdminDidDto) {

    const { number } = createAdminDidDto;
    createAdminDidDto.created_flag = "0";

    let logMessages = {
      logErrorMsg: "Admin DID already exist \n",
      logSuccessMsg: "Admin DID created successfully \n"
    }
    return this.commonDbFn.findAndInsert(this.admin_did, { number }, createAdminDidDto, JSON.stringify(logMessages));
  }


  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of admin did with data 
  */

  async findAll(queryParams) {
    let searchFields = ["number", "timeout"];
    let populateFields = [{ path: "tenant", select: "tenant_name" },
      { path: "number", select: 'number' },
    
    ];
    return this.commonDbFn.findAllWithPagination(this.admin_did, queryParams, searchFields, populateFields);
  }

  /*
  @Usage          : To get single admin did record based on uuid
  @Param uuid     : Search admin did by uuid
  @return Object  : Result of admin did 
  */

  async findOne(uuid: string) {
    const user = await this.admin_did.findOne({ uuid }).exec();
    if (user == null) {
      Logger.error(`Admin Did not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Did not found" })
    }
    Logger.debug(`Admin Did success fetched by uuid : ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
  }

  /*
  @Usage                     : Check number which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update admin did by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error 
  */

  async update(uuid: string, updateAdminDidDto: CreateAdminDidDto) {
    const { number } = updateAdminDidDto;
     updateAdminDidDto.created_flag = "0";

    const getAdminDidData = await this.admin_did.findOne({ uuid }).exec();
    if (getAdminDidData.number != number) {
      const checkAdminDidExist = await this.admin_did.find({ number }).count().exec();
      if (checkAdminDidExist > 0) {
        Logger.error("Number already exist \n", putMethod);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Number already exist`);
      }
    }

    const admindidUpdate = await this.admin_did.updateOne({ uuid }, updateAdminDidDto).exec();

    if (admindidUpdate.matchedCount == 0 && admindidUpdate.modifiedCount == 0) {
      Logger.error(`Admin Did uuid was incorrect ${uuid} \n`, putMethod);
      throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Admin DID id was incorrect" })
    }
    Logger.debug(`Admin Did updated successfully by uuid ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Admin DID updated successfully");
  }

  /*
  @Usage         : To update status of admin did[Active/Inactive]
  @Param uuid    : uuid of admin did
  @Param body    : Contains update body
  @return Object : Success / Error 
  */

  async patch(uuid: string, body) {
    let logMessages = {
      logErrorMsg: `Admin DID not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Admin DID status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.admin_did, uuid, body, JSON.stringify(logMessages));
  }

  /*
  @Usage         : Delete single or multiple admin did using uuid
  @Param uuid    : To delete single admin did pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error 
  */

  async remove(uuid: string) {

    let logMessages = {
      logErrorMsg: `Admin DID not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Admin DID deleted successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.delete(this.admin_did, { uuid }, JSON.stringify(logMessages));
  }

  /*
  @Usage              : To search admin did using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of admin did with data 
  */

  async advancedSearch(searchParams) {
    let populateFields = [{ path: "tenant", select: "tenant_name" },{ path: "number", select: 'number' },
   
    ];
    return this.commonDbFn.advancedSearch(this.admin_did, searchParams, populateFields);
  }

   /*
   @Usage                 : First it will check whether given number exist or not , if not then new admin did will be created else it will throw error
   @Param createTenantDto : Request paramter that we set into dto
   @return Object         :  Success / Error 
  */

   /*
    @Usage         : To assign admin did to single or multiple tenant
    @Param uuid    : uuid of admin did
    @Param body    : Contains uuids of tenant
    @return Object : Success / Error 
    */

    async assignAdminDid(uuid: string, body) {
        let { assign_tenant_uuid , admin_did_uuid } = body;
        admin_did_uuid = admin_did_uuid.split(",");
        let logMessages = {
            logErrorMsg: `Tenant not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Admin Did assigned successfully by uuid ${uuid} \n`
        }
        await this.updateunassigndids( admin_did_uuid, uuid );
        let res = await this.updateDidAndAdd(admin_did_uuid,uuid);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK , "DID updated successfully");
        // if(res.upsertedId != null && res.upsertedId > 0){
        //   return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK , "Did updated successfully");
        // }else{
        //   return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND , "Did updated successfully");
        // }
        

    }

    async updateunassigndids ( admin_did_uuid, tenant_uuid ) {
      let admin_assign_did = [];
      let unassigndids = [];
      let assign_did = await this.admin_did.find( { assign_tenant_uuid: tenant_uuid }, { _id: 0 } ).exec();
      console.log( assign_did );
      admin_assign_did = assign_did.map( did => did.uuid );
      unassigndids = admin_assign_did.filter( did => !admin_did_uuid.includes( did ) );
      console.log( unassigndids );
  
      await this.admin_did.updateMany( { uuid: { $in: unassigndids } }, { $set: { assign_tenant_uuid: "" } } ).exec();
  
    }

    updateDidAndAdd(admin_did_uuid,uuid){
      let self = this;
      let result,didData,didArray=[],obj,allData;
      return new Promise( async (resolve , reject) =>{
        try{
          allData = admin_did_uuid.map( async(data) => {
          result = await self.admin_did.updateOne({ uuid:data }, {assign_tenant_uuid:uuid}).exec();
          didData = await self.admin_did.findOne({uuid:data},{_id : 0}).exec();
	  obj = {
            number : didData.number,
            tenant_uuid : didData.assign_tenant_uuid,
            user_uuid : "",
            codec : didData.codec,
            timeout : didData.timeout,
            status : didData.status
          }
          didArray.push(obj);
        });
        await Promise.all(allData);
        result = await this.did.insertMany(didArray,{ ordered : false });        
      }catch(error){
        console.log("error",error.message);
      }
      resolve(result);
      })
    }


  async findTenant(assign_tenant_uuid: string) {
    const user = await this.admin_did.find({ assign_tenant_uuid }).exec();

    if (user == null) {
      Logger.error(`Admin Did not found by uuid : ${assign_tenant_uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Did not found" })
    }
    Logger.debug(`Admin Did success fetched by uuid : ${assign_tenant_uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
  }

  /* Admin DID Import */

  /*
  @Usage                 : To add received object from addCsvData() function into DB
  @Param postData        : Request paramter that we set into dto
  @return Object         : Success / Error
  */

  async importAdminDID(postData) {
    let { file, tenant_uuid, role, assign_tenant_uuid } = postData;
    let allDIDs: any = await this.addCsvData(postData);
    let insertedRecords = 0, recordText;
    try {
      //let collection_name = tenant_uuid == "" ? admin_did : did;
      if (assign_tenant_uuid == "") {
        await this.admin_did.insertMany(allDIDs, { ordered: false });
      } else {
        await this.admin_did.insertMany(allDIDs, { ordered: false });
        await this.did.insertMany(allDIDs, { ordered: false });
      }
      insertedRecords = allDIDs.length;
    } catch (error) {
      insertedRecords = error.result.nInserted;
    }
    recordText = insertedRecords <= 1 ? "record" : "records";
    fs.unlink(`${process.env.UPLOAD_DIRECTORY}${file}`, (result) => {
      Logger.debug(`${file} file deleted`);
    });
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Imported ${insertedRecords} ${recordText.trim()}`);
  }

  /*
  @Usage                 : To create object with csv data
  @Param postData        : Request paramter that we set into dto
  @return Object         : Success / Error
  */

  async addCsvData(postData) {
    let { tenant_uuid, file, assign_tenant_uuid, role } = postData;
    let allDIDs = [];
    let obj: any = {};
    let key = assign_tenant_uuid == "" ? "assign_tenant_uuid" : "tenant_uuid";
    return new Promise(function (resolve, reject) {
      const stream = fs.createReadStream(`${process.env.UPLOAD_DIRECTORY}${file}`);
      parseStream(stream)
        .on('error', error => console.error(error))
        .on('data', row => {
          if (!isNaN(row[0])) {
            obj = {
              [key]: assign_tenant_uuid,
              number: row[0],
              status: "0",
              codec: "",
              timeout: "0",
              assign_tenant_uuid: assign_tenant_uuid
              // assign: "1",

            }
            allDIDs.push(obj);
          }
        })
        .on('end', async (rowCount: number) => {
          resolve(allDIDs);
        });
    });
  }

  }






