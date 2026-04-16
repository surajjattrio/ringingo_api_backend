import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CreateTimezoneDto } from "../dto/create-timezone-dto";
import { TimezoneDocument, TimezoneSchema } from "../schema/timezone.schema";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";


@Injectable()

export class TimezoneService {

    /*
    @Usage : To load timezone schema and other libraries
    @Param @InjectModel: It will load timezone schema
    @Param commonDbFn: To use commonly created mongoDB functions
    @return : Object[timezone,commonFn,commonDbFn] 
    */

    constructor(@InjectModel(TimezoneSchema.name) private readonly timezone: Model<TimezoneDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) {

    }

    /*
    @Usage                  : First it will check whether given timezone exist or not , if not then new timezone will be created else it will throw error
    @Param createCountryDto : Request paramter that we set into dto
    @return Object          :  Success / Error 
    */

    async create(createTimezoneDto: CreateTimezoneDto) {

        const { timezone_name } = createTimezoneDto;
        const timezoneExist = await this.timezone.find({ timezone_name }).count().exec();
        if (timezoneExist > 0) {
            Logger.error("Timezone already exist \n", postMethod);
            return this.sendReponse(HttpStatus.CONFLICT, `Timezone already exist`);
        }
        const creatTimezone = new this.timezone(createTimezoneDto);
        await creatTimezone.save();
        Logger.debug("Timezone created successfully \n");
        return this.sendReponse(HttpStatus.CREATED, "Timezone created successfully");
    }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of timezone with data 
    */

    async findAll(queryParams) {
        let pagination = true;
        let { country_uuid, page, limit, search } = queryParams;
        let searchParams = [], query: any = {}, result, totalCount: any = 0;
        const perPage = Number(limit) || 10;
        const currentPage = Number(page) || 1;
        const skip = perPage * (currentPage - 1);

        //Send all data
        if (queryParams.limit == undefined && queryParams.page == undefined) {
            pagination = false;
        }

        const searchFields = ["gmttime", "gmtoffset", "timezone_name", "timezone_digit"]; // Define your search fields here
        let matchFileds: any = [];
        let populateFields = [{ path: "country", select: "country" }];

        // Check search parameters
        if (search !== "" && search !== undefined) {
            searchFields.map((data) => {
                searchParams.push({ [data]: { '$regex': search, '$options': 'i' } });
            });
            query = { '$or': searchParams };
        }

        if (country_uuid !== undefined) {
            matchFileds.push({ country_uuid: country_uuid });
            matchFileds = matchFileds[0];
        }else {
            matchFileds = {};
        }

        if (pagination) {
            result = await this.timezone.find({ $and: [query, matchFileds] }).populate(populateFields).limit(perPage).skip(skip).exec();
        } else {
            result = await this.timezone.find({ $and: [query, matchFileds] },{ timezone_name :1 , gmttime : 1 , uuid : 1 , status : 1}).exec();

        }

        //Check length of data
        if (result.length != 0 && pagination == true) {
            totalCount = await this.timezone.find({ $and: [query, matchFileds] }).count().exec();
        }
        let finalResponse = this.commonDbFn.sendResponseWithCount(result.length == 0 ? HttpStatus.NOT_FOUND : HttpStatus.OK, result, totalCount);
        if(pagination == false){
            delete finalResponse.count;
        }
        return finalResponse;
    }


    /*
    @Usage          : To get single timezone record based on uuid
    @Param uuid     : Search timezone by uuid
    @return Object  : Result of timezone 
    */

    async findOne(uuid: string) {

        const timezones = await this.timezone.findOne({ uuid }).exec();
        if (timezones == null) { Logger.error(`Timezone not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Timezone not found" }) }
        Logger.debug(`Timezone success fetched by uuid : ${uuid} \n`);
        return this.sendReponse(HttpStatus.OK, timezones);
    }

    /*
    @Usage                     : Check timezone which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update timezone by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createTimezoneDto: CreateTimezoneDto) {
        const timezoneUpdate = await this.timezone.updateOne({ uuid }, createTimezoneDto).exec();

        if (timezoneUpdate.matchedCount == 0 && timezoneUpdate.modifiedCount == 0) {
            Logger.error(`Timezone uuid was incorrect ${uuid} \n`, putMethod);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Timezone id was incorrect" })
        }
        Logger.debug(`Timezone updated successfully by uuid ${uuid} \n`);
        return this.sendReponse(HttpStatus.OK, "Timezone updated successfully");
    }

    /*
    @Usage         : To update status of timezone[Active/Inactive]
    @Param uuid    : uuid of did
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
            logErrorMsg: `Timezone not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Timezone status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.timezone, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple timezone using uuid
    @Param uuid    : To delete single timezone pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    // async remove(uuid: string) {
    //     const timezoneDelete = await this.timezone.deleteOne({ uuid }).exec();
    //     if (timezoneDelete.deletedCount == 0) {
    //         Logger.error(`Timezone not found by uuid : ${uuid} \n`, deleteMethod);
    //         throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Timezone not found" });
    //     }
    //     Logger.debug(`Timezone deleted successfully by uuid : ${uuid} \n`);
    //     return this.sendReponse(HttpStatus.OK, "Timezone deleted successfully");
    // }

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Timezone not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Timezone deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.timezone, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search timezone using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of timezone with data 
    */

    async advancedSearch(searchParams) {
        let populateFields = [{ path: "country", select: "country" },
        ];
        return this.commonDbFn.advancedSearch(this.timezone, searchParams,
            populateFields
        );
    }

    sendReponse(statusCode, data) { return { statusCode, data }; }

}

