import { Body, Controller, Get, Post, Put, Delete, Query, Param } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters, deleteDecoraters } from "src/swagger/swagger_decoraters";
import { CreateEmailTemplateDto } from "../dto/create-email-template.dto";
import { UpdateEmailTemplateDto } from "../dto/update-email-template.dto";
import { EmailTemplateService } from "../services/email-template.service";

@Controller("email-template")
@ApiTags("Email Template")
export class EmailTemplateController {
    constructor(private readonly emailTemplateService: EmailTemplateService) { }

    @Post()
    @postDecoraters("Email template created successfully", "Create a new email template")
    create(@Body() createEmailTemplateDto: CreateEmailTemplateDto) {
        return this.emailTemplateService.create(createEmailTemplateDto);
    }

    @Get()
    @getDecoraters("Retrieved all email templates successfully", "List all email templates")
    findAll(@Query() queryParam) {
        return this.emailTemplateService.findAll(queryParam);
    }

    @Post("advanced-search")
    @postDecoraters("Advanced search successful", "Search email templates with filters")
    advancedSearch(@Body() searchParams) {
        return this.emailTemplateService.advancedSearch(searchParams);
    }

    @Get(":uuid")
    @getDecoraters("Retrieved single email template successfully", "Get single email template using uuid")
    findOne(@Param("uuid") uuid: string) {
        return this.emailTemplateService.findOne(uuid);
    }

    @Put(":uuid")
    @putDecoraters("Email template updated successfully", "Update single email template using uuid")
    update(@Param("uuid") uuid: string, @Body() updateEmailTemplateDto: UpdateEmailTemplateDto) {
        return this.emailTemplateService.update(uuid, updateEmailTemplateDto);
    }

    @Delete(":uuid")
    @deleteDecoraters("Email template deleted successfully", "Delete single email template using uuid")
    remove(@Param("uuid") uuid: string) {
        return this.emailTemplateService.remove(uuid);
    }
}
