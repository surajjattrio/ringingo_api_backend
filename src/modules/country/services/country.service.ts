import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateCountryDto } from "../dto/create-country.dto";
import { CountryDocument, CountrySchema } from "../schema/country.schema";

@Injectable()

export class CountryService {

    /*
    @Usage              : To load country schema and other libraries
    @Param @InjectModel : It will load country schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [countries,commonDbFn] 
    */

    constructor(
        @InjectModel(CountrySchema.name) private readonly countries: Model<CountryDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                  : First it will check whether given country exist or not , if not then new country will be created else it will throw error
    @Param createCountryDto : Request paramter that we set into dto
    @return Object          :  Success / Error 
    */

    async create(createCountryDto: CreateCountryDto) {

        const { country, countrycode } = createCountryDto;
        let where = [{ country }, { countrycode }];
        let logMessages = {
            logErrorMsg: "Country already exist \n",
            logSuccessMsg: "Country created successfully \n"
        }
        return this.commonDbFn.findAndInsert(this.countries, where, createCountryDto, JSON.stringify(logMessages), "and");
    }

    // async findAll() {
    //     // return this.commonDbFn.findAll(this.countries);
    //     let result = await this.countries.aggregate([
    //         {
    //             $facet: {
    //                 count: [{ $count: "total" }],
    //                 data: [{ $match: {} }, { $sort: { country: 1 } }],
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
    @return Object     : Array of an object with total count of countries with data 
    */

    async findAll(queryParams) {
        let searchFields = ["country", "nicename","capital","iso","iso3","countrycode","latitude","longitude"];
       
        return this.commonDbFn.findAllWithPagination(this.countries, queryParams, searchFields,"",{country : 1});
    }
    /*
    @Usage          : To get single country record based on uuid
    @Param uuid     : Search country by uuid
    @return Object  : Result of country 
    */
    async findOne(uuid: string) {
        const country = await this.countries.findOne({ uuid }).exec();
        if (country == null) { Logger.error(`Country not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException() }
        Logger.debug(`Country success fetched by uuid : ${uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, country);
    }

    /*
    @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                : Update country by uuid
    @Param updateTenantDto     : Request parameters for update
    @return Object             : Success / Error 
    */

    async update(uuid: string, createCountryDto: CreateCountryDto) {
        const countryUpdate = await this.countries.updateOne({ uuid }, createCountryDto).exec();

        if (countryUpdate.matchedCount == 0 && countryUpdate.modifiedCount == 0) {
            Logger.error(`Country uuid was incorrect ${uuid} \n`, putMethod);
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Country id was incorrect" })
        }
        Logger.debug(`Country updated successfully by uuid ${uuid} \n`);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Country updated successfully");
    }

    /*
    @Usage         : To update status of country[Active/Inactive]
    @Param uuid    : uuid of did
    @Param body    : Contains update body
    @return Object : Success / Error 
    */

    async patch(uuid: string, body) {
        let logMessages = {
        logErrorMsg: `Country not found by uuid : ${uuid} \n`,
        logSuccessMsg: `Country status updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.countries, uuid, body, JSON.stringify(logMessages));
    }

    /*
    @Usage         : Delete single or multiple country using uuid
    @Param uuid    : To delete single country pass one uuid , for multiple pass comma separated uuids without space
    @return Object : Success / Error 
    */

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Country not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Country deleted successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.delete(this.countries, { uuid }, JSON.stringify(logMessages));
    }

    /*
    @Usage              : To search countries using advanced search
    @Param searchParams : Contains search paramaters
    @return Object      : Array of an object with total count of countries with data 
    */

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.countries, searchParams);
        } 
}
