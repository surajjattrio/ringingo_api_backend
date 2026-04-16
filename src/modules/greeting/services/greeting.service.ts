import { HttpStatus, Injectable, InternalServerErrorException, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CommonFunctions } from "src/modules/common/common_functions";
import { CreateGreetingDto } from "../dto/create-greeting.dto";
import { GreetingDocument, GreetingSchema } from "../schema/greeting.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import * as fs from "fs";
import * as path from 'path';
import { promisify } from "util";
import { exec } from "child_process";
import axios from "axios";

const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegStatic);


const execAsync = promisify(exec);
@Injectable()
export class GreetingService {

  /*
  @Usage              : To load greeting schema and other libraries
  @Param @InjectModel : It will load greeting schema
  @Param commonDbFn   : To use commonly created mongoDB functions
  @return Object      : [greeting,commonDbFn] 
  */

  constructor(
    @InjectModel(GreetingSchema.name) private readonly greeting: Model<GreetingDocument>,
    @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }

  /*
  @Usage                 : First it will check whether given name exist or not , if not then new greeting will be created else it will throw error
  @Param createTenantDto : Request paramter that we set into dto
  @return Object         : Success / Error 
  */

  async create(createGreetingDto: CreateGreetingDto) {
    const { name, tenant_uuid, uuid, originalName, role } = createGreetingDto;
    let where = [{ name }, { tenant_uuid }];
    let logMessages = {
      logErrorMsg: "Audio prompt already exist \n",
      logSuccessMsg: "Audio prompt created successfully \n",
    };

    if (role == "manager") {
      //Fetch tenant of manager
      let tenantInfo;
      const lookupUuid = createGreetingDto.manager_uuid || tenant_uuid;
      tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
      if (tenantInfo) {
        createGreetingDto.tenant_uuid = tenantInfo.tenant_uuid;
        createGreetingDto.manager_uuid = lookupUuid as string;
      } else {
        createGreetingDto.manager_uuid = lookupUuid as string;
      }
    }
    let response = await this.commonDbFn.findAndInsert(
      this.greeting,
      where,
      createGreetingDto,
      JSON.stringify(logMessages),
      "and"
    );

    if (originalName.includes(".mp3")) {
      await this.convertFileToWav(uuid);
    }

    // ::yaksh::

    const originalPath = path.join("upload/", `${uuid}.wav`);
    const secondDestination = path.join(
      process.env.UPLOAD_DIRECTORY,
      // `en/`,
      `${uuid}.wav`
    ); // example path

    // Copy file to the second destination
    fs.copyFile(originalPath, secondDestination, (err) => {
      if (err) {
        console.error("Error copying file to second destination:", err);
      } else {
        console.log("File copied to second destination successfully.");
        if (fs.existsSync(secondDestination)) {
          console.log("File exists, proceeding...");

          // Set permissions
          fs.chmod(secondDestination, 0o777, (err) => {
            if (err) {
              console.error("chmod error:", err);
            } else {
              console.log("chmod successful");
            }
          });

          // Set ownership
          fs.chown(secondDestination, 0, 0, (err) => {
            if (err) {
              console.error("chown error:", err);
            } else {
              console.log("chown successful");
            }
          });
        } else {
          console.error("File not found at path:", secondDestination);
        }
      }
    });

    if (response.statusCode == 409) {
      fs.unlink(`${process.env.UPLOAD_DIRECTORY}${uuid}.wav`, (result) => { });
      fs.unlink(`${process.env.UPLOAD_DIRECTORY}${uuid}`, (result) => { });
      fs.unlink(`./upload/${uuid}.wav`, (result) => { });
      fs.unlink(`./upload/${uuid}`, (result) => { });
      return response;
    }
    return response;
  }

  // async create(createGreetingDto: CreateGreetingDto) {
  //     const { name, tenant_uuid , uuid , originalName, role } = createGreetingDto;
  //     let where = [{ name }, { tenant_uuid }];
  //     let logMessages = {
  //         logErrorMsg: "Audio prompt already exist \n",
  //         logSuccessMsg: "Audio prompt created successfully \n"
  //     }

  //     if (role == "manager") {
  //         //Fetch tenant of manager
  //         let tenantInfo;
  //         tenantInfo = await this.manager.findOne({ uuid: tenant_uuid }, { tenant_uuid: 1 }).exec();
  //         createGreetingDto.tenant_uuid = tenantInfo.tenant_uuid;

