import { Logger, HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CreateMailConfigurationDto } from "../dto/create-mail-configuration.dto";
import * as nodemailer from 'nodemailer';
import { MailConfigurationDocument, MailConfigurationSchema } from "../schema/mail-configuration.schema";
import { ApiConfiguration, ApiConfigurationDocument } from "../../api-configuration/schema/api-configuration.schema";
import axios from "axios";

import { EmailTemplateDocument, EmailTemplateSchema } from "../../email-template/schema/email-template.schema";

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
        @InjectModel(EmailTemplateSchema.name) private readonly email_template: Model<EmailTemplateDocument>,
        @InjectModel(ApiConfiguration.name) private readonly api_configuration: Model<ApiConfigurationDocument>,
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

    async findAll(queryParam) {
        const { tenant_uuid, search, page = 1, limit = 10 } = queryParam;
        let query: any = {};
        if (tenant_uuid) query.tenant_uuid = tenant_uuid;
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const skip = (page - 1) * limit;
        const data = await this.mail_configuration.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).exec();
        const count = await this.mail_configuration.countDocuments(query).exec();

        const decodedData = data.map((item) => {
            const doc = item.toObject();
            if (doc.password) {
                doc.password = this.commonFn.decode(doc.password);
            }
            return doc;
        });

        return this.commonDbFn.sendResponseWithCount(HttpStatus.OK, decodedData || [], count || 0);
    }

    async findOne(queryParam) {
        const { uuid, tenant_uuid } = queryParam;
        let query: any = {};
        if (uuid) query.uuid = uuid;
        else if (tenant_uuid) query.tenant_uuid = tenant_uuid;

        let response = await this.mail_configuration.findOne(query).populate('templates').exec();
        if (response == null) {
            Logger.error(`Mail configuration not found by query : ${JSON.stringify(query)} \n`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Mail configuration not found`);
        } else {
            const data = response.toObject();
            data.password = this.commonFn.decode(data.password);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, data);
        }
    }

    async update(updateData: any) {
        const { uuid, tenant_uuid } = updateData;
        let query: any = {};
        if (uuid) query.uuid = uuid;
        else query.tenant_uuid = tenant_uuid;

        if (updateData.password) {
            updateData.password = this.commonFn.encode(updateData.password);
        }
        let response = await this.mail_configuration.updateOne(query, updateData).exec();
        if (response.modifiedCount > 0) {
            Logger.debug(`Mail configuration updated successfully by query : ${JSON.stringify(query)} \n`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Mail configuration updated successfully`);
        } else {
            Logger.debug(`Mail configuration not found by query : ${JSON.stringify(query)} \n`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Mail configuration not found`);
        }
    }

    async delete(uuid: string) {
        let response = await this.mail_configuration.deleteOne({ uuid }).exec();
        if (response.deletedCount > 0) {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Mail configuration deleted successfully`);
        } else {
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, `Mail configuration not found`);
        }
    }

    async testSmtp(payload: any) {
        const { host, port, username, password } = payload;

        try {
            const transporter = nodemailer.createTransport({
                host,
                port: Number(port),
                secure: Number(port) === 465,
                auth: {
                    user: username,
                    pass: password,
                },
            });

            // Verify connection configuration (this checks if host/port/auth are valid)
            await transporter.verify();

            // Send a very simple text email to confirm it actually works
            await transporter.sendMail({
                from: username,
                to: username,
                subject: "SMTP Configuration Test",
                text: "Success! This email confirms that your SMTP settings are valid and working correctly.",
            });

            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "SMTP connection successful.");
        } catch (error: any) {
            Logger.error(`SMTP Test failed: ${error.message}`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, `SMTP connection failed: ${error.message}`);
        }
    }
    async getAllowedTemplates(config_uuid: string) {
        const config = await this.mail_configuration.findOne({ uuid: config_uuid }).exec();
        if (!config) {
            Logger.error(`[getAllowedTemplates] Mail configuration not found: ${config_uuid}`);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, "Mail configuration not found");
        }

        let templates = [];
        if (config.template_ids && config.template_ids.length > 0) {
            // If specific templates are linked, we fetch them regardless of status 
            // (assuming the admin explicitly wanted these available)
            templates = await this.email_template.find({ uuid: { $in: config.template_ids } }).exec();
        } 
        
        // If no specific templates linked OR none of the linked ones exist, 
        // fallback to all ACTIVE templates for the tenant
        if (templates.length === 0) {
            templates = await this.email_template.find({ tenant_uuid: config.tenant_uuid, status: "0" }).exec();
        }

        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, templates);
    }

    async sendEmail(payload: any) {
        const { config_uuid, to, subject, body, lead_data } = payload;
        Logger.log(`[sendEmail] Attempting to send email to ${to} using config ${config_uuid}`);

        try {
            let config = await this.mail_configuration.findOne({ uuid: config_uuid }).exec();
            console.log(config,'configsss');
            
            if (!config) {
                throw new Error(`Mail configuration not found for UUID: ${config_uuid}`);
            }

            const decodedPassword = this.commonFn.decode(config.password.toString());
            Logger.log(`[sendEmail] SMTP Config: Host=${config.host}, Port=${config.port}, User=${config.username}`);

            const transporter = nodemailer.createTransport({
                host: config.host.toString(),
                port: Number(config.port),
                secure: Number(config.port) === 465,
                auth: {
                    user: config.username.toString(),
                    pass: decodedPassword,
                },
                tls: {
                    rejectUnauthorized: false // Allow self-signed certificates or common dev issues
                }
            });

            // Replace tags in subject and body
            let processedSubject = subject || "";
            let processedBody = body || "";

            if (lead_data && Object.keys(lead_data).length > 0) {
                const tags = {
                    "[FIRSTNAME]": lead_data.first_name || "",
                    "[LASTNAME]": lead_data.last_name || "",
                    "[ADDRESS]": lead_data.address || "",
                    "[CITY]": lead_data.city || "",
                    "[PROVINCE]": lead_data.province || "",
                    "[DOB]": lead_data.dob || "",
                    "[PHONECODE]": lead_data.phone_code || "",
                    "[ALTPHONE]": lead_data.alternate_phone_number || "",
                    "[EMAIL]": lead_data.email || "",
                    "[GENDER]": lead_data.gender || "",
                    "[COMMENT]": lead_data.description || lead_data.comment || "",
                    "[POSTALCODE]": lead_data.postal_code || "",
                };

                for (const [tag, value] of Object.entries(tags)) {
                    processedSubject = processedSubject.split(tag).join(value);
                    processedBody = processedBody.split(tag).join(value);
                }
            }

            const { cc, bcc } = payload;
            const mailOptions: any = {
                from: config.from ? config.from.toString() : config.username.toString(),
                // to,
                subject: processedSubject,
                html: processedBody,
            };

	     const recipientTo = to || (config.to && config.to.length ? config.to : undefined);
            if (recipientTo) {
                mailOptions.to = Array.isArray(recipientTo) ? recipientTo.join(',') : recipientTo;
            }

            const recipientCc = cc || (config.cc && config.cc.length ? config.cc : undefined);
            if (recipientCc) {
                mailOptions.cc = Array.isArray(recipientCc) ? recipientCc.join(',') : recipientCc;
            }

            const recipientBcc = bcc || (config.bcc && config.bcc.length ? config.bcc : undefined);
            if (recipientBcc) {
                mailOptions.bcc = Array.isArray(recipientBcc) ? recipientBcc.join(',') : recipientBcc;
            }
	     Logger.log(`[sendEmail] Sending mail from ${mailOptions.from} to ${mailOptions.to || '(none)'} (CC: ${mailOptions.cc || '(none)'}, BCC: ${mailOptions.bcc || '(none)'})`);

            const info = await transporter.sendMail(mailOptions);
            Logger.log(`[sendEmail] Email sent successfully: ${info.messageId}`);

            return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Email sent successfully.");
        } catch (error: any) {
            Logger.error(`[sendEmail] Failed to send email: ${error.message}`);
            // Log stack trace for deeper debugging if needed
            if (error.stack) Logger.debug(error.stack);
            
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, `Failed to send email: ${error.message}`);
        }
    }
}

