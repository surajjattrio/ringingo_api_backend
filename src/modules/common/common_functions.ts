import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { createCipheriv, createDecipheriv } from 'crypto';
import * as fs from "fs";
import * as esl from "modesl";
import { parseString } from "xml2js";
const axios = require( "axios" );
const qs = require( "qs" );
const ip = require( "ip" );
import * as moment from "moment";

@Injectable()
// export class CommonFunctions implements OnModuleInit {
export class CommonFunctions {
    // export class CommonFunctions {      // Remove or un-comment this line on production server

    private fsConnection;
    //  un-comment this line on production server
    async onModuleInit() {
        try {
            if (process.env.ENABLE_FS === 'true') {
                this.fsConnection = await this.getFsConnection();
            } else {
                // 👇 dummy fallback so .api() won't break
                this.fsConnection = {
                    api: (cmd: string, cb: Function) => {
                        Logger.warn(`FS disabled, skipping command: ${cmd}`);
                        // cb?.({ body: 'FS disabled' });
                        cb?.({ getBody: () => 'FS disabled' });
                    },
                    disconnect: (cb?: Function) => {
                        // No-op when FS is disabled
                        cb?.();
                    },
                };
            }
        } catch (error) {
            Logger.error(`Unable to establish connection with FS, error.message`);
        }
    }

    constructor() { }

    /*
    @Usage          : To encode given value
    @Param value    : Contains value which need to be encoded
    @return         : It will return encoded value
    */

    encode ( value ) {
        const cipher = createCipheriv( process.env.ALGORITHM, process.env.ENCRYPTION_KEY, process.env.PASSWORD_LENGTH );
        let encryptedData = cipher.update( value, "utf-8", "hex" );
        encryptedData += cipher.final( "hex" );
        return encryptedData;
    }

    /*
    @Usage          : To decode given value
    @Param value    : Contains encoded value
    @return         : It will return decoded value
    */

    decode ( value ) {
        const decipher = createDecipheriv( process.env.ALGORITHM, process.env.ENCRYPTION_KEY, process.env.PASSWORD_LENGTH );
        let decryptedData = decipher.update( value, "hex", "utf-8" );
        decryptedData += decipher.final( "utf8" );
        return decryptedData;
    }

    /*
    @Usage                 : To generate sip profile
    @Param sipProfile      : Contains details of sip profile
    @Param tenantDetails   : Contains details of tenant
    @Param trunkDetails    : Contains details of trunk
    @return                : XML file with uuid of sip profile
    */

    // generateSipProfile ( sipProfile, tenantDetails, trunkDetails ) {
    //     let xml_dial_plan = "";
    //     xml_dial_plan = xml_dial_plan + `<profile name="${sipProfile?.name}">\n`;
    //     xml_dial_plan = xml_dial_plan + '<domains>\n';
    //     xml_dial_plan = xml_dial_plan + '<domain name="$${local_ip_v4}" alias="true" parse="true" />\n';
    //     xml_dial_plan = xml_dial_plan + '</domains>\n';
    //     xml_dial_plan = xml_dial_plan + '<aliases>\n';

    //     //Add all tenant with this sip profile
    //     xml_dial_plan += this.addAllTenant( tenantDetails );

    //     //Add json body of sip_details
    //     xml_dial_plan += this.addAllParamsOfSipProfile( sipProfile );

    //     //Add all trunk/gateway
    //     xml_dial_plan += this.addAllTrunk( trunkDetails );
    //     xml_dial_plan = xml_dial_plan + '</profile>';

    //     let sipProfileuuid = sipProfile?.uuid;

    //     //Not to create file when sip profile uuid is undefined
    //     if ( sipProfileuuid != undefined ) {
    //         let call_queue_file_name = `${process.env.SIP_PROFILE_DIRECTORY}${sipProfileuuid}.xml`;
    //         fs.writeFile( call_queue_file_name, xml_dial_plan.toString(), ( err ) => {
    //             if ( err ) {
    //                 Logger.error( `${err} error to written in ${sipProfileuuid}.xml` );
    //                 throw err;
    //             }
    //             Logger.debug( `${sipProfileuuid}.xml has been written to file successfully.` );
    //         } );
    //     } else {
    //         Logger.debug( `Sip profile not created due to uuid was defined` );
    //     }
    // }

    generateSipProfile ( sipProfile, tenantDetails, trunkDetails ) {
        let xml_dial_plan = "";
        let xml_gateway = "";
        xml_dial_plan = xml_dial_plan + `<profile name="${sipProfile?.name}">\n`;
        xml_dial_plan = xml_dial_plan + '<domains>\n';
        xml_dial_plan = xml_dial_plan + '<domain name="$${local_ip_v4}" alias="true" parse="true" />\n';
        xml_dial_plan = xml_dial_plan + '</domains>\n';
        xml_dial_plan = xml_dial_plan + '<aliases>\n';

        //Add all tenant with this sip profile
        xml_dial_plan += this.addAllTenant( tenantDetails );

        //Add json body of sip_details
        xml_dial_plan += this.addAllParamsOfSipProfile( sipProfile );

        //Add all trunk/gateway
        xml_dial_plan += this.addAllTrunk( trunkDetails );
        xml_gateway += this.addAllTrunk( trunkDetails );
        xml_dial_plan = xml_dial_plan + '</profile>';

        let sipProfileuuid = sipProfile?.uuid;

        //Not to create file when sip profile uuid is undefined
        if ( sipProfileuuid != undefined ) {
            let call_queue_file_name = `${process.env.SIP_PROFILE_DIRECTORY}${sipProfileuuid}.xml`;
            let gateway_file_name = `${process.env.SIP_PROFILE_DIRECTORY}gateways/${sipProfileuuid}.xml`;
            fs.writeFile( call_queue_file_name, xml_dial_plan.toString(), ( err ) => {
                if ( err ) {
                    Logger.error( `${err} error to written in ${sipProfileuuid}.xml` );
                    throw err;
                }
                Logger.debug( `${sipProfileuuid}.xml has been written to file successfully.` );
            } );
            
            fs.writeFile( gateway_file_name, xml_gateway.toString(), ( err ) => {
                if ( err ) {
                    Logger.error( `${err} error to written in gateway ${sipProfileuuid}.xml` );
                    throw err;
                }
                Logger.debug( `${sipProfileuuid}.xml gateway has been written to file successfully.` );
            } );
        } else {
            Logger.debug( `Sip profile not created due to uuid was defined` );
        }
    }

