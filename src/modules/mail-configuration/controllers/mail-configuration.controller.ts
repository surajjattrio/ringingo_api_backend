import { Body, Controller, Get, Post, Put, Delete, Query, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters, deleteDecoraters } from "src/swagger/swagger_decoraters";
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
    @getDecoraters("Retrieved all mail configurations successfully", "List all mail configurations for a tenant")
    findAll(@Query() queryParam) {
        return this.mail_configuration.findAll(queryParam);
    }

    @Get("single")
    @getDecoraters("Retrieved single mail configuration successfully", "Get single mail configuration using uuid or tenant_uuid")
    findOne(@Query() queryParam) {
        return this.mail_configuration.findOne(queryParam);
    }

    @Put(":uuid")
    @putDecoraters("Mail configuration update successfully", "Update single mail configuration using uuid")
    update(@Param("uuid") uuid: string, @Body() body: any) {
        body.uuid = uuid;
        return this.mail_configuration.update(body);
    }

    @Post("test-smtp")
    @postDecoraters("SMTP connection tested successfully", "Test SMTP configuration credentials")
    testSmtp(@Body() payload: any) {
        return this.mail_configuration.testSmtp(payload);
    }

    @Get("allowed-templates/:config_uuid")
    @getDecoraters("Retrieved allowed templates successfully", "Get all templates linked to a mail configuration")
    getAllowedTemplates(@Param("config_uuid") config_uuid: string) {
        return this.mail_configuration.getAllowedTemplates(config_uuid);
    }

    @Post("send-email")
    @postDecoraters("Email sent successfully", "Send email using a mail configuration")
    sendEmail(@Body() payload: any) {
        return this.mail_configuration.sendEmail(payload);
    }

    @Delete()
    @deleteDecoraters("Mail configuration deleted successfully", "Delete single mail configuration using uuid")
    delete(@Query("uuid") uuid: string) {
        return this.mail_configuration.delete(uuid);
    }
}

