import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateRinggroupDto } from "../dto/create-ringgroup.dto";
import { RinggroupDocument, RinggroupSchema } from "../schema/ringgroup.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";

@Injectable()

export class RinggroupService {
  commonFn: any;

/*
@Usage : To load ringgroup schema and other libraries
@Param @InjectModel: It will load ringgroup schema
@Param commonDbFn: To use commonly created mongoDB functions
@return : Object[ringgroup,commonFn,commonDbFn] 
*/

  constructor(@InjectModel(RinggroupSchema.name) private readonly ringgroup: Model<RinggroupDocument>,@InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }

  async create(createRinggroupDto: CreateRinggroupDto) {
    const { name, role, tenant_uuid } = createRinggroupDto;
    let logMessages = {
      logErrorMsg: "Ringgroup already exist \n",
      logSuccessMsg: "Ringgroup created successfully \n"
    }

    if (role == "manager") {
      //Fetch tenant of manager
      let tenantInfo;
      const lookupUuid = createRinggroupDto.manager_uuid || tenant_uuid;
      tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
      if (tenantInfo) {
        createRinggroupDto.tenant_uuid = tenantInfo.tenant_uuid;
        createRinggroupDto.manager_uuid = lookupUuid as string;
      } else {
        createRinggroupDto.manager_uuid = lookupUuid as string;
      }
    }

    return this.commonDbFn.findAndInsert(this.ringgroup, { name }, createRinggroupDto, JSON.stringify(logMessages));
  }

/*
@Usage             : To get records based on limit,page,search
@Param queryParams : It will contain page(default=1),limit(default=10),search
@return Object     : Array of an object with total count of did with data 
*/

  async findAll(queryParams) {
    const { tenant_uuid } = queryParams;
    if (queryParams.mode == "call-center") {
       let response = await this.ringgroup.find({ tenant_uuid, for_pbx: "1" },{ _id: 0, name: 1, uuid: 1, status: 1, for_pbx: 1 }).exec();
       let statusCode = response.length > 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
       return this.commonDbFn.sendResponseWithMessage(statusCode, response);
    } else {
       let searchFields = ["user", "timeout"];
       let populateFields = [{ path: "tenant", select: "tenant_name" },{ path: "user", select: 'user_name' }];
       return this.commonDbFn.findAllWithPagination(this.ringgroup, queryParams, searchFields, populateFields,"",true,true);
    }
  }

/*
@Usage          : To get single ringgroup record based on uuid
@Param uuid     : Search ringgroup by uuid
@return Object  : Result of ringgroup 
*/

  async findOne(uuid: string) {
    const user = await this.ringgroup.findOne({ uuid }).exec();
    if (user == null) {
      Logger.error(`Ringgroup not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "ringgroup not found" })
    }
    Logger.debug(`Ringgroup success fetched by uuid : ${uuid} \n`);
    // user.password = await this.commonFn.decode(user.password);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
  }

  /*
@Usage                     : Check number which comes in request for update already exist or not, if not it will update else it will throw error
@Param uuid                : Update did by uuid
@Param updateTenantDto     : Request parameters for update
@return Object             : Success / Error 
*/

  async update(uuid: string, updateRinggroupDto: CreateRinggroupDto) {
    const { name } = updateRinggroupDto;
    const getRinggroupData = await this.ringgroup.findOne({ name }).count().exec();
    if (!getRinggroupData) {
      const checkNameExist = await this.ringgroup.find({ name }).count().exec();
      if (checkNameExist > 0) {
        Logger.error("Name already exist \n", putMethod);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Name already exist`);
      }
    }

    const ringgroupUpdate = await this.ringgroup.updateOne({ uuid }, updateRinggroupDto).exec();

    if (ringgroupUpdate.matchedCount == 0 && ringgroupUpdate.modifiedCount == 0) {
      Logger.error(`Ringgroup uuid was incorrect ${uuid} \n`, putMethod);
      throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Ringgroup id was incorrect" })
    }
    Logger.debug(`Ringgroup updated successfully by uuid ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Ringgroup updated successfully");
  }
/*
@Usage         : To update status of ringgroup[Active/Inactive]
@Param uuid    : uuid of ringgroup
@Param body    : Contains update body
@return Object : Success / Error 
*/

  async patch(uuid: string, body) {
    let logMessages = {
      logErrorMsg: `Ringgroup not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Ringgroup status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.ringgroup, uuid, body, JSON.stringify(logMessages));
  }

  /*
@Usage         : Delete single or multiple ringgroup using uuid
@Param uuid    : To delete single ringgroup pass one uuid , for multiple pass comma separated uuids without space
@return Object : Success / Error 
*/

  async remove(uuid: string) {

    let logMessages = {
      logErrorMsg: `Ringgroup not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Ringgroup deleted successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.delete(this.ringgroup, { uuid }, JSON.stringify(logMessages));
  }

  /*
@Usage              : To search ringgroup using advanced search
@Param searchParams : Contains search paramaters
@return Object      : Array of an object with total count of tenants with data 
*/

  async advancedSearch(searchParams) {
    let populateFields = [{ path: "tenant", select: "tenant_name" },
    { path: "user", select: 'user_name' },
    { path: "greeting", select: 'greeting_name' }
    ];
    return this.commonDbFn.advancedSearch(this.ringgroup, searchParams, populateFields);
  }
}
