import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateDidDto } from "../dto/create-did.dto";
import { ForwordingDidDto } from "../dto/forwarding-did.dto";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { DidDocument, DidSchema } from "../schema/did.schema";
import { parseStream } from 'fast-csv';
import * as fs from 'fs';

@Injectable()

export class DidService {
  commonFn: any;

  /*
  @Usage : To load did schema and other libraries
  @Param @InjectModel: It will load did schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[did,commonFn,commonDbFn] 
  */

  constructor(
    @InjectModel(DidSchema.name) private readonly did: Model<DidDocument>,
    @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
  @Usage                 : First it will check whether given number exist or not , if not then new did will be created else it will throw error
  @Param createDidDto    : Request paramter that we set into dto
  @return Object         :  Success / Error 
  */

  async create(createDidDto: CreateDidDto) {

    const { number, role, tenant_uuid } = createDidDto;
    let logMessages = {
      logErrorMsg: "DID already exist \n",
      logSuccessMsg: "DID created successfully \n"
    }

    if (role == "manager") {
      //Fetch tenant of manager
      let tenantInfo;
      const lookupUuid = createDidDto.manager_uuid || tenant_uuid;
      tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
      if (tenantInfo) {
        createDidDto.tenant_uuid = tenantInfo.tenant_uuid;
        createDidDto.manager_uuid = lookupUuid as string;
      } else {
        createDidDto.manager_uuid = lookupUuid as string;
      }
    }

    return this.commonDbFn.findAndInsert(this.did, { number }, createDidDto, JSON.stringify(logMessages));
  }


  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of did with data 
  */

  async findAll(queryParams) {
    let searchFields = ["number", "timeout"];
    let populateFields = [{ path: "tenant", select: "tenant_name" },
    { path: "user", select: 'username' },
    ];
    return this.commonDbFn.findAllWithPagination(this.did, queryParams, searchFields, populateFields, { status: 1, _id: -1 });
  }

  /*
  @Usage          : To get single did record based on uuid
  @Param uuid     : Search did by uuid
  @return Object  : Result of did 
  */

  async findOne(uuid: string) {
    const user = await this.did.findOne({ uuid }).exec();
    if (user == null) {
      Logger.error(`Did not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Did not found" })
    }
    Logger.debug(`Did success fetched by uuid : ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
  }

  /*
  @Usage                     : Check number which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update did by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error 
  */

  async update(uuid: string, updateDidDto: CreateDidDto) {
    const { number } = updateDidDto;
    const getDidData = await this.did.findOne({ uuid }).exec();
    if (getDidData.number != number) {
      const checkDidExist = await this.did.find({ number }).count().exec();
      if (checkDidExist > 0) {
        Logger.error("Number already exist \n", putMethod);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Number already exist`);
      }
    }

    const didUpdate = await this.did.updateOne({ uuid }, updateDidDto).exec();

    if (didUpdate.matchedCount == 0 && didUpdate.modifiedCount == 0) {
      Logger.error(`Did uuid was incorrect ${uuid} \n`, putMethod);
      throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "DID id was incorrect" })
    }
    Logger.debug(`Did updated successfully by uuid ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "DID updated successfully");
  }

  /*
  @Usage         : To update status of did[Active/Inactive]
  @Param uuid    : uuid of did
  @Param body    : Contains update body
  @return Object : Success / Error 
  */

  async patch(uuid: string, body) {
    let logMessages = {
      logErrorMsg: `DID not found by uuid : ${uuid} \n`,
      logSuccessMsg: `DID status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.did, uuid, body, JSON.stringify(logMessages));
  }

  /*
  @Usage         : Delete single or multiple did using uuid
  @Param uuid    : To delete single did pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error 
  */

  async remove(uuid: string) {

    let logMessages = {
      logErrorMsg: `DID not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `DID deleted successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.delete(this.did, { uuid }, JSON.stringify(logMessages));
  }

  /*
  @Usage              : To search did using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of did with data 
  */

  async advancedSearch(searchParams) {
    let populateFields = [{ path: "tenant", select: "tenant_name" },
    { path: "user", select: 'user_name' },
    ];
    return this.commonDbFn.advancedSearch(this.did, searchParams, populateFields);
  }

  /*
  @Usage                 : First it will check whether given number exist or not , if not then new did will be created else it will throw error
  @Param createTenantDto : Request paramter that we set into dto
  @return Object         :  Success / Error 
  */

  async forwarding(uuid: string, updateDidDto: ForwordingDidDto) {
    const { did_forwarding_type, did_forwarding_value } = updateDidDto;
    const getDidForwordData = await this.did.findOne({ did_forwarding_type, did_forwarding_value }).count().exec();

    const didUpdate = await this.did.updateOne({ uuid }, updateDidDto).exec();

    if (didUpdate.matchedCount == 0 && didUpdate.modifiedCount == 0) {
      Logger.error(`Did uuid was incorrect ${uuid} \n`, putMethod);
      throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Did id was incorrect" })
    }
    Logger.debug(`Did forward successfully by uuid ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "DID forward successfully");
  }

   /* DID Import section -- Manish 25-05-23 */

  /*
  @Usage                 : To add received object from addCsvData() function into DB
  @Param postData        : Request paramter that we set into dto
  @return Object         : Success / Error
  */

  async importDID(postData) {
    let { file } = postData;
    let allDIDs: any = await this.addCsvData(postData);
    allDIDs.shift();
    let insertedRecords = 0, recordText;
    try {
      await this.did.insertMany(allDIDs, { ordered: false });
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
    let { user_uuid, file, tenant_uuid } = postData;
    let allDIDs = [];
    let obj: any = {};
    return new Promise(function (resolve, reject) {
      const stream = fs.createReadStream(`${process.env.UPLOAD_DIRECTORY}${file}`);
      parseStream(stream)
        .on('error', error => console.error(error))
        .on('data', row => {
            if(!isNaN(row[0])){	
            obj = {
              user_uuid,
              number: row[0],
              status: "0",
              codec: "",
              timeout: "0",
              assign: "1",
              tenant_uuid
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
