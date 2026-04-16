import { Body, Controller, Get, Post, Put , Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateMailConfigurationDto } from "../dto/create-mail-configuration.dto";
import { MailConfigurationService } from "../services/mail-configuration.service";

@Controller("mail-configuration")

/*@Usage : To provide title of API in swagger */
@ApiTags("Mail Configuration")

export class MailConfigurationController {

    /*
    @Usage  : To load mail configuration service and other libraries
    @return : Object[mail_configuration] 
    */

    constructor(private readonly mail_configuration: MailConfigurationService) { }

    @Post()
    @postDecoraters("Mail configuration created successfully", "Create a new mail configuration")

    /*
    @Usage              : To create new mail configuration
    @Method             : POST
    @Param host         : string
    @Param username     : string
    @Param password     : string
    @Param port         : string
    @Param status       : integer [Default 0]
    @return Object      : Mail configuration created successfully
    */

    create(@Body() createMailConfigurationDto: CreateMailConfigurationDto) {
        return this.mail_configuration.create(createMailConfigurationDto);
    }

    @Get()
    @getDecoraters("Retrieved single mail configuration successfully", "List single mail configuration using uuid")

    /*
    @Usage               : List single mail configuration using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid mail configuration
    */

    findOne(@Query() queryParam) {
        return this.mail_configuration.findOne(queryParam);
    }

    @Put()
    @putDecoraters("Mail configuration update successfully", "Update single mail configuration using uuid")

    /*
    @Usage                          : Update single mail configuration using uuid
    @Method                         : PUT
    @Param host                     : string
    @Param username                 : string
    @Param password                 : string
    @Param port                     : string
    @Param status                   : integer [Default 0]
    @Param ParseUUIDPipe            : To validate uuid
    @return Object                  : Mail configuration updated successfully
    */

    update(@Body() createMailConfigurationDto: CreateMailConfigurationDto) {
        return this.mail_configuration.update(createMailConfigurationDto);
    }


}