  //         createGreetingDto.manager_uuid = tenant_uuid;
  //     }
  //     let response = await this.commonDbFn.findAndInsert(this.greeting, where, createGreetingDto, JSON.stringify(logMessages), "and");
  //     if(response.statusCode == 409){
  //         fs.unlink(`${process.env.UPLOAD_DIRECTORY}${uuid}.wav`, (result) => {});
  //     fs.unlink(`${process.env.UPLOAD_DIRECTORY}${uuid}`, (result) => {});
  //         return response;
  //     }
  // if(originalName.includes(".mp3")){
  //         await this.convertFileToWav(uuid);
  //     }
  //     return response;
  // }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of greeting with data 
  */

  async findAll(queryParams) {
    console.log(queryParams);
    let searchFields = ["name", "file", "email"];
    let populateFields = [{ path: "user", select: "username" }, { path: "tenant", select: 'username tenant_name' }];
    return this.commonDbFn.findAllWithPagination(this.greeting, queryParams, searchFields, populateFields);
  }

  /*
  @Usage          : To get single greeting record based on uuid
  @Param uuid     : Search greeting by uuid
  @return Object  : Result of greeting 
  */

  async findOne(uuid: string) {
    let logMessages = {
      logErrorMsg: `Audio prompt not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Audio prompt success fetched by uuid : ${uuid} \n`
    }
    return this.commonDbFn.findOne(this.greeting, uuid, JSON.stringify(logMessages));
  }

  /*
  @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update greeting by uuid
  @Param createGreetingDto   : Request parameters for update
  @return Object             : Success / Error 
  */

