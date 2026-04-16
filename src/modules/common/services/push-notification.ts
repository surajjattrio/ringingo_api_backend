import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { CommonDBFunctions } from "../common_db_functions";
let apn = require('apn');
let FCM = require('fcm-node');
let apnProvider;

@Injectable()

export class PushNotification {

    constructor(
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    /*
    @Usage                          : To send push notification to Android device
    @Method                         : POST
    @return success / error object  : { Notification sent successfully to Android device / Error occured in sending notification to Android device }
    */

    async sendPushNotificationToAndroid(token, caller_id, caller_name , notify_call_type , call_uuid) {
        try {
            //Need user details here dynamic
            let serverkey = process.env.FIREBASE_SERVER_KEY;
            let fcm = new FCM(serverkey);
            // let to = "7c8eb819784716ca9291bab590f265f24788c7ccfdc9aa21888b4e3bbe413fbd";
            let to = token;
            let message = {
                //Make this dynamic[to]
                to,
                // collapse_key: 'XXX',
                data: {
		  title: 'Call notification',
                  body: { caller_id,caller_name ,notify_call_type , call_uuid }
		},
                //timeToLive: 60 * 60 * 24
                priority: "high",
                /*notification: {
                    title: 'Call notification',
                    body: {
                        caller_id,
                        caller_name
                    }
                }*/
            };
            let response: any = await this.sendNotification(fcm, message);
            response = JSON.parse(response);
            let statusCode = response.success != 0 ? HttpStatus.OK : HttpStatus.NOT_FOUND;
            return this.commonDbFn.sendResponseWithMessage(statusCode, JSON.stringify(response));
        } catch (error) {
            Logger.error(`Error catched in catch block`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, error.message);
        }
    }

    /*
    @Usage                          : To send push notification to IOS device
    @Method                         : POST
    @return success / error object  : { Notification sent successfully to IOS device / Error occured in sending notification to IOS device }
    */

    async sendPushNotificationToIOS(token, caller_id, caller_name , notify_call_type , call_uuid) {
        try {
            if (apnProvider == undefined) {
                //Provider Options
                let production = process.env.PRODUCTION_STATUS == "false" ? false : true;
                let options = {
                    token: {
                        key: process.env.P8_CERT_PATH,
                        keyId: process.env.KEY_ID,
                        teamId: process.env.TEAMS_ID
                    },
                    production
                };
                //Generate APN provider
                apnProvider = new apn.Provider(options);
            }
            //Create Notification body
            let note = new apn.Notification();

            /*note.expiry = Math.floor(Date.now() / 1000) + 3600; // Expires 1 hour from now.
            note.badge = 3;
            note.sound = "ping.aiff";
            note.alert = "\uD83D\uDCE7 \u2709 You have a new message"; */
            // note.payload = { 'messageFrom': 'BELSMART HAI BHAI NOTIFICATION' };
            let payload = {
                caller_id,
                caller_name,
		notify_call_type,
		call_uuid
            }
            note.payload = payload;
            note.topic = process.env.TOPIC;

            //Make this dynamic[deviceToken]
            // let deviceToken = "7c8eb819784716ca9291bab590f265f24788c7ccfdc9aa21888b4e3bbe413fbd";
            let deviceToken = token;
            let result = await apnProvider.send(note, deviceToken);

            Logger.debug("Notification Response :", JSON.stringify(result));
            if (result.failed.length > 0) {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, JSON.stringify(result));
            } else {
                return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, `Notification sent successfully to IOS device`);
            }
        } catch (error) {
            Logger.error(`Error occured in sending notification to IOS device`, error.message);
            return this.commonDbFn.sendResponseWithMessage(HttpStatus.NOT_FOUND, error.message);
        }
    }

    /*
    @Usage                          : To send push notification to Android device
    @Method                         : POST
    @return success / error object  : { Notification sent successfully to Android device / Error occured in sending notification to Android device }
    */

    sendNotification(fcm, message) {
        return new Promise((resolve, reject) => {
            fcm.send(message, function (err, response) {
                if (err) {
                    resolve(err)
                } else {
                    resolve(response)
                }
            });
        })
    }
}