    /*
    @Usage                 : To add all tenants on given sip profile
    @Param tenantData      : Contains details of tenant
    @return                : It will add all tenants in XML file with uuid of sip profile
    */

    addAllTenant ( tenantData ) {
        let tenantInfo = "";
        tenantData?.map( ( data ) => {
            tenantInfo = tenantInfo + `<alias name="${data.domain}" /> \n`;
        } );
        tenantInfo = tenantInfo + `</aliases>\n`;
        return tenantInfo;
    }

    /*
    @Usage                 : To add all parameters of sip profile
    @Param sipProfile      : Contains details of tenant
    @return                : It will add all tenants in XML file with uuid of sip profile
    */

    addAllParamsOfSipProfile ( sipProfile ) {
        let i, parsedJSON, keys, values, len = 0;
        if ( sipProfile?.sip_details ) {
            parsedJSON = JSON.parse( sipProfile?.sip_details );
            keys = Object.keys( parsedJSON );
            values = Object.values( parsedJSON );
            len = keys.length;
        }
        let params = "";
        params = params + `<settings>\n`;
        params = params + `<param name='sip-ip' value='${sipProfile?.sip_ip}' />\n`;
        params = params + `<param name="sip-port" value='${sipProfile?.sip_port}' />\n`;

        for ( i = 0; i < len; i++ ) {
            params = params + "<param name='" + keys[ i ] + "' value='" + values[ i ] + "' />\n";
        }

        params = params + `</settings>\n`;
        return params;
    }

    /*
    @Usage                 : To add all trunk/gateway
    @Param trunkDetails    : Contains details of trunk
    @return                : It will add all trunk in XML file with uuid of sip profile
    */

    // addAllTrunk ( trunkDetails ) {
    //     let trunkInfo = "", register, extensionInContact;
    //     trunkInfo = trunkInfo + `<gateways>\n`;
    //     trunkDetails?.map( ( data, i ) => {

    //         //trunkInfo = trunkInfo + `<gateway>\n`;
    //         trunkInfo = trunkInfo + `<gateway name="${data.name}">\n`;
    //         trunkInfo = trunkInfo + `<param name="username" value="${data.username}" />\n`;

    //         if ( data.password != "" ) trunkInfo = trunkInfo + `<param name="password" value="${this.decode( data.password )}" />\n`;

    //         trunkInfo = trunkInfo + `<param name="proxy" value="${data.domain}" />\n`;

    //         register = data.register == "0" ? true : false;
    //         extensionInContact = data.extension_in_contact == "0" ? true : false;

    //         trunkInfo = trunkInfo + `<param name="register" value="${register}" />\n`;
    //         trunkInfo = trunkInfo + `<param name="extension-in-contact" value="false" />\n`;
    //         trunkInfo = trunkInfo + `<param name="caller-id-in-from" value="true" />\n`;
    //         trunkInfo = trunkInfo + `<param name="codec-string" value="PCMU,PCMA" />\n`;
    //         trunkInfo = trunkInfo + `<param name="auth-username" value="${data.extension}@${data.from_domain}" />\n`;

    //         if ( data.from_domain != "" ) trunkInfo = trunkInfo + `<param name="from-domain" value="${data.from_domain}" />\n`;


    //         if ( data.from_user != "" ) trunkInfo = trunkInfo + `<param name="from-user" value="${data.from_user}" />\n`;

    //         if ( data.realm != "" ) trunkInfo = trunkInfo + `<param name="realm" value="${data.realm}" />\n`;

    //         if ( data.extension != "" ) trunkInfo = trunkInfo + `<param name="extension" value="${data.extension}" />\n`;

    //         if ( data.expire_seconds != "" ) trunkInfo = trunkInfo + `<param name="expire-seconds" value="${data.expire_seconds}" />\n`;

    //         if ( data.reg_transport != "" ) trunkInfo = trunkInfo + `<param name="reg-transport" value="${data.reg_transport}" />\n`;

    //         if ( data.contact_params != "" ) trunkInfo = trunkInfo + `<param name="contact-params" value="${data.contact_params}" />\n`;

    //         if ( data.ping != "" ) trunkInfo = trunkInfo + `<param name="ping" value="${data.ping}" />\n`;

    //         if ( data.retry_seconds != "" ) trunkInfo = trunkInfo + `<param name="retry-seconds" value="${data.retry_seconds}" />\n`;

    //         if ( data.register_proxy != "" ) trunkInfo = trunkInfo + `<param name="register-proxy" value="${data.register_proxy}" />\n`;

    //         if ( data.dialplan_variable != "" ) trunkInfo = trunkInfo + `<param name="dialplan-variable" value="${data.dialplan_variable}" />\n`;

    //         trunkInfo = trunkInfo + `</gateway>\n`;
    //     } );
    //     trunkInfo = trunkInfo + `</gateways>\n`;
    //     return trunkInfo;
    // }


     addAllTrunk ( trunkDetails ) {
        let trunkInfo = "", register, extensionInContact;
        trunkInfo = trunkInfo + `<gateways>\n`;
        trunkDetails?.map( ( data, i ) => {
            //trunkInfo = trunkInfo + `<gateway>\n`;
            trunkInfo = trunkInfo + `<gateway name="${data.name}">\n`;
            trunkInfo = trunkInfo + `<param name="username" value="${data.username}" />\n`;

            if ( data.password != "" ) trunkInfo = trunkInfo + `<param name="password" value="${this.decode( data.password )}" />\n`;

            trunkInfo = trunkInfo + `<param name="proxy" value="${data.domain}" />\n`;

            register = data.register == "0" ? true : false;
            extensionInContact = data.extension_in_contact == "0" ? true : false;

            trunkInfo = trunkInfo + `<param name="register" value="${register}" />\n`;
            trunkInfo = trunkInfo + `<param name="extension-in-contact" value="false" />\n`;
            trunkInfo = trunkInfo + `<param name="caller-id-in-from" value="true" />\n`;

           
            if ( data.from_domain != "" ) trunkInfo = trunkInfo + `<param name="from-domain" value="${data.from_domain}" />\n`;

            if ( data.from_domain != "" ) trunkInfo = trunkInfo + `<param name="auth-username" value="${data.extension}@${data.from_domain}" />\n`;

            if ( data.from_user != "" ) trunkInfo = trunkInfo + `<param name="from-user" value="${data.from_user}" />\n`;

            if ( data.realm != "" ) trunkInfo = trunkInfo + `<param name="realm" value="${data.realm}" />\n`;

            if ( data.extension != "" ) trunkInfo = trunkInfo + `<param name="extension" value="${data.extension}" />\n`;

            if ( data.expire_seconds != "" ) trunkInfo = trunkInfo + `<param name="expire-seconds" value="${data.expire_seconds}" />\n`;

            if ( data.reg_transport != "" ) trunkInfo = trunkInfo + `<param name="reg-transport" value="${data.reg_transport}" />\n`;

            //if ( data.contact_params != "" ) trunkInfo = trunkInfo + `<param name="contact-params" value="${data.contact_params}" />\n`;

            if ( data.ping != "" ) trunkInfo = trunkInfo + `<param name="ping" value="${data.ping}" />\n`;

            if ( data.retry_seconds != "" ) trunkInfo = trunkInfo + `<param name="retry-seconds" value="${data.retry_seconds}" />\n`;

            if ( data.register_proxy != "" ) trunkInfo = trunkInfo + `<param name="register-proxy" value="${data.register_proxy}" />\n`;

            if ( data.dialplan_variable != "" ) trunkInfo = trunkInfo + `<param name="dialplan-variable" value="${data.dialplan_variable}" />\n`;

            trunkInfo = trunkInfo + `</gateway>\n`;
        } );
        trunkInfo = trunkInfo + `</gateways>\n`;
        return trunkInfo;
    }


    /*
    @Usage  : To get today date
    @return : date[yyyy-mm-dd]
    */

    /*getTodayDate() {
        let currentTimestamp = Date.now();
        let date: any;
        let month: any;
        let dateTime = new Date(currentTimestamp);
        date = dateTime.getDate();
        date = date < 10 ? `0${date}` : date;
        month = dateTime.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;
        let year = dateTime.getFullYear();
        return year + "-" + month + "-" + date;
    }*/

    getTodayDate ( withTime: any = "" ) {
        let currentTimestamp = Date.now();
        let date: any, month: any, hour: any, minutes: any, seconds: any;
        let dateTime = new Date( currentTimestamp );
        date = dateTime.getDate();
        date = date < 10 ? `0${date}` : date;

        month = dateTime.getMonth() + 1;
        month = month < 10 ? `0${month}` : month;

        let year = dateTime.getFullYear();

        hour = dateTime.getHours();
        hour = hour < 10 ? `0${hour}` : hour;

        minutes = dateTime.getMinutes();
        minutes = minutes < 10 ? `0${minutes}` : minutes;

        seconds = dateTime.getSeconds();
        seconds = seconds < 10 ? `0${seconds}` : seconds;

        if ( withTime != "" && withTime == true ) {
            return `${year}-${month}-${date} ${hour}:${minutes}:${seconds}`;
        } else {
            return `${year}-${month}-${date}`;
        }
    }

    /*
    @Usage  : To reload mod sofia
    */

    reloadModSofia () {
        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
           conn.api(`reload mod_sofia`, function (res) {
           })
       })*/
        this.fsConnection.api( `reload mod_sofia`, function ( res ) { } );
    }

    /*
    @Usage  : To start sip profile
    */

    /* startSipProfile(profileName) {
         let conn = this.connectFsWithEsl();
 console.log(conn);
        // conn.api(`sofia profile ${profileName} start`);
     conn.api(`sofia profile ${profileName} start`,function (res) {
             console.log("RES",res);
         });
     }*/
    startSipProfile ( profileName ) {
        /*let conn = new esl.Connection(process.env.FS_HOST,process.env.FS_PORT, process.env.FS_PASSWORD, function () {
            conn.api(`sofia profile ${profileName} start`, function (res) {
        if(res.body.includes("started successfully")){
                    return true;
                }else{
                    return false;
                }
            })
        })*/
        this.fsConnection.api( `sofia profile ${profileName} start`, function ( res ) { } );

    }

    /*
    @Usage  : To rescan sip profile
    */

    rescanSipProfile ( profileName ) {
        /*let conn = this.connectFsWithEsl();
        conn.api(`sofia profile ${profileName} rescan`);*/
        /*let conn = new esl.Connection(process.env.FS_HOST,process.env.FS_PORT, process.env.FS_PASSWORD, function () {
             conn.api(`sofia profile ${profileName} rescan reloadxml`, function (res) {
                 if(res.body.includes("started successfully")){
                     return true;
                 }else{
                     return false;
                 }
             })
         })*/
        this.fsConnection.api( `sofia profile ${profileName} rescan reloadxml`, function ( res ) { } );

    }


    /*
    @Usage  : To restart sip profile
    */

    restartSipProfile ( profileName ) {
        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
            conn.api(`sofia profile ${profileName} restart`, function (res) {
            })
        })*/
        this.fsConnection.api( `sofia profile ${profileName} restart`, function ( res ) { } );

    }

    /*
    @Usage  : To get live calls running in freeswitch using esl
    */

    getLiveCalls () {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                    conn.api(`show calls count`, function (res) {
                        console.log(res);
                        resolve(res);
                    });
            conn.disconnect( () => { console.log("FS connection closed") });
                })*/
                self.fsConnection.api( `show calls count`, function ( res ) {
                    resolve( res );
                } );
            } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }

    /*
    @Usage  : To reload call center
    */

    reloadCallCenter () {
        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
            conn.api(`reload mod_callcenter`, function (res) {
            })
        })*/
        this.fsConnection.api( `reload mod_callcenter`, function ( res ) { } );
    }

    /*
    @Usage  : To kill gateway
    */

    killGateway ( profileName, gatewayName ) {
        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
            conn.api(`sofia profile ${profileName} killgw ${gatewayName}`, function (res) {
            })
        })*/
        this.fsConnection.api( `sofia profile ${profileName} killgw ${gatewayName}`, function ( res ) { } );
    }

    /*
    @Usage  : To reloadacl
    */

    reloadACL () {
        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
            conn.api(`reloadacl`, function (res) {
            })
        })*/
        this.fsConnection.api( `reloadacl`, function ( res ) { } );
    }


    /*
    @Usage : To get total sip register count
    */

    getSipRegistrationCount () {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                     conn.api(`show registrations count`, function (res) {
                         console.log(res);
                         resolve(res);
             conn.end( () => { console.log(`Connection closed`) });
                     });
             //conn.disconnect( () => { console.log(`Connection closed`) });
                 })*/
                self.fsConnection.api( `show registrations count`, function ( res ) {
                    resolve( res );
                } );
            } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }

    /*
    @Usage  : To get UUID for call from freeswitch using esl
    */

    async getUUIDForCall ( campaign_uuid, tenant_uuid, uuid, lead_details, caller_id, trunk, timeout, extension, number_masking, campaign_mode, amd_status, type = "", loggedInEntityUUID = "", domain = "", account_code,campaign_flag,skip="" ) {
        try {
            let self = this;
            let currentDateTime = this.getTodayDate( true ).replace( " ", "-" ).trim();
            campaign_mode = campaign_mode == "3" ? true : false; //For Predective == true
            let lastName = ( lead_details?.last_name != "" && lead_details?.last_name != undefined ) ? lead_details?.last_name.replaceAll( " ", "" ).trim() : "-";
            let firstName = lead_details?.first_name.replaceAll( " ", "" ).trim();
            amd_status = amd_status == "0" ? "true" : "false";
            let scriptName = type == "" ? "auto_campaign" : "broadcast";
            let broadcastStatus = scriptName == "auto_campaign" ? false : true;
            campaign_flag = campaign_flag == "blended" ? "blended" : "outbound";
            let skip_flag = skip == "true"?true:false;
            /*if(this.fsConnection == undefined){
              this.fsConnection = await this.getFsConnection();
              console.log("FS Connection established");
            }else{
              Logger.verbose("Using same connection of FS");
            }*/
            return new Promise( function ( resolve, reject ) {
                //let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, async function () {

                //Get uuid from bgapi
                //    let bgApiUUID = await self.generateBgapiUUID(conn);
                // origination_uuid= = bgApiUUID
                let command = `bgapi originate <^^|sip_h_P-amd_status=${amd_status}|sip_h_P-voicebroadcast=${broadcastStatus}|sip_h_P-skip_flag=${skip_flag}|sip_h_P-manager_uuid=${loggedInEntityUUID}|sip_h_P-call_start=${currentDateTime}|sip_h_P-predictive_campaign=${campaign_mode}|sip_h_P-tenant_domain=${domain}|leg_timeout=${timeout}|sip_h_P-auto_campaign=true|sip_h_P-campaign_uuid=${campaign_uuid}|sip_h_P-campaign_flag=${campaign_flag}|sip_h_P-tenant_uuid=${tenant_uuid}|sip_h_P-account_code=${account_code}|sip_h_P-lead_uuid=${lead_details?.lead_management_uuid}|sip_h_P-lead_name=${firstName}--${lastName}|sip_h_P-username=${extension}|sip_h_P-original_number=${lead_details?.original_number}|sip_h_P-number_masking=${number_masking}|presence_data=tenant=${tenant_uuid},lead_management_uuid=${lead_details?.lead_management_uuid}|ignore_early_media=true|sip_h_P-cb_destination=${lead_details?.phone_number}|variable_effective_caller_id_name=${caller_id}|variable_effective_caller_id_number=${caller_id}|origination_caller_id_number=${caller_id}|effective_caller_id_number=${caller_id}|Caller-Destination-Number=${lead_details?.phone_number}|Hunt-Orig-Caller-ID-Number=${caller_id}|Hunt-Callee-ID-Name=${caller_id}>sofia/gateway/${trunk}/${lead_details?.phone_number}  &lua(${process.env.FS_SCRIPT}${scriptName}.lua)`;
                // let command = `bgapi originate {sip_h_P-amd_status=${amd_status},sip_h_P-voicebroadcast=${broadcastStatus},sip_h_P-skip_flag=${skip_flag},sip_h_P-manager_uuid=${loggedInEntityUUID},sip_h_P-call_start=${currentDateTime},sip_h_P-predictive_campaign=${campaign_mode},sip_h_P-tenant_domain=${domain},leg_timeout=${timeout},sip_h_P-auto_campaign=true,sip_h_P-campaign_uuid=${campaign_uuid},sip_h_P-campaign_flag=${campaign_flag},sip_h_P-tenant_uuid=${tenant_uuid},sip_h_P-account_code=${account_code},sip_h_P-lead_uuid=${lead_details?.lead_management_uuid},sip_h_P-lead_name=${firstName}--${lastName},sip_h_P-username=${extension},sip_h_P-original_number=${lead_details?.original_number},sip_h_P-number_masking=${number_masking},ignore_early_media=true,sip_h_P-user_uuid=${uuid},sip_h_P-cb_destination=${lead_details?.phone_number},variable_effective_caller_id_name=${caller_id},variable_effective_caller_id_number=${caller_id},origination_caller_id_number=${caller_id},effective_caller_id_number=${caller_id},Caller-Destination-Number=${lead_details?.phone_number},Hunt-Orig-Caller-ID-Number=${caller_id},Hunt-Callee-ID-Name=${caller_id}}sofia/gateway/${trunk}/${lead_details?.phone_number}  &lua(${process.env.FS_SCRIPT}${scriptName}.lua)`;
                Logger.verbose( "Originate Command...", command );
                self.fsConnection.api( command, function ( res ) {
                    //conn.api(command, function (res) {
                    /*conn.close();
                            conn.close(() => {
                          console.log('ESL server closed');
                            });*/
                    resolve( res );

                    // When you're done, close the connection gracefully
                    /* conn.end(() => {
                          Logger.verbose('Disconnected from FreeSWITCH');
                     });*/
                } );

                // Close the ESL connection when the task is done
                // conn.disconnect();
                // });

                // Event handler for when the connection is closed
                /*conn.on('esl::end', () => {
                      console.log('ESL connection closed');
                });*/
            } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to generate UUID for call" );
        }
    }

    /*
    @Usage  : To get UUID for call from freeswitch using esl
    @Param  : conn [Connection object with FS]
    */

    async generateBgapiUUID ( conn ) {
        return new Promise( function ( resolve, reject ) {
            let generateBgapiUUID;
            conn.api( `create_uuid`, function ( res ) {
                generateBgapiUUID = res?.body;
                resolve( generateBgapiUUID );
            } );
        } )
    }

    /*
    @Usage  : To get connection with freeswitch using esl
    */

    /*connectFsWithEsl() {
        try {
        return new Promise(function (resolve, reject) {
              let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD);
           resolve(conn);
        });
        } catch (err) {
            Logger.debug(err.message, "Unable to make connection with fs using ESL");
        }
    } */
   

    /*
    @Usage  : To get calls in queue
    @Param  : uuid of call queue
    */

    getCallsInQueue ( callQueueUUID ) {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                // let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                    self.fsConnection.api(`json {"command": "callcenter_config", "data": {"arguments":"queue list members", "queue_name":"${callQueueUUID}@default"}}`, function (res) {
                        console.log("callQueuesUUIDscallQueuesUUIDs freesitch res",res)
                        resolve(res);
                        // conn.disconnect( () => { console.log("Fs Connection closed") });
                    });
                 })
                // self.fsConnection.api( `json {"command": "callcenter_config", "data": {"arguments":"queue list members", "queue_name":"${callQueueUUID}@default"}}`,
                //     function ( res ) {
                //         resolve( res );
                //     } )
            // } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }

    /* @Usage  : To callMonitoring*/

    callMonitoring ( extension, call_uuid, domain ) {
        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
           let command = `originate {spy=true,cust_uuid=${call_uuid}}user/${extension}@${domain} ${extension} xml external mod_spy mod_spy mod_spy`;
           conn.api(command, function (res) {
           });

        })*/
        let command = `originate {spy=true,cust_uuid=${call_uuid}}user/${extension}@${domain} ${extension} xml external mod_spy mod_spy mod_spy`;
        this.fsConnection.api( command, function ( res ) { } );
    }

    /* @Usage  : To callBarge */

    callBarge ( extension, call_uuid, domain ) {

        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
          let command = `originate {barge=true,cust_uuid=${call_uuid}}user/${extension}@${domain} ${extension} xml external mod_barge mod_barge mod_barge`;
          conn.api(command, function (res) {
          });
        })*/
        let command = `originate {barge=true,cust_uuid=${call_uuid}}user/${extension}@${domain} ${extension} xml external mod_barge mod_barge mod_barge`;
        this.fsConnection.api( command, function ( res ) { } );
    }

    /* @Usage  : To callWhisper */

    callWhisper ( extension, call_uuid, domain ) {
        /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
           let command = `originate {whisper=true,cust_uuid=${call_uuid}}user/${extension}@${domain} ${extension} xml external mod_whisper mod_whisper mod_whisper`;
           conn.api(command, function (res) {
           });
        })*/
        
           // let command = `originate {whisper=true,cust_uuid=${call_uuid}}user/${extension}@${domain} ${extension} xml external mod_whisper mod_whisper mod_whisper`;
        
        // Using mod_spy for whispering
        let command = `originate {cust_uuid=${call_uuid}}user/${extension}@${domain} &spy(${call_uuid} whisper)`;

        this.fsConnection.api(command, function(res) {
            console.log("Whisper response:", res.getBody());
        });
    }


    /*
    @Usage                  : To add/update agent in call queue
    @Param extension        : string [extension detail of agent]
    @Param callQueueTimeout : string [timeout of call queue]
    @Param callQueueName    : string [name of call queue]
    @Param domain           : string [domain of tenant in which this agent belongs]
    */

    async addUpdateAgentInQueue(
        extension,
        domain,
        callQueueTimeout,
        callQueueName,
        agentState,
        feature,
        callQueueUUID
    ) {
        try {
            console.log(callQueueUUID,"callQueueUUID callQueueUUID");
            
            const self = this;

            // FreeSWITCH Agent ID
            const agentId = `${extension}.${domain}@default`;

            // Agent contact with leg timeout
            const contact = `[leg_timeout=${callQueueTimeout}]user/${extension}@${domain}`;

            let arrCommand: string[] = [];

            // ================================
            // FEATURE HANDLING
            // ================================
            switch (feature) {

                // ================================
                // RESUME (Agent Login)
                // ================================
                case "resume": {
                    const agentExist: any = await self.checkAgentExist(
                        self.fsConnection,
                        extension,
                        domain,
                        callQueueName,
                        callQueueUUID
                    );

                    if (agentExist.trim() === "-ERR Tier already exist!") {
                        Logger.warn("Agent already exists → Updating only");

                        arrCommand = [
                            `callcenter_config agent set contact ${agentId} ${contact}`,
                            `callcenter_config agent set status ${agentId} Available`,
                            `callcenter_config agent set state ${agentId} ${agentState}`
                        ];
                    } else {
                        Logger.log("New Agent → Adding into Queue");

                        arrCommand = [
                            `callcenter_config agent add ${agentId} callback`,
                            `callcenter_config agent set contact ${agentId} ${contact}`,
                            `callcenter_config agent set status ${agentId} Available`,
                            `callcenter_config agent set state ${agentId} ${agentState}`,
                            `callcenter_config tier add ${callQueueUUID}@default ${agentId} 1 1`
                        ];
                    }
                    break;
                }
                // ================================
                // HANG-UP / REJECT
                // ================================
                case "hang-up": {
                    Logger.warn("Agent rejected call → putting agent into BREAK");

                    arrCommand = [
                        // Instead of immediate Waiting
                        `callcenter_config agent set status ${agentId} Break`,
                        `callcenter_config agent set state ${agentId} ${agentState}`
                    ];

                    break;
                }

                // ================================
                // SUBMIT (Pause/Resume)
                // ================================
                case "submit": {
                    arrCommand = [
                        `callcenter_config agent set state ${agentId} ${agentState}`
                    ];
                    break;
                }

                // ================================
                // LOGOUT
                // ================================
                case "logout": {
                    arrCommand = [
                        `callcenter_config tier del ${callQueueUUID}@default ${agentId}`,
                        `callcenter_config agent del ${agentId}`
                    ];
                    break;
                }
            }

            // ================================
            // EXECUTE AGENT COMMANDS
            // ================================
            Logger.log(`Executing ${arrCommand.length} commands...`);

            for (const cmd of arrCommand) {
                await new Promise((resolveCmd) => {
                    self.fsConnection.api(cmd, function (res: any) {
                        Logger.debug(`Executed: ${cmd}`);
                        resolveCmd(res);
                    });
                });
            }

            // ================================
            // APPLY QUEUE SAFETY SETTINGS
            // Only on resume
            // ================================
            if (feature === "resume") {
                Logger.log("Applying queue anti-retry flood settings...");

                 const queueSafeCommands = [

                    // stop retrying same agent again
                    // `callcenter_config queue set ${callQueueUUID}@default skip-agent-on-reject true`,
                    // `callcenter_config queue set ${callQueueUUID}@default skip-agent-on-no-answer true`,

                    // // Only one agent offer at a time
                    // `callcenter_config queue set ${callQueueUUID}@default max-simultaneous-offers 1`,

                    // // Agent cooldown after call
                    // `callcenter_config queue set ${callQueueUUID}@default wrap-up-time 10`,

                    // // Auto-break agent if no answer/reject
                    // `callcenter_config queue set ${callQueueUUID}@default agent-no-answer-action Break`,

                    // // Delay before retrying another agent
                    // `callcenter_config queue set ${callQueueUUID}@default agent-retry-delay 10`,
                    // `callcenter_config queue set ${callQueueUUID}@default retry-delay 10`,

                    // // Ring timeout
                    // `callcenter_config queue set ${callQueueUUID}@default ring-timeout 30`,

                    // // Stop abandoned spam calls
                    // `callcenter_config queue set ${callQueueUUID}@default discard-abandoned-after 2`,

                    // // Caller wait time max
                    // `callcenter_config queue set ${callQueueUUID}@default max-wait-time 300`,

                    // // If no agent available, hangup fast
                    // `callcenter_config queue set ${callQueueUUID}@default max-wait-time-with-no-agent 60`,
                    
                    // `callcenter_config agent set max_no_answer ${agentId} 2`,
                    `callcenter_config agent set wrap_up_time ${agentId} 5`,
                    `callcenter_config agent set reject_delay_time ${agentId} 10`,
                    `callcenter_config agent set busy_delay_time ${agentId} 10`,
                    `callcenter_config agent set no_answer_delay_time ${agentId} 10`
                ];

                for (const cmd of queueSafeCommands) {
                    await new Promise((resolveCmd) => {
                        self.fsConnection.api(cmd, function (res: any) {
                            Logger.debug(`Queue Setting Applied: ${cmd}`);
                            resolveCmd(res);
                        });
                    });
                }
            }
            return {
                success: true,
                message: "Agent/Queue updated successfully"
            };

        } catch (err: any) {
            Logger.error(err.message, "Error updating agent queue");
            return {
                success: false,
                message: err.message
            };
        }
    }

    addtempUpdateAgentInQueue ( extension, domain ) {
        let allData, result, arrCommand, self = this;
        arrCommand = [

            `callcenter_config agent set state ${extension}.${domain}@default Waiting`
        ];
        Logger.log( `List of command's : ${JSON.stringify( arrCommand )}` );
        return new Promise( async function ( resolve ) {
            allData = arrCommand.map( async ( data ) => {
                await self.fsConnection.api( data, function ( res ) {
                    Logger.debug( `Executing command : ${data}` );
                } );
            } );
            result = Promise.all( allData );
            resolve( result );
        } )
    }

    /*
    @Usage              : To check agent exist in queue or not
    @Param fsConnection  : Freeswitch connection
    @Param extension     : Extension of current requested user
    @Param domain        : Domain of current requested user
    @Param callQueueName : Name of call queue
    */

    checkAgentExist ( fsConnection, extension, domain, callQueueName, callQueueUUID ) {
        return new Promise( async ( resolve ) => {
            await fsConnection.api( `callcenter_config tier add ${callQueueUUID}@default ${extension}.${domain}@default 1 1`, function ( res ) {
                resolve( res.body );
            } );
        } )
    }

    /*
    @Usage               : To fetch inbound and blended campaign call queues count
    */

    fetchAllQueues () {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                    conn.api(`json {"command": "callcenter_config", "data": {"arguments":"queue list"}}`, function (res) {
                        resolve(res);
            conn.disconnect(()=>{ console.log(`Freeswitch connection closed`) });
                    })
                })*/
                self.fsConnection.api( `json {"command": "callcenter_config", "data": {"arguments":"queue list"}}`, function ( res ) {
                    resolve( res );
                } );
            } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }

    /*
    @Usage               : To get all running calls in freeswitch
    */

    getRunningCalls () {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                    conn.api(`show calls as json`, function (res) {
                        resolve(res);
                    })
                })*/
                self.fsConnection.api( `show calls as json`, function ( res ) {
                    resolve( res );
                } );
            } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }

    /*
    @Usage               : To get connection of freeswitch
    */

    getFsConnection () {
        try {
             return new Promise( function ( resolve, reject ) {
                let conn = new esl.Connection( process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                    resolve( conn );
                } )
             } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }

    /*
    @Usage               : To kill uuid in freeswitch
    */

    killUUID ( uuid ) {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                self.fsConnection.api( `uuid_kill ${uuid}`, function ( res ) {
                    Logger.warn( JSON.stringify( res ), `UUID Killed response` );
                    resolve( res );
                } );
            } );
        } catch ( error ) {
            Logger.error( `Unable to kill uuid: ${uuid}`, error.message );
        }
    }

    /*
    @Usage               : To check WHMCS license
    */

    async licenseCheck ( response, licenseKey = "", licenseCollection, role ) {
        let licenseValid = false;
        if ( response != false ) { response = JSON.parse( response ); }
        let currentDate = this.getTodayDate();
        let errorMsg = "Your license key is expired and needs renewal.";
        /*
        if ( response != false && response != undefined && response.checkdate > currentDate ) {
            let serverIP = ip.address();
            let allowedIPs = response.validip.split( "," );
            //Check role
            switch ( role ) {
                case "tenant":
                    licenseValid = ( response.status == "Active" && response.checkdate > currentDate ) ? true : false;
                    break;
                case "manager":
                    licenseValid = ( response.status == "Active" && response.checkdate > currentDate ) ? true : false;
                    break;
                case "master_admin":
                    licenseValid =
                        response.status == "Active" &&
                            response.checkdate > currentDate &&
                            allowedIPs.includes( serverIP ) == true
                            ? true
                            : false;
                    break;
                case "agent":
                    licenseValid = ( response.status == "Active" && response.checkdate > currentDate ) ? true : false;
                    break;
            }
            Logger.warn( JSON.stringify( { status: response.status, date: { currentdate: currentDate, checkdate: response.checkdate }, allowedIPs } ), `\n Checked WHMCS license status from DB License status ===> ${response.status}` );
        } else if ( response == undefined ) {
            Logger.warn( `License encryption has been changed...` );
        } else {
            licenseKey = response.licenseKey != undefined ? response.licenseKey : licenseKey;
            response = await this.doRequestToWHMCS( licenseKey );
            if ( response.status == "Active" ) {
                let recheckLicenseAfterDays = 1;
                let expiry = new Date(
                    new Date().getTime() + recheckLicenseAfterDays * 24 * 60 * 60 * 1000
                ).toISOString();
                expiry = moment( expiry ).format( 'YYYY-MM-DD' );
                response[ "checkdate" ] = expiry;
                response[ "licenseKey" ] = licenseKey;

                //Add entry in license collection
                licenseValid = true;
                let result: any = await licenseCollection.addLicense( response );
                if ( result.length > 0 ) {
                    Logger.debug( `License added successfully \n`, result );
                }
            } else if ( response.status == "Invalid" ) {
                errorMsg = "Please enter valid license key";
            }
        }*/
        let licenseArray = [];

         licenseValid = true;    // Remove or un-comment this line on production server

        licenseArray[ "licenseValid" ] = licenseValid;

        if ( !licenseValid ) {
            licenseArray[ "errorMessage" ] = errorMsg;
        }
        return licenseArray;
    }

    /*
    @Usage  : To check license is valid or not
    @return : boolean/json
    */

    async doRequestToWHMCS ( licensekey ) {
        try {
            let result = await axios.post(
                process.env.WHMCS_API_URL,
                qs.stringify( { licensekey } )
            );
            let xmlString = `<data>${result.data}</data>`;
            result = await this.parseXMLToJSON( xmlString );
            Logger.warn( result, `Checked on WHMCS server Result ==> \n` );
            if ( result != "Error" ) {
                result = JSON.parse( result );
                return result.data;
            } else {
                Logger.error( `Promise rejected... parseXMLToJSON() \n` );
                return false;
            }
        } catch ( error ) {
            Logger.error( `Error in catch block ==> doRequestToWHMCS() \n` );
        }
    }

    /*
    @Usage : To parse xml to json
    @return Object
    */

    parseXMLToJSON ( xmlString ) {
        return new Promise( ( resolve, reject ) => {
            const parseOptions = { trim: true, explicitArray: false };
            parseString( xmlString, parseOptions, function ( err, results ) {
                if ( err ) {
                    Logger.error(
                        `Got error while parsing ==> parseXMLResponse() \n`,
                        err
                    );
                    reject( "Error" );
                } else {
                    let data = JSON.stringify( results );
                    resolve( data );
                }
            } );
        } );
    }

    /*
    @Usage               : To send DTMF from freeswitch
    */

    sendDTMF ( uuid, digit ) {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                self.fsConnection.api( `uuid_send_dtmf ${uuid} ${digit}`, function ( res ) {
                    Logger.warn( JSON.stringify( res ), `DTMF response` );
                    resolve( res );
                } );
            } );
        } catch ( error ) {
            Logger.error( `Unable to send DTMF : ${uuid}`, error.message );
        }
    }

    /*@Usage : To reuse fs connection where required*/

    fetchFsConnection () { return this.fsConnection; }


    /*
   @Usage                 : To get last quarter dates
   @Param collection_name : --
   @Param uuid            : --
   @Param logMessage      : Object with error & success message
   @return Object         : Result of last quarter first and last date
   */

    async getLastQuarterDates () {
        return {
            start: moment().clone().subtract( 1, 'quarter' ).startOf( 'quarter' ).set( { hour: 0, minute: 0, second: 0, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
            end: moment().clone().subtract( 1, 'quarter' ).endOf( 'quarter' ).set( { hour: 23, minute: 59, second: 59, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
        };
    }

    /*
    @Usage                 : To get last quarter names
    @Param collection_name : --
    @Param uuid            : --
    @Param logMessage      : Object with error & success message
    @return Object         : Result of last quarter name
    */

    async getLastQuarterName ( dashFormat = "_" ) {
        const lastQuarterStart = moment().clone().subtract( 1, 'quarter' ).startOf( 'quarter' );
        const lastQuarterEnd = moment().clone().subtract( 1, 'quarter' ).endOf( 'quarter' );
        let quarterName = ""

        // Format the quarter name
        if ( dashFormat === "_" ) {
            quarterName = `${lastQuarterStart.format( 'MMMM_' )}${lastQuarterEnd.format( 'MMMM_YYYY' )}`;
        } else if ( dashFormat === "-" ) {
            quarterName = `${lastQuarterStart.format( 'MMMM-' )}${lastQuarterEnd.format( 'MMMM-YYYY' )}`;
        }
        return quarterName;
    }

    /*
    @Usage                 : To get current quarter dates
    @Param collection_name : --
    @Param uuid            : --
    @Param logMessage      : Object with error & success message
    @return Object         : Result of current quarter first and last date
    */

    async getCurrentQuarterDates () {
        return {
            start: moment().clone().startOf( 'quarter' ).set( { hour: 0, minute: 0, second: 0, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
            end: moment().clone().endOf( 'quarter' ).set( { hour: 23, minute: 59, second: 59, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
        };
    }

    /*
    @Usage                 : To get current quarter name
    @Param collection_name : --
    @Param uuid            : --
    @Param logMessage      : Object with error & success message
    @return Object         : Result of current quarter name
    */

    async getCurrentQuarterName ( dashFormat = "_" ) {
        const currentQuarterStart = moment().startOf( 'quarter' );
        const currentQuarterEnd = moment().endOf( 'quarter' );
        let quarterName = ""

        // Format the quarter name
        if ( dashFormat === "_" ) {
            quarterName = `${currentQuarterStart.format( 'MMMM_' )}${currentQuarterEnd.format( 'MMMM_YYYY' )}`;
        } else if ( dashFormat === "-" ) {
            quarterName = `${currentQuarterStart.format( 'MMMM-' )}${currentQuarterEnd.format( 'MMMM-YYYY' )}`;
        }
        return quarterName;
    }

    /*
    @Usage                 : To get next quarter dates
    @Param collection_name : --
    @Param uuid            : --
    @Param logMessage      : Object with error & success message
    @return Object         : Result of next quarter first and last date
    */

    async getnextQuarterDates () {
        return {
            start: moment().clone().add( 1, 'quarter' ).startOf( 'quarter' ).set( { hour: 0, minute: 0, second: 0, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
            end: moment().clone().add( 1, 'quarter' ).endOf( 'quarter' ).set( { hour: 23, minute: 59, second: 59, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
        };
    }

    /*
    @Usage                 : Get quarter info as per given year
    @Param collection_name : Year number
    @Param uuid            : --
    @Param logMessage      : Object with error & success message
    @return Object         : Result of quarter name and start and end date for given year
    */

    async getQuarterInfo ( year: number = moment().year(), tag: string = 'all' ) {
        let quarters = [];


        switch ( tag ) {
            case 'Q1':
                quarters = [ { name: 'Q1', start: moment( { year, month: 0, day: 1 } ), end: moment( { year, month: 2, day: 31 } ) } ];
                break;

            case 'Q2':
                quarters = [ { name: 'Q2', start: moment( { year, month: 3, day: 1 } ), end: moment( { year, month: 5, day: 30 } ) } ];
                break;

            case 'Q3':
                quarters = [ { name: 'Q3', start: moment( { year, month: 6, day: 1 } ), end: moment( { year, month: 8, day: 30 } ) } ];
                break;

            case 'Q4':
                quarters = [ { name: 'Q4', start: moment( { year, month: 9, day: 1 } ), end: moment( { year, month: 11, day: 31 } ) } ];
                break;

            default:
                quarters = [
                    { name: 'Q1', start: moment( { year, month: 0, day: 1 } ), end: moment( { year, month: 2, day: 31 } ) },
                    { name: 'Q2', start: moment( { year, month: 3, day: 1 } ), end: moment( { year, month: 5, day: 30 } ) },
                    { name: 'Q3', start: moment( { year, month: 6, day: 1 } ), end: moment( { year, month: 8, day: 30 } ) },
                    { name: 'Q4', start: moment( { year, month: 9, day: 1 } ), end: moment( { year, month: 11, day: 31 } ) }
                ];
                break;
        }

        return quarters.map( quarter => ( {
            name: quarter.name,
            quarterName: `cdrs_quarterly_archives_${quarter.start.format( 'MMMM' )}_${quarter.end.format( 'MMMM' )}_${year}`,
            quarterToDisplay: `${quarter.start.format( 'MMMM' )}-${quarter.end.format( 'MMMM' )}-${year}`,
            start: moment( quarter.start ).clone().startOf( 'quarter' ).set( { hour: 0, minute: 0, second: 0, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
            end: moment( quarter.end ).clone().endOf( 'quarter' ).set( { hour: 23, minute: 59, second: 59, millisecond: 0 } ).format( 'YYYY-MM-DD HH:mm:ss' ),
        } ) );
    }

    async get_register_flag () {
        let dataArray = [], register_flag;
        register_flag = await this.getregister_gateway();
        if (register_flag?.body) {
            dataArray = register_flag.body.trim().split( ' ' );
        }
        console.log( dataArray );
        return dataArray;
    }

    async get_unregister_flag () {
        let dataArray = [], unregister_flag;
        unregister_flag = await this.getunregister_gateway();
        if (unregister_flag?.body) {
            dataArray = unregister_flag.body.trim().split( ' ' );
        }
        console.log( dataArray );
        return dataArray;
    }


    getregister_gateway () {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                    conn.api(`show calls count`, function (res) {
                        console.log(res);
                        resolve(res);
                    });
            conn.disconnect( () => { console.log("FS connection closed") });
                })*/
                self.fsConnection.api( `sofia profile external gwlist up`, function ( res ) {
                    // console.log( res );
                    resolve( res );
                } );
            } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }

    getunregister_gateway () {
        try {
            let self = this;
            return new Promise( function ( resolve, reject ) {
                /*let conn = new esl.Connection(process.env.FS_HOST, process.env.FS_PORT, process.env.FS_PASSWORD, function () {
                    conn.api(`show calls count`, function (res) {
                        console.log(res);
                        resolve(res);
                    });
            conn.disconnect( () => { console.log("FS connection closed") });
                })*/
                self.fsConnection.api( `sofia profile external gwlist down`, function ( res ) {
                    // console.log( res.body );
                    resolve( res );
                } );
            } )
        } catch ( err ) {
            Logger.debug( err.message, "Unable to make connection with fs using ESL" );
        }
    }
}

