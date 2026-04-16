import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Document } from "mongoose";
export type SipProfileDocument = SipProfileSchema & Document;
let sipDetails = {
    "rtp-ip": "$${local_ip_v4}",
    "dialplan": "XML",
    "user-agent-string": "ASTPP",
    "debug": "0",
    "sip-trace": "no",
    "tls": false,
    "inbound-reg-force-matching-username": true,
    "disable-transcoding": true,
    "all-reg-options-ping": false,
    "unregister-on-options-fail": true,
    "log-auth-failures": true,
    "status": "0",
    "inbound-bypass-media": false,
    "inbound-proxy-media": false,
    "disable-transfer": false,
    "enable-100rel": false,
    "rtp-timeout-sec": "300",
    "dtmf-duration": "2000",
    "manual-redirect": true,
    "aggressive-nat-detection": true,
    "enable-timer": false,
    "minimum-session-expires": "120",
    "session-timeout-pt": "1800",
    "auth-calls": true,
    "apply-inbound-acl": "default",
    "inbound-codec-prefs": "PCMA,PCMU",
    "outbound-codec-prefs": "PCMA,PCMU",
    "inbound-late-negotiation": false,
    "sip-capture": "no",
    "forward-unsolicited-mwi-notify": false,
    "context": "default",
    "rfc2833-pt": "101",
    "rtp-timer-name": "soft",
    "hold-music": "$${hold_music}",
    "manage-presence": true,
    "presence-hosts": "$${domain},$${local_ip_v4}",
    "presence-privacy": "$${presence_privacy}",
    "inbound-codec-negotiation": "generous",
    "auth-all-packets": false,
    "ext-rtp-ip": "$${local_ip_v4}",
    "ext-sip-ip": "$${local_ip_v4}",
    "rtp-hold-timeout-sec": "1800",
    "challenge-realm": "auto_from",
    "nonce-ttl": "60",
    "pass-callee-id": false,
    "dtmf_type": "rfc2833"
}
@Schema({ collection : "sip_profile" , timestamps : true })
export class SipProfileSchema {

    @Prop({ type: String, default: function genUUID() { return randomUUID();} , unique : true })
    uuid: string

    @Prop()
    name : String

    @Prop()
    sip_ip : String

    @Prop()
    sip_port : String

    @Prop({type : Object , default : JSON.stringify(sipDetails)})
    sip_details? : Object

    @Prop()
    status : String
}

export const sipProfileSchema = SchemaFactory.createForClass(SipProfileSchema);