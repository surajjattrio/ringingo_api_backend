import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateAreaCodeDto } from "../dto/create-area-code.dto";
import { AreaCodeDocument, AreaCodeSchema } from "../schema/area-code.schema";
import { parseStream } from "fast-csv";
import * as fs from 'fs';
import { AreaCodeImportDto } from "../dto/area-code-import.dto";
import { StateDocument, StateSchema } from "src/modules/state/schema/state.schema";

@Injectable()

export class AreaCodeService {

    /*
    @Usage              : To load area code schema and other libraries
    @Param @InjectModel : It will load area code schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [areaCodes,commonDbFn] 
    */

    constructor(
        @InjectModel(AreaCodeSchema.name) private readonly areaCodes: Model<AreaCodeDocument>,
        @InjectModel(StateSchema.name) private readonly states: Model<StateDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                  : First it will check whether given area code exist or not , if not then new area code will be created else it will throw error
    @Param createAreaCodeDto : Request paramter that we set into dto
    @return Object          :  Success / Error 
    */

    async create(createAreaCodeDto: CreateAreaCodeDto) {

        const { code } = createAreaCodeDto;
        let where = [{ code }, { code }];
        let logMessages = {
            logErrorMsg: "Area Code already exist \n",
            logSuccessMsg: "Area Code created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.areaCodes, where, createAreaCodeDto, JSON.stringify(logMessages), "and");
    }

    // async findAll() {
    //     // return this.commonDbFn.findAll(this.areaCodes);
    //     let result = await this.areaCodes.aggregate([
    //         {
    //             $facet: {
    //                 count: [{ $count: "total" }],
    //                 data: [{ $match: {} }, { $sort: { areaCode: 1 } }],
    //             }
    //         },
    //         {
    //             $unwind: "$count"
    //         },
    //     ]);
    //     return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    // }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of areaCodes with data 
    */

    async findAll(queryParams) {
        let searchFields = ["code", "comment"];
        let populateFields = [{ path: "tenant", select: 'username tenant_name' }, { path: "state", select: 'state_name state_code' }, { path: 'timezone', select: 'gmttime timezone_name' }];
        return this.commonDbFn.findAllWithPagination(this.areaCodes, queryParams, searchFields, populateFields, { code: -1 });
    }
    /*
    @Usage          : To get single area code record based on uuid
    @Param uuid     : Search area code by uuid
    @return Object  : Result of area code 
    */
    async findOne(uuid: string) {
        const areaCode = await this.areaCodes.findOne({ uuid }).exec();
        if (areaCode == null) { Logger.error(`area code not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException() }
        Logger.debug(`area code success fetched by uuid : ${uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, areaCode);
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update area code by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createAreaCodeDto: CreateAreaCodeDto) {
        const areaCodeUpdate = await this.areaCodes.updateOne({ uuid }, createAreaCodeDto).exec();

        if (areaCodeUpdate.matchedCount == 0 && areaCodeUpdate.modifiedCount == 0) {
            Logger.error(`Area Code uuid was incorrect ${uuid} \n`, putMethod);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Area Code id was incorrect" })
        }
        Logger.debug(`Area Code updated successfully by uuid ${uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Area Code updated successfully");
    }

    /*
    @Usage         : To update status of area code[Active/Inactive]
    @Param uuid    : uuid of did
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        body["type"] = body.status;
        delete body.status;
        let logMessages = {
            logErrorMsg: `Area Code not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Area Code status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.areaCodes, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : To update status of areacode[Active/Inactive]
    @Param uuid    : To update single area code pass one uuid , for multiple pass comma separated uuids without space
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async updateByStatus(uuid: string, body) {
        body["type"] = body.status;
        delete body.status;
        let logMessages = {
            logErrorMsg: `Area Code not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Area Code status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.updateByStatus(this.areaCodes, { uuid }, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple area code using uuid
    @Param uuid    : To delete single area code pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Area Code not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Area Code deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.areaCodes, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search areaCodes using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of areaCodes with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "tenant", select: 'username tenant_name' }, { path: "state", select: 'state_name state_code' }, { path: 'timezone', select: 'gmttime timezone_name' }];
        return this.commonDbFn.advancedSearch(this.areaCodes, searchParams, populateFields);
    }

    async importAreaCode(postData: AreaCodeImportDto) {
        let { file, state_id, tenant_uuid } = postData;
        let allareacode: any = await this.addCsvData(postData);
        allareacode.shift();

        //Variable declaration
        let result, areacodeArr, csvchecckedarr, finalareacode_Arr, insertedRecords = 0, recordText, len;

        result = await this.areaCodes.find({ tenant_uuid }, { _id: 0 }).exec();
        areacodeArr = this.filterData(allareacode, result);
        const areacodeData = areacodeArr;
        const filtered = areacodeArr.filter(({ code }, index) =>
            !areacodeData.includes(code, index + 1));
        csvchecckedarr = filtered;
        finalareacode_Arr = csvchecckedarr;
        try {
            insertedRecords = finalareacode_Arr != undefined ? finalareacode_Arr.length : 0;
            if (insertedRecords != 0) {
                await this.states.insertMany(allareacode, { ordered: false });
                await this.areaCodes.insertMany(finalareacode_Arr, { ordered: false });
            }
        } catch (error) {
            insertedRecords = error?.result?.nInserted != undefined ? error.result.nInserted : 0;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${file}`, (result) => {
            Logger.debug(`${file} file deleted`);
        });
        len = allareacode?.length == 0 ? 0 : allareacode.length;
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Imported ${insertedRecords}/${len} ${recordText.trim()}`);
    }

    async addCsvData(postData) {
        let { file, tenant_uuid, state_id, timezone_uuid, mapper_keys } = postData;
        let stateUUID;
        //For telecom-ci import mapper
        if (mapper_keys != undefined) {
            mapper_keys = JSON.parse(mapper_keys);
        }

        let allareacodes = [];
        const self = this;
        let obj: any = {};
        return new Promise(function (resolve, reject) {
            const stream = fs.createReadStream(`${process.env.UPLOAD_DIRECTORY}${file}`);
            let rowsProcessed = 0;
            parseStream(stream)
                .on('error', (error) => reject(error))
                .on('data', async (row) => {
                    let stateCodeFromFile = row[0];
                    rowsProcessed++;
                    if (rowsProcessed > 1) {
                        try {
                            const state = await self.states.findOne({ state_code: stateCodeFromFile }).exec();
                            if (!state) {
                                throw new Error(`State with code ${stateCodeFromFile} not found`);
                            }
                            stateUUID = state.uuid;
                        } catch (error) {
                            Logger.error("Unable to fetch state details", error.message);
                            stream.destroy();
                            reject(error);
                        }
                        const obj = {
                            tenant_uuid,
                            timezone_uuid,
                            state_id: stateUUID,
                            code: row[1],
                            comment: row[4],
                            type: 0,
                            state_code: row[0],
                            start_time: row[2],
                            end_time: row[3],
                            day_light_toggle: 1
                        };
                        allareacodes.push(obj);
                    }
                }).on('end', () => {
                    resolve(allareacodes);
                });
        });
    }
    filterData(allareacodes, result) {
        let matched, areacodeArr = [];
        allareacodes.map((data) => {
            matched = result.filter(function (el) {
                return el.code == data.code
            });
            if (matched.length == 0) {
                areacodeArr.push(data);
            }
        });
        return areacodeArr;
    }
}
