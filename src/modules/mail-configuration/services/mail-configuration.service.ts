import { Logger, HttpStatus , Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CreateMailConfigurationDto } from "../dto/create-mail-configuration.dto";
import { MailConfigurationDocument, MailConfigurationSchema } from "../schema/mail-configuration.schema";

@Injectable()

export class MailConfigurationService {
    /*
    @Usage              : To load mail configuration schema and other libraries
    @Param @InjectModel : It will load mail configuration schema
    @Param commonFn     : To use common created function
    @Param commonDbFn   : To use commonly created mongoDB functions
    @return Object      : [mail_configuration,commonFn,commonDbFn] 
  */

    constructor(
        @InjectModel(MailConfigurationSchema.name) private readonly mail_configuration: Model<MailConfigurationDocument>,
        private readonly commonDbFn: CommonDBFunctions,
        private readonly commonFn: CommonFunctions,
    ) { }

    /*
    @Usage                            : To insert a new mail configuration
    @Param createMailConfigurationDto : Request paramter that we set into dto
    @return Object                    : Success / Error 
    */

    create(createMailConfigurationDto: CreateMailConfigurationDto) {
        createMailConfigurationDto.password = this.commonFn.encode(createMailConfigurationDto.password);
        let logMessages = {
            logSuccessMsg: "Mail configuration created successfully \n"
        }
        return this.commonDbFn.insert(this.mail_configuration, createMailConfigurationDto, JSON.stringify(logMessages));
    }

    /*
    @Usage          : To get single mail configuration record based on uuid
    @Param uuid     : Search mail configuration by uuid
    @return Object  : Result of mail configuration 
    */
     
   async findOne(queryParam) {
        const { tenant_uuid } =  queryParam;
        let response = await this.mail_configuration.findOne({tenant_uuid}).exec();
        if(response == null){
            Logger.error(`Mail configuration not found by uuid : ${tenant_uuid} \n`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND,`Mail configuration not found`);
        }else{
            Logger.debug(`Mail configuration success fetched by uuid : ${tenant_uuid} \n`);
            response.password = this.commonFn.decode(response.password);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK,response);
        }
    }

    /*
    @Usage                                : To update mail configuration
    @Param uuid                           : Update mail configuration  by uuid
    @Param createMailConfigurationDto     : Request parameters for update
    @return Object                        : Success / Error 
    */

     async update(createMailConfigurationDto: CreateMailConfigurationDto) {
        const { tenant_uuid } = createMailConfigurationDto;
        createMailConfigurationDto.password = this.commonFn.encode(createMailConfigurationDto.password);
        let response = await this.mail_configuration.updateOne({ tenant_uuid }, createMailConfigurationDto).exec();
        if (response.modifiedCount > 0) {
            Logger.debug(`Mail configuration updated successfully by uuid : ${tenant_uuid} \n`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Mail configuration updated successfully`);
        } else {
            Logger.debug(`Tenant not found by uuid : ${tenant_uuid} \n`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Mail configuration not found`);
        }
    }
}
