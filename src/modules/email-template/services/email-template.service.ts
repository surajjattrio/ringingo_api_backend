import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateEmailTemplateDto } from "../dto/create-email-template.dto";
import { EmailTemplateDocument, EmailTemplateSchema } from "../schema/email-template.schema";

@Injectable()
export class EmailTemplateService {
    constructor(
        @InjectModel(EmailTemplateSchema.name) private readonly email_template: Model<EmailTemplateDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    async create(createEmailTemplateDto: CreateEmailTemplateDto) {
        let logMessages = {
            logSuccessMsg: "Email template created successfully \n"
        }
        return this.commonDbFn.insert(this.email_template, createEmailTemplateDto, JSON.stringify(logMessages));
    }

    async findAll(queryParams) {
        let searchFields = ["name", "subject"];
        return this.commonDbFn.findAllWithPagination(this.email_template, queryParams, searchFields, [], "", true, true);
    }

    async findOne(uuid: string) {
        const template = await this.email_template.findOne({ uuid }).exec();
        if (template == null) {
            throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Email template not found" });
        }
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, template);
    }

    async update(uuid: string, updateEmailTemplateDto: CreateEmailTemplateDto) {
        let logMessages = {
            logErrorMsg: `Email template not found by uuid : ${uuid} \n`,
            logSuccessMsg: `Email template updated successfully by uuid : ${uuid} \n`
        }
        return this.commonDbFn.update(this.email_template, uuid, updateEmailTemplateDto, JSON.stringify(logMessages));
    }

    async remove(uuid: string) {
        let logMessages = {
            logErrorMsg: `Email template not exist by uuid : ${uuid} \n`,
            logSuccessMsg: `Email template deleted successfully by uuid : ${uuid} \n`
        };
        return await this.commonDbFn.delete(this.email_template, { uuid }, JSON.stringify(logMessages));
    }

    async advancedSearch(searchParams) {
        return this.commonDbFn.advancedSearch(this.email_template, searchParams, []);
    }
}
