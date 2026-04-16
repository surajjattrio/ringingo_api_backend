import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsJSON, IsNotEmpty, IsNumberString, IsOptional } from "class-validator";

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
export class CreateSipProfileDto {

    @ApiProperty()
    @IsNotEmpty()
    name: string

    @ApiProperty()
    @IsNotEmpty()
    sip_ip: string

    @ApiProperty()
    @IsNotEmpty()
    sip_port: string

    @ApiProperty({ default: JSON.stringify(sipDetails) })
    @IsJSON()
    @IsOptional()
    sip_details?: object

    @ApiProperty({description : "0 - Active | 1 - Inactive" , default : "0"})
    @IsNumberString()
    @IsIn(["0","1"])
    status: string

    uuid? : string
	
}
