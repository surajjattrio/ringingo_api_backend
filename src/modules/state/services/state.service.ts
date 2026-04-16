import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateStateDto } from "../dto/create-state.dto";
import { StateDocument, StateSchema } from "../schema/state.schema";
import { StateImportDto } from "../dto/state-import.dto";
import { parseStream } from "fast-csv";
import * as fs from 'fs';

@Injectable()

export class StateService {

    /*
    @Usage              : To load state schema and other libraries
    @Param @InjectModel : It will load state schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [states,commonDbFn] 
    */

    constructor(
        @InjectModel(StateSchema.name) private readonly states: Model<StateDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                  : First it will check whether given state exist or not , if not then new state will be created else it will throw error
    @Param createStateDto : Request paramter that we set into dto
    @return Object          :  Success / Error 
    */

    async create(createStateDto: CreateStateDto) {

        const { state_code } = createStateDto;
        let where = [{ state_code }, { state_code }];
        let logMessages = {
            logErrorMsg: "State already exist \n",
            logSuccessMsg: "State created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.states, where, createStateDto, JSON.stringify(logMessages), "and");
    }

    // async findAll() {
    //     // return this.commonDbFn.findAll(this.states);
    //     let result = await this.states.aggregate([
    //         {
    //             $facet: {
    //                 count: [{ $count: "total" }],
    //                 data: [{ $match: {} }, { $sort: { state: 1 } }],
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
    @return Object     : Array of an object with total count of states with data 
    */

    async findAll(queryParams) {
        let searchFields = ["state_name", "state_code", "toggle_status"];

        return this.commonDbFn.findAllWithPagination(this.states, queryParams, searchFields, "", { state: 1 });
    }
    /*
    @Usage          : To get single state record based on uuid
    @Param uuid     : Search state by uuid
    @return Object  : Result of state 
    */
    async findOne(uuid: string) {
        const state = await this.states.findOne({ uuid }).exec();
        if (state == null) { Logger.error(`State not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException() }
        Logger.debug(`State success fetched by uuid : ${uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, state);
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update state by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createStateDto: CreateStateDto) {
        const stateUpdate = await this.states.updateOne({ uuid }, createStateDto).exec();

        if (stateUpdate.matchedCount == 0 && stateUpdate.modifiedCount == 0) {
            Logger.error(`State uuid was incorrect ${uuid} \n`, putMethod);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "State id was incorrect" })
        }
        Logger.debug(`State updated successfully by uuid ${uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "State updated successfully");
    }

    /*
    @Usage         : To update status of state[Active/Inactive]
    @Param uuid    : uuid of did
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        body["toggle_status"] = body.status;
        delete body.status;
        let logMessages = {
            logErrorMsg: `State not found by uuid : ${uuid} \n`,
            logSuccessMsg: `State status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.states, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : To update status of state[Active/Inactive]
    @Param uuid    : To update single state pass one uuid , for multiple pass comma separated uuids without space
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async updateByStatus(uuid: string, body) {
        body["toggle_status"] = body.status;
        delete body.status;
        let logMessages = {
            logErrorMsg: `State not found by uuid : ${uuid} \n`,
            logSuccessMsg: `State status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.updateByStatus(this.states, { uuid }, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple state using uuid
    @Param uuid    : To delete single state pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `State not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `State deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.states, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search states using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of states with data 
    */

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.states, searchParams);
    }

    async importState(postData: StateImportDto) {
        let { file, tenant_uuid } = postData;
        let allstate: any = await this.addCsvData(postData);
        allstate.shift();

        //Variable declaration
        let result, stateArr, csvchecckedarr, finalstate_Arr, insertedRecords = 0, recordText, len;

        result = await this.states.find({ tenant_uuid }, { _id: 0 }).exec();
        stateArr = this.filterData(allstate, result);
        const stateData = stateArr//.map(({ state_code: state_code, state_name: state_name }) => { state_code, state_name });
        const filtered = stateArr.filter(({ state_code, state_name }, index) =>
            !stateData.includes(state_code, state_name, index + 1));
        csvchecckedarr = filtered;
        finalstate_Arr = csvchecckedarr;
        try {
            insertedRecords = finalstate_Arr != undefined ? finalstate_Arr.length : 0;
            if (insertedRecords != 0) {
                await this.states.insertMany(finalstate_Arr, { ordered: false });
            }
        } catch (error) {
            insertedRecords = error?.result?.nInserted != undefined ? error.result.nInserted : 0;
        }
        recordText = insertedRecords <= 1 ? "record" : "records";
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${file}`, (result) => {
            Logger.debug(`${file} file deleted`);
        });
        len = allstate?.length == 0 ? 0 : allstate.length;
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Imported ${insertedRecords}/${len} ${recordText.trim()}`);
    }

    async addCsvData(postData) {
        let { file, tenant_uuid, mapper_keys } = postData;


        //For telecom-ci import mapper
        if (mapper_keys != undefined) {
            mapper_keys = JSON.parse(mapper_keys);
        }

        let allstates = [];
        let obj: any = {};
        return new Promise(function (resolve, reject) {
            const stream = fs.createReadStream(`${process.env.UPLOAD_DIRECTORY}${file}`);
            parseStream(stream)
                .on('error', error => console.error(error))
                .on('data', row => {
                    console.log(row);
                    obj = {
                        tenant_uuid,
                        toggle_status: '0',
                        state_code: row[0],
                        state_name: row[1]
                    }
                    allstates.push(obj);
                })
                .on('end', async (rowCount: number) => {
                    resolve(allstates);
                });
        });
    }
    filterData(allstates, result) {
        let matched, stateArr = [];
        allstates.map((data) => {
            matched = result.filter(function (el) {
                return el.state_code == data.state_code && el.state_name == data.state_name
            });
            if (matched.length == 0) {
                stateArr.push(data);
            }
        });
        return stateArr;
    }
}
