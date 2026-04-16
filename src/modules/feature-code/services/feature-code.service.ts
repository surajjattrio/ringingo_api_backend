import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { UpdateFeatureCodeDto } from "../dto/update-feature-code.dto";
import { FeatureCodeDocument, FeatureCodeSchema } from "../schema/feature-code.schema";

@Injectable()

export class FeatureCodeService {

    /*
    @Usage              : To load feature code schema and other libraries
    @Param @InjectModel : It will load feature code schema
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [feature_code,commonDbFn] 
    */

    constructor(
        @InjectModel(FeatureCodeSchema.name) private readonly feature_code: Model<FeatureCodeDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of feature code with data 
    */

    async findAll(queryParams) {
        let searchFields = ["name", "description", "feature_code"];
        return this.commonDbFn.findAllWithPagination(this.feature_code, queryParams, searchFields, "", "", false);
    }

    /*
    @Usage          : To get single feature code record based on uuid
    @Param uuid     : Search feature code by uuid
    @return Object  : Result of feature code 
    */

    async findOne(uuid: string) {
        let logMessages = {
            logErrorMsg: `Feature code not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Feature code success fetched by uuid : ${uuid} \n`
        }
        return this.commonDbFn.findOne(this.feature_code, uuid, JSON.stringify(logMessages));
    }

    /*
    @Usage                          : Check feature_code which comes in request for update already exist or not, if not it will update else it will throw error
    @Param uuid                     : Update feature code by uuid
    @Param updateFeatureCodeDto     : Request parameters for update
    @return Object                  : Success / Error 
    */

    async update(uuid: string, updateFeatureCodeDto: UpdateFeatureCodeDto) {

        const { feature_code, tenant_uuid } = updateFeatureCodeDto;
        const getFeatureCode = await this.feature_code.findOne({ uuid }).exec();

        if (getFeatureCode?.feature_code != feature_code) {
            const checkFeatureCodeExist = await this.feature_code.find({ $and: [{ feature_code }, { tenant_uuid }] }).count().exec();
            if (checkFeatureCodeExist > 0) {
                Logger.error("Feature code already exist \n", putMethod);
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Feature code already exist`);
            }
        }
        let logMessages = {
            logErrorMsg: `Feature code not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Feature code updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.feature_code, uuid, updateFeatureCodeDto, JSON.stringify(logMessages));
    }
}