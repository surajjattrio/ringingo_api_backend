import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import * as handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { CommonFunctions } from "./common_functions";
@Injectable()

export class MailService {

    constructor(private readonly CommonFn : CommonFunctions) { }

    async sendMail(userInfo,parentSMTPDetails,mailSentURL) {
        const { email , uuid } = userInfo;
        const { host , username , password , port } = parentSMTPDetails;

        let encryptUUID = this.CommonFn.encode(uuid);
        const emailTemplateSource = fs.readFileSync(path.join(__dirname, "../../mail-templates/forgot-password.hbs"), "utf8");
        var transporter = nodemailer.createTransport({
            pool: true,
            maxConnections: 10,
            host : host,
            auth: { user: username, pass: password }
        });


        const template = handlebars.compile(emailTemplateSource)
        const htmlToSend = template({ message: `${mailSentURL}/${encryptUUID}` })

        var mailOptions = {
            to : email,
            from: username,
            subject: "Forgot password",
            html: htmlToSend
        };

        // verify connection configuration
        transporter.verify(function (error, success) {
            console.log("Server is ready to take our messages");
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    Logger.debug("Invalid mail server credentails");
                    return;
                }
                Logger.debug(`Mail sent successfully to ${email}!!! , if not received check your given email is correct or not"`);
		return true;
                // console.log('Message sent: %s', info.messageId);
                
            });
        });
    }

    async sendReportMail(mailConfig: any, reportDataCsvOrAttachments: string | Array<{ filename: string, content: string }>, emailBody: string, reportName: string) {
        const { host, username, password, port, to, from } = mailConfig;
        console.log(`Preparing`,mailConfig);
        
        const decryptedPassword = this.CommonFn.decode(password);
        
        var transporter = nodemailer.createTransport({
            pool: true,
            maxConnections: 10,
            host: host,
            port: Number(port) || 587,
            auth: { user: username, pass: decryptedPassword },
            secure: Number(port) === 465
        });

        let attachments: any[] = [];
        if (Array.isArray(reportDataCsvOrAttachments)) {
            attachments = reportDataCsvOrAttachments.map(att => ({
                filename: att.filename,
                content: att.content,
                contentType: 'text/csv'
            }));
        } else {
            attachments = [
                {
                    filename: `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`,
                    content: reportDataCsvOrAttachments,
                    contentType: 'text/csv'
                }
            ];
        }

        var mailOptions = {
            to: to.join(','),
            from: from || username,
            subject: `Scheduled Report: ${reportName}`,
            html: emailBody || `<p>Please find the attached ${reportName} report.</p>`,
            attachments: attachments
        };

        return new Promise((resolve, reject) => {
            transporter.verify(function (error, success) {
                if (error) {
                    Logger.error("SMTP verification failed: ", error);
                    return reject(error);
                }
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        Logger.error("Failed to send scheduled report: ", error);
                        return reject(error);
                    }
                    Logger.debug(`Scheduled report sent successfully to ${mailOptions.to}`);
                    resolve(true);
                });
            });
        });
    }
}
