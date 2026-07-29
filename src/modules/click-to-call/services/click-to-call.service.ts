import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateClickToCallDto } from "../dto/create-click-to-call.dto";
import { ForwordingClickToCallDto } from "../dto/forwarding-click-to-call.dto";
import { ClickToCallDocument, ClickToCallSchema } from "../schema/click-to-call.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import { CommonFunctions } from "src/modules/common/common_functions";
import { GreetingService } from "src/modules/greeting/services/greeting.service";
import * as fs from "fs";
import axios from "axios";
import * as path from "path";

@Injectable()

export class ClickToCallService {

  /*
  @Usage : To load click to call schema and other libraries
  @Param @InjectModel: It will load click to call schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[click_to_call,commonFn,commonDbFn] 
  */

  constructor(
    @InjectModel(ClickToCallSchema.name) private readonly click_to_call: Model<ClickToCallDocument>,
    @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,

    private readonly greetingService: GreetingService,
    private readonly commonDbFn: CommonDBFunctions,
    private readonly commonFn: CommonFunctions
  ) { }


  /*
  @Usage                 : First it will check whether given name exist or not , if not then new click to call will be created else it will throw error
  @Param createClickToCallDto    : Request paramter that we set into dto
  @return Object         :  Success / Error 
  */

  async create(createClickToCallDto: CreateClickToCallDto) {

    const { name, tenant_uuid, domain, role, tts_script } = createClickToCallDto;
    let where = [{ name }, { tenant_uuid }];
    let logMessages = {
      logErrorMsg: "Click To Call already exist \n",
      logSuccessMsg: "Click To Call created successfully \n"
    }

    if (role == "manager") {
      //Fetch tenant of manager
      let tenantInfo;
      const lookupUuid = createClickToCallDto.manager_uuid || tenant_uuid;
      tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
      if (tenantInfo) {
        createClickToCallDto.tenant_uuid = tenantInfo.tenant_uuid;
        createClickToCallDto.manager_uuid = lookupUuid as string;
      } else {
        createClickToCallDto.manager_uuid = lookupUuid as string;
      }
    }

    let response = await this.commonDbFn.findAndInsert(this.click_to_call, where, createClickToCallDto, JSON.stringify(logMessages), "and", true);

    if (response.statusCode == 409) { return response; }

    let clickToCallInsertedUUID = response.message.uuid;

    const device_number = clickToCallInsertedUUID.replace(/-/g, '');

    const randomPassword = Math.random().toString(36).slice(-8);

    const encrpytFormat = `${device_number}:${domain}:${randomPassword}:${name}`;

    const generatedEncrpytKey = this.commonFn.encode(encrpytFormat);

    //Update URL against newly created clicktocall
    const url = `https://${domain}/click2call/${generatedEncrpytKey}`;
    const result = await this.click_to_call.updateOne({ uuid: clickToCallInsertedUUID, tenant_uuid }, { url, device_number }).exec();
    console.log("result", result);
    if (result.modifiedCount > 0) {
      Logger.debug(`URL updated successfully against newly created clicktocall`);
    } else {
      Logger.error(`Unable to update URL against newly created clicktocall`);
    }
    delete response.message;
    this.generateXML(device_number, domain, randomPassword, tenant_uuid, clickToCallInsertedUUID);
    this.generateTTS(tts_script);
    return response;
  }

  // async generateXML(username, domain, password, tenant_uuid, clickToCallInsertedUUID) {
  //   try {
  //     //Directory DATA
  //     var file_path_directory = `${process.env.READ_TENANT_XML}`;
  //     var data_dir = fs.readFileSync(file_path_directory, 'utf8');
  //     var directory_data: any = data_dir.toString();

  //     //Extension details
  //     directory_data = directory_data.replaceAll('#EXT_USERNAME#', username);
  //     directory_data = directory_data.replaceAll('#TENANT#', domain);
  //     directory_data = directory_data.replaceAll('#EXT_PASSWORD#', password);
  //     directory_data = directory_data.replaceAll('#TENANT_UUID#', tenant_uuid);
  //     directory_data = directory_data.replaceAll('#USER_UUID#', clickToCallInsertedUUID);
  //     directory_data = directory_data.replaceAll('#EXTENSION_UUID#', "click2call");
  //     directory_data = directory_data.replaceAll('#EXT_CID_NAME#', "");
  //     directory_data = directory_data.replaceAll('#EXT_CID_NUMBER#', "");
  //     //Voicemail details
  //     directory_data = directory_data.replaceAll('#VOICEMAIL_STATUS#', "false");
  //     directory_data = directory_data.replaceAll('#VOICEMAIL_PASSWORD#', "");
  //     directory_data = directory_data.replaceAll('#VOICEMAIL_MAIL#', "");
  //     directory_data = directory_data.replaceAll('#VOICEMAIL_ATTACH#', "false");

