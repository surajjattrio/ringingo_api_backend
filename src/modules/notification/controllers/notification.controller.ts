import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Public } from "src/global_constant";
import { PushNotification } from "src/modules/common/services/push-notification";

@Controller("notification")

export class NotificationController {

    constructor(
        private readonly notification: PushNotification
    ) { }
    
    @Public()
    @Post()

    /*
    @Usage                : To send push notification to android/ios devices
    @Method               : POST
    @Param  requestParams : Request param that need to send to mobile devices [This API is calling from FS side]
    @return object	  : Success / Error
    */

    sendPushNotification(@Body() requestParams) {
        const { mobile_type, token , caller_id , caller_name , notify_call_type , call_uuid } = requestParams;
        if (mobile_type == "android") {
            return this.notification.sendPushNotificationToAndroid(token,caller_id,caller_name , notify_call_type , call_uuid);
        } else { // For IOS
            return this.notification.sendPushNotificationToIOS(token,caller_id,caller_name , notify_call_type , call_uuid);
        }
    }
}
