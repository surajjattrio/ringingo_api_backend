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
}