  async update(uuid: string, createGreetingDto: CreateGreetingDto) {
    const { name, tenant_uuid } = createGreetingDto;
    const greeting = await this.greeting.findOne({ uuid }).exec();
    if (greeting?.name != name) {
      const checkGreetingExist = await this.greeting.find({ $and: [{ name }, { tenant_uuid }] }).count().exec();
      if (checkGreetingExist > 0) {
        Logger.error("Audio prompt already exist \n", putMethod);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `Audio prompt already exist`);
      }
    }
    let logMessages = {
      logErrorMsg: `Audio prompt not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Audio prompt updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.greeting, uuid, createGreetingDto, JSON.stringify(logMessages));
  }

  /*
  @Usage         : Delete single or multiple greeting using uuid
  @Param uuid    : To delete single greeting pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error 
  */

  async remove(uuid: string) {
    let logMessages = {
      logErrorMsg: `Audio prompt not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `Audio prompt deleted successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.delete(this.greeting, { uuid }, JSON.stringify(logMessages));
  }

  /*
  @Usage              : To search greeting using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of greeting with data 
  */

  async advancedSearch(searchParams) {
    let populateFields = [{ path: "user", select: "username" }, { path: "tenant", select: 'username tenant_name' }];
    return this.commonDbFn.advancedSearch(this.greeting, searchParams, populateFields);
  }

  /*
  @Usage         : To update status of greeting[Active/Inactive]
  @Param uuid    : uuid of greeting
  @Param body    : Contains update body
  @return Object : Success / Error 
  */

  async patch(uuid: string, body) {
    let logMessages = {
      logErrorMsg: `Audio prompt not found by uuid : ${uuid} \n`,
      logSuccessMsg: `Audio prompt status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.greeting, uuid, body, JSON.stringify(logMessages));
  }

  /*
   @Usage         : To convert file to wav[Active/Inactive]
   @Param uuid    : uuid of greeting
   @return Object : It will save .wav file to given location 
   */

  async convertFileToWav(uuid) {
    // const ffmpeg = require('fluent-ffmpeg');
    let path = `./upload/${uuid}`;
    let pathWav = `./upload/${uuid}.wav`;
    let serverPathWav = `${process.env.UPLOAD_DIRECTORY}${uuid}.wav`;

    ffmpeg(path)
      .toFormat('wav')
      .on('error', (err) => {
        console.log('An error occurred: ' + err.message);
      })
      .on('end', () => {
        Logger.debug('Processing finished !');
        fs.unlink(`./upload/${uuid}`, (result) => { });
        fs.unlink(`${process.env.UPLOAD_DIRECTORY}${uuid}`, (result) => { });

        fs.copyFile(pathWav, serverPathWav, () => { })
      })
      .save(pathWav);//path where you want to save your file
  }

  async generateTts(lrNumber: string, company: string): Promise<string> {
    try {
      const consignment = await this.getConsignmentDetails(company, lrNumber);

      const spokenNumber = this.speakDigits(consignment.accountNumber);
      const text = this.buildTtsText(
        spokenNumber,
        consignment.tracking_status,
      );

      const {
        rawWav,
        finalWav,
        destWav
      } = this.prepareTtsPaths(consignment.accountNumber, consignment.deliveryDateTime);

      await this.generateSpeech(text, rawWav);
      await this.processAudio(rawWav, finalWav);

      this.finalizeAudio(finalWav, destWav);

      return destWav;

    } catch (error) {
      console.error("TTS generation failed:", error);
      throw new InternalServerErrorException("TTS generation failed");
    }
  }

  private async getConsignmentDetails(
    company: string,
    lrNumber: string
  ) {
    const fetcherMap = {
      VTRANS: this.fetchVTConsignment,
      VXPRESS: this.fetchVXConsignment,
    };

    const fetcher = fetcherMap[company];
    if (!fetcher) {
      throw new Error(`Unsupported company: ${company}`);
    }

    return fetcher.call(this, lrNumber);
  }

  private buildTtsText(
    spokenNumber: string,
    tracking_status: string
  ): string {
    return `Your GC number ${spokenNumber} status is ${tracking_status}`;
  }

  private prepareTtsPaths(accountNumber: string, deliveryDateTime: string) {
    const outputDir = path.join(process.cwd(), "upload", "tts-audio");
    const destDir = path.join(process.env.UPLOAD_DIRECTORY, "crm_tts");

    [outputDir, destDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const base = `${accountNumber}_${deliveryDateTime.replace(/\s+/g, "_")}`;

    return {
      rawWav: path.join(outputDir, `${base}_raw.wav`),
      finalWav: path.join(outputDir, `${base}.wav`),
      destWav: path.join(destDir, `${base}.wav`)
    };
  }

  async generateSpeech(text: string, rawWav: string): Promise<void> {
    await execAsync(
      `echo "${text}" | piper \
    --model /opt/piper/voices/en_US-lessac-high/en_US-lessac-high.onnx \
    --output_file "${rawWav}"`
    );
  }

  private async processAudio(rawWav: string, finalWav: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(rawWav)
        .audioCodec("pcm_s16le")
        .audioFrequency(8000)
        .audioChannels(1)
        .audioFilters("atempo=0.80") // IVR-friendly speed
        .format("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(finalWav);
    });

    fs.unlinkSync(rawWav);
  }

  private finalizeAudio(finalWav: string, destWav: string): void {
    fs.chmodSync(finalWav, 0o777);
    fs.copyFileSync(finalWav, destWav);
    fs.chmodSync(destWav, 0o777);
  }

  private speakDigits(num: string): string {
    return num.split("").join(", ");
  }

  private async fetchVTConsignment(number: string) {
    try {
      const response = await axios.post(
        process.env.VT_SHIPAPIURL,
        {
          lr: { number }
        },
        {
          headers: {
            'X-ShipX-API-Key': process.env.VT_SHIPAPIKEY,
            'Content-Type': 'application/json',
          },
        },
      );

      const lr = response.data.lrs[0].lr;
      return {
        accountNumber: lr.number,
        tracking_status: lr.tracking_status,
        deliveryDateTime: await this.formatDateTime(lr.delivered_at),
      };
    } catch (err) {
      console.error('Error fetching consignment:', err);
      throw new InternalServerErrorException('Failed to fetch consignment data');
    }
  }

  private async fetchVXConsignment(number: string) {
    try {
      const response = await axios.post(
        process.env.VX_SHIPAPIURL,
        {
          lr: { number }
        },
        {
          headers: {
            'X-ShipX-API-Key': process.env.VX_SHIPAPIKEY,
            'Content-Type': 'application/json',
          },
        },
      );

      const lr = response.data.lrs[0].lr;
      return {
        accountNumber: lr.number,
        tracking_status: lr.tracking_status,
        deliveryDateTime: await this.formatDateTime(lr.delivered_at),
      };
    } catch (err) {
      console.error('Error fetching consignment:', err);
      throw new InternalServerErrorException('Failed to fetch consignment data');
    }
  }

  async formatDateTime(input: string): Promise<string> {
    const date = new Date(input);

    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;

    const suffix =
      day % 10 === 1 && day !== 11 ? 'st' :
        day % 10 === 2 && day !== 12 ? 'nd' :
          day % 10 === 3 && day !== 13 ? 'rd' : 'th';

    return `${day}${suffix} ${month} ${year} ${hour12}:${minutes} ${ampm}`;
  }

}