  //     var directory_file_name = `${process.env.EXTENSION_DIRECTORY}${username}.${domain}.xml`;
  //     fs.writeFileSync(directory_file_name, directory_data.toString());
  //     console.log(directory_file_name);
  //     Logger.debug(`File written successfully with : ${username}.${domain}.xml \n`);
  //   } catch (error) {
  //     Logger.error(`Unable to generate XML`, error.message);
  //   }

  // }

  async generateXML(username, domain, password, tenant_uuid, clickToCallInsertedUUID) {
    try {
      //Directory DATA
      let file_path_directory = `${process.env.READ_TENANT_XML}`;
      if (!file_path_directory || file_path_directory === 'undefined' || !fs.existsSync(file_path_directory)) {
        const relPath = (file_path_directory || '').replace(/^[\/\\]?opt[\/\\]/, '');
        const cwdPath = path.join(process.cwd(), relPath);
        if (fs.existsSync(cwdPath)) {
          file_path_directory = cwdPath;
        } else {
          const defaultSamplePath = path.join(process.cwd(), 'caching', 'sample', 'directory', 'EXT.TENANT.xml');
          if (fs.existsSync(defaultSamplePath)) {
            file_path_directory = defaultSamplePath;
          }
        }
      }

      var data_dir = fs.readFileSync(file_path_directory, 'utf8');
      var directory_data: any = data_dir.toString();

      //Extension details
      directory_data = directory_data.replaceAll('#EXT_USERNAME#', username || '');
      directory_data = directory_data.replaceAll('#TENANT#', domain || '');
      directory_data = directory_data.replaceAll('#EXT_PASSWORD#', password || '');
      directory_data = directory_data.replaceAll('#TENANT_UUID#', tenant_uuid || '');
      directory_data = directory_data.replaceAll('#USER_UUID#', clickToCallInsertedUUID || '');
      directory_data = directory_data.replaceAll('#EXTENSION_UUID#', "click2call");
      directory_data = directory_data.replaceAll('#EXT_CID_NAME#', "");
      directory_data = directory_data.replaceAll('#EXT_CID_NUMBER#', "");
      //Voicemail details
      directory_data = directory_data.replaceAll('#VOICEMAIL_STATUS#', "false");
      directory_data = directory_data.replaceAll('#VOICEMAIL_PASSWORD#', "");
      directory_data = directory_data.replaceAll('#VOICEMAIL_MAIL#', "");
      directory_data = directory_data.replaceAll('#VOICEMAIL_ATTACH#', "false");

      let directory_file_name = `${process.env.EXTENSION_DIRECTORY}${username}.${domain}.xml`;
      try {
        const targetDir = path.dirname(directory_file_name);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(directory_file_name, directory_data.toString());
      } catch (err: any) {
        Logger.error(`Failed to write XML file to ${directory_file_name}: ${err}`);
        const fallbackDir = path.join(process.cwd(), 'caching', 'directory');
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        directory_file_name = path.join(fallbackDir, `${username}.${domain}.xml`);
        fs.writeFileSync(directory_file_name, directory_data.toString());
      }
      console.log(directory_file_name);
      Logger.debug(`File written successfully with : ${username}.${domain}.xml \n`);
    } catch (error: any) {
      Logger.error(`Unable to generate XML`, error.message);
    }

  }

  /*
    @Usage             : To get records based on limit,page,search
    @Param queryParams : It will contain page(default=1),limit(default=10),search
    @return Object     : Array of an object with total count of click to call with data 
    */

  async findAll(queryParams) {
    let searchFields = ["name"];
    let populateFields = [{ path: "tenant", select: 'username tenant_name' }];
    return this.commonDbFn.findAllWithPagination(this.click_to_call, queryParams, searchFields, populateFields);
  }

  /*
  @Usage          : To get single click to call record based on uuid
  @Param uuid     : Search click to call by uuid
  @return Object  : Result of click to call 
  */

  async findOne(uuid: string) {
    let logMessages = {
      logErrorMsg: `Click To Call not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Click To Call success fetched by uuid : ${uuid} \n`
    }
    return this.commonDbFn.findOne(this.click_to_call, uuid, JSON.stringify(logMessages));
  }

  /*
  @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update user role by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error 
  */

  async update(uuid: string, createClickToCallDto: CreateClickToCallDto) {
    const { name, tenant_uuid } = createClickToCallDto;
    const getClickToCall = await this.click_to_call.findOne({ uuid }).exec();
    if (getClickToCall?.name != name) {
      const checkClickToCallExist = await this.click_to_call.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
      if (checkClickToCallExist > 0) {
        Logger.error("Click To Call already exist \n", putMethod);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Click To Call already exist`);
      }
    }
    let logMessages = {
      logErrorMsg: `Click To Call not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Click To Call updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.click_to_call, uuid, createClickToCallDto, JSON.stringify(logMessages));
  }

  /*
  @Usage              : To search click to call using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of click to call with data 
  */

  async advancedSearch(searchParams) {
    let populateFields = [{ path: "tenant", select: 'username tenant_name' }];
    return this.commonDbFn.advancedSearch(this.click_to_call, searchParams, populateFields);
  }

  /*
  @Usage                 : First it will check whether given number exist or not , if not then new click to call will be created else it will throw error
  @Param createTenantDto : Request paramter that we set into dto
  @return Object         :  Success / Error 
  */

  async forwarding(uuid: string, updateClickToCallDto: ForwordingClickToCallDto) {
    const { clicktocall_forwarding_type, clicktocall_forwarding_value } = updateClickToCallDto;
    const getClickToCallForwordData = await this.click_to_call.findOne({ clicktocall_forwarding_type, clicktocall_forwarding_value }).count().exec();

    const clicktocallUpdate = await this.click_to_call.updateOne({ uuid }, updateClickToCallDto).exec();

    if (clicktocallUpdate.matchedCount == 0 && clicktocallUpdate.modifiedCount == 0) {
      Logger.error(`Click To Call uuid was incorrect ${uuid} \n`, putMethod);
      throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Click To Call id was incorrect" })
    }
    Logger.debug(`Click To Call forward successfully by uuid ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "Click To Call forward successfully");
  }

  async generateTTS(text: string) {
    try {
      const response = await axios({
        method: "POST",
        url: process.env.SARVAM_API_URL,
        headers: {
          "Content-Type": "application/json",
          "api-subscription-key": process.env.SARVAM_API_KEY
        },
        data: {
          text: text,
          target_language_code: "en-IN",
          speaker: "anushka",
          model: "bulbul:v2",
          pitch: 0.2,
          pace: 1,
          loudness: 1.1,
          speech_sample_rate: 8000,
          enable_preprocessing: true
        }
      });

      const base64Audio = response.data?.audios?.[0];
      const audioBuffer: Buffer = Buffer.from(base64Audio, "base64");
      const dir = path.join(process.cwd(), 'upload', 'click-to-call');

      if (!fs.existsSync(dir)) { fs.mkdirSync(dir, { recursive: true }); }

      const fileName = `tts_${Date.now()}.wav`;
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, audioBuffer as Uint8Array);

      return { statusCode: HttpStatus.OK, message: "TTS generated successfully", file: fileName, path: filePath };
    } catch (error: any) {
      console.log("===== SARVAM ERROR START =====");
      console.log("Message:", error.message);
      console.log("Status:", error.response.status);
      console.log("Data:", error.response.data);
      console.log("===== SARVAM ERROR END =====");
      Logger.error("Sarvam TTS Error", error?.response?.data || error.message);
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: "TTS generation failed" };
    }

  }

  /*
  @Usage         : To update status of click to call[Active/Inactive]
  @Param uuid    : uuid of click to call
  @Param body    : Contains update body
  @return Object : Success / Error 
  */

  async patch(uuid: string, body) {
    let logMessages = {
      logErrorMsg: `Click To Call not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Click To Call status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.click_to_call, uuid, body, JSON.stringify(logMessages));
  }

  /*
  @Usage         : Delete single or multiple click to call using uuid
  @Param uuid    : To delete single click to call pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error 
  */

  async remove(uuid: string) {
    let logMessages = {
      logErrorMsg: `Click To Call not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Click To Call deleted successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.delete(this.click_to_call, { uuid }, JSON.stringify(logMessages));
  }


  async clickToCallBroadcast(body: any, queryParam: any) {
    try {
      console.log("doiadsadsjnsaasdas", queryParam);

      const { category, phone_number, text } = body;

      if (!category || !phone_number || !text) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: "category, phone_number and text are required"
        };
      }

      /* ---------------- TTS GENERATION ---------------- */

      const audioPath = `${process.env.UPLOAD_DIRECTORY}CTC_Tts/${phone_number}.wav`;
      const ttsResponse: any = await this.greetingService.generateSpeech(text, audioPath);
      console.log("ttsResponsettsResponse", ttsResponse);

      // if (ttsResponse.statusCode !== 200) {
      //   return {
      //     statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      //     message: "TTS generation failed"
      //   };
      // }

      /* ---------------- FREESWITCH COMMAND ---------------- */

      const caller_id = "+917553128276";
      const trunk = "Devtrunk";

      const command = `bgapi originate {ignore_early_media=true,origination_caller_id_name=${caller_id},origination_caller_id_number=${caller_id},sip_h_P-cb_destination=${phone_number},effective_caller_id_number=${caller_id},authentication_type=clicktocall,playback_file=${audioPath}}sofia/gateway/${trunk}/${phone_number} &lua(${process.env.FS_SCRIPT}CTC_TTS.lua)`;

      const fsConnection = this.commonFn.fetchFsConnection();

      const response = await fsConnection.api(command);

      Logger.debug(`Broadcast command sent: ${command}`);

      return {
        statusCode: HttpStatus.OK,
        message: "Broadcast call initiated",
        data: response
      };

    } catch (error) {

      Logger.error("ClickToCall Broadcast Error", error);

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Broadcast call failed"
      };
    }
  }
}