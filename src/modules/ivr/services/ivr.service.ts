import { HttpStatus, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { getMethod, postMethod, putMethod } from "src/global_constant";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateIvrDto } from "../dto/create-ivr.dto";
import { IvrDocument, IvrSchema } from "../schema/ivr.schema";
import { ExtensionDocument, ExtensionSchema } from "../../extension/schema/extension.schema";
import { ConferenceDocument, ConferenceSchema } from "../../conference/schema/conference.schema";
import { ManagerDocument, ManagerSchema } from "src/modules/manager/schema/manager.schema";
import * as fs from 'fs';


@Injectable()

export class IvrService {
  commonFn: any;

  /*
  @Usage : To load ivr schema and other libraries
  @Param @InjectModel: It will load ivr schema
  @Param commonDbFn: To use commonly created mongoDB functions
  @return : Object[ivr,commonFn,commonDbFn] 
  */

  constructor(@InjectModel(IvrSchema.name) private readonly ivr: Model<IvrDocument>,
    @InjectModel(ExtensionSchema.name) private readonly extensions: Model<ExtensionDocument>,
    @InjectModel(ConferenceSchema.name) private readonly conference: Model<ConferenceDocument>,
    @InjectModel(ManagerSchema.name) private readonly manager: Model<ManagerDocument>,
    private readonly commonDbFn: CommonDBFunctions
  ) { }


  /*
  @Usage                 : First it will check whether given name exist or not , if not then new ivr will be created else it will throw error
  @Param createIvrDto    : Request paramter that we set into dto
  @return Object         :  Success / Error 
  */

  async create(createIvrDto: CreateIvrDto) {
    const { name, tenant_uuid, domain, role } = createIvrDto;
    let where = [{ name }, { tenant_uuid }];
    let logMessages = {
      logErrorMsg: "IVR already exist \n",
      logSuccessMsg: "IVR created successfully \n"
    }
    if (role == "manager") {
      //Fetch tenant of manager
      let tenantInfo;
      const lookupUuid = createIvrDto.manager_uuid || tenant_uuid;
      tenantInfo = await this.manager.findOne({ uuid: lookupUuid }, { tenant_uuid: 1 }).exec();
      if (tenantInfo) {
        createIvrDto.tenant_uuid = tenantInfo.tenant_uuid;
        createIvrDto.manager_uuid = lookupUuid as string;
      } else {
        createIvrDto.manager_uuid = lookupUuid as string;
      }
    }

    // Check if any digit has routing_type = "11"
    if (createIvrDto.digits.some((d: any) => d.routing_type === "11")) {
      createIvrDto.is_csat = "0";
    }

    let responseIvr = await this.commonDbFn.findAndInsert(this.ivr, where, createIvrDto, JSON.stringify(logMessages), "and", true);
    if (responseIvr.statusCode == 409) { return responseIvr; }
    try {
      //responseIvr.message.digits = digits;
      await this.generateIvrXml(responseIvr, domain);
      delete responseIvr.message;
      return responseIvr;
    } catch (error) {
      // Handle error
      console.error("Failed to generate IVR XML:", error);
    }
  }

  /*
  @Usage             : To get records based on limit,page,search
  @Param queryParams : It will contain page(default=1),limit(default=10),search
  @return Object     : Array of an object with total count of ivr with data 
  */

  async findAll(queryParams) {
    let searchFields = ["name", "timeout"];
    let populateFields = [{ path: "tenant", select: "tenant_name" },
    { path: "user", select: 'username' },
    ];
    return this.commonDbFn.findAllWithPagination(this.ivr, queryParams, searchFields, populateFields, "", true, true);
  }

  /*
  @Usage          : To get single ivr record based on uuid
  @Param uuid     : Search ivr by uuid
  @return Object  : Result of ivr 
  */

  async findOne(uuid: string) {
    const user = await this.ivr.findOne({ uuid }).exec();
    if (user == null) {
      Logger.error(`Ivr not found by uuid : ${uuid} \n`, getMethod); throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "Ivr not found" })
    }
    Logger.debug(`Ivr success fetched by uuid : ${uuid} \n`);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, user);
  }

  /*
  @Usage                     : Check name which comes in request for update already exist or not, if not it will update else it will throw error
  @Param uuid                : Update did by uuid
  @Param updateTenantDto     : Request parameters for update
  @return Object             : Success / Error 
  */

  async update(uuid: string, updateIvrDto: CreateIvrDto) {
    const { name, domain } = updateIvrDto;
    const getIvrData = await this.ivr.findOne({ name }).count().exec();

    if (!getIvrData) {
      const checkNameExist = await this.ivr.find({ name }).count().exec();
      if (checkNameExist > 0) {
        Logger.error("Name already exist \n", putMethod);
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.CONFLICT, `IVR already exist`);
      }
    }
    // Check if any digit has routing_type = "11"
    if (updateIvrDto.digits.some((d: any) => d.routing_type !== "11")) {
      updateIvrDto.is_csat = "1";
    }
    else{
      updateIvrDto.is_csat = "0";
    }
    const ivrUpdate = await this.ivr.updateOne({ uuid }, updateIvrDto).exec();

    if (ivrUpdate.matchedCount == 0 && ivrUpdate.modifiedCount == 0) {
      Logger.error(`Ivr uuid was incorrect ${uuid} \n`, putMethod);
      throw new NotFoundException({ statusCode: HttpStatus.NOT_FOUND, message: "IVR id was incorrect" })
    }
    Logger.debug(`IVR updated successfully by uuid ${uuid} \n`);
    updateIvrDto.uuid = uuid;
    this.generateIvrXml(updateIvrDto, domain);
    return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, "IVR updated successfully");
  }

  /*
  @Usage         : To update status of ivr[Active/Inactive]
  @Param uuid    : uuid of ivr
  @Param body    : Contains update body
  @return Object : Success / Error 
  */

  async patch(uuid: string, body) {
    let logMessages = {
      logErrorMsg: `IVR not found by uuid : ${uuid} \n`,
      logSuccessMsg: `IVR status updated successfully by uuid : ${uuid} \n`
    }
    return this.commonDbFn.update(this.ivr, uuid, body, JSON.stringify(logMessages));
  }

  /*
  @Usage         : Delete single or multiple ivr using uuid
  @Param uuid    : To delete single ivr pass one uuid , for multiple pass comma separated uuids without space
  @return Object : Success / Error 
  */

  async remove(uuid: string) {
    let logMessages = {
      logErrorMsg: `IVR not exist by uuid : ${uuid} \n`,
      logSuccessMsg: `IVR deleted successfully by uuid : ${uuid} \n`
    };

    const response = await this.commonDbFn.delete(this.ivr, { uuid }, JSON.stringify(logMessages));

    if (response.statusCode === 200) {
      // Remove the associated XML file
      const ivr_file_name = '/opt/caching/ivr/' + uuid + '.xml';
      try {
        fs.unlinkSync(ivr_file_name);
        console.log('IVR XML file removed:', ivr_file_name);
      } catch (error) {
        console.error('Failed to remove IVR XML file:', error);
      }
    }

    return response;
  }

  /*
  @Usage              : To search ivr using advanced search
  @Param searchParams : Contains search paramaters
  @return Object      : Array of an object with total count of ivr with data 
  */

  async advancedSearch(searchParams) {
    let populateFields = [{ path: "tenant", select: "tenant_name" },
    { path: "user", select: 'username' },
    ];
    return this.commonDbFn.advancedSearch(this.ivr, searchParams, populateFields);
  }

  // sendReponse(statusCode, data) { return { statusCode, data }; }



  // async generateIvrXml(responseIvr,domain) {
  // 	let response = responseIvr.message != undefined ? responseIvr.message : responseIvr;
  //       	const { uuid, name, greeting_uuid, invalid_greetings_uuid, welcome_greetings_uuid, exit_greetings_uuid, invalid_retries, digits } = response;

  //   let inter_digit_timeout = "2000";
  //   let digit_len = "1";
  //   let xml = "";
  //   for (let i = 0; i < digits.length; i++) {
  //     const data = digits[i];
  //     let xmlElem = "";

  //     switch (data.routing_type) {
  //       case "1":
  //         const getExtension = await this.extensions.find({ uuid: data.routing_options }, { username: 1, _id: 0 }).exec();
  //         xmlElem = "transfer " + getExtension[0]?.username + " XML ${domain_name}";
  //         break;
  //       case "2":
  //         xmlElem = "ivr " + data.routing_options;
  //         break;
  //       case "3":
  //         xmlElem = "transfer " + data.routing_options + " XML ${domain_name}";
  //         break;
  //       case "4":
  //         const getConference = await this.conference.find({ uuid: data.routing_options }, { pin: 1, _id: 0 }).exec();
  //         const confName = uuid + "@default" + (getConference[0].pin ? "+" + getConference[0].pin : "");
  //         xmlElem = "conference " + confName;
  //         break;
  //       case "5":
  //         xmlElem = "transfer ${original_did_number}#PBX#5#" + data.routing_options + " XML ${domain_name}";
  //         break;
  //       case "6":
  //         xmlElem = "transfer ${original_did_number}#PBX#6#" + data.routing_options + " XML ${domain_name}";
  //         break;
  //       case "7":
  //         const getvoicemail = await this.extensions.find({ uuid: data.routing_options }, { username: 1, _id: 0 }).exec();
  //         xmlElem = "voicemail default "+domain+"  " + getvoicemail[0].username;
  //         break;
  //       case "8":
  //         xmlElem = "transfer " + data.routing_options + " XML ${domain_name}";
  //         break;
  //        case "9":
  //         xmlElem = "transfer ${original_did_number}#PBX#9#" + data.routing_options + " XML ${domain_name}";
  //        break;	
  //       default:
  //         break;
  //     }

  //     if (xmlElem !== "") {
  //       if (data.routing_type === 'Reapt menu') {
  //         xml += '<entry action="menu-top" digits="${data.digits}"/>\n';
  //       } else {
  //         xml += `<entry action="menu-exec-app" digits="${data.digits}" param="${xmlElem}"/>`;
  //       }
  //     }
  //   }

  // /*  if (xml !== "") {
  //     xml = `<menu name="${uuid}" greet-long="${welcome_greetings}" greet-short="" invalid-sound="${invalid_greetings}" exit-sound="${exit_greetings}" timeout="10000" inter-digit-timeout="${inter_digit_timeout}" max-timeouts="1" max-failures="${invalid_retries}" digit-len="${digit_len}">
  //       ${xml}</menu>`;
  //     xml = `<configuration name="ivr.conf" description="IVR menus">
  //       <menus>${xml}
  //       </menus>
  //     </configuration>`;
  //     xml = `<document type="freeswitch/xml">
  //       <section name="configuration">
  //         ${xml}
  //       </section>
  //     </document>`;

  //     // Writing the XML to a file
  //     const ivr_uuid = uuid;
  //     const ivr_file_name = '/opt/caching/ivr/' + ivr_uuid + '.xml';
  //     fs.writeFileSync(ivr_file_name, xml);
  //     console.log(ivr_file_name);

  //   }*/

  //   if (xml !== "") {
  //     xml = `<menu name="${uuid}" greet-long="${process.env.UPLOAD_DIRECTORY}${welcome_greetings_uuid}.wav" greet-short="" invalid-sound="${process.env.UPLOAD_DIRECTORY}${invalid_greetings_uuid}.wav" exit-sound="${process.env.UPLOAD_DIRECTORY}${exit_greetings_uuid}.wav" timeout="10000" inter-digit-timeout="${inter_digit_timeout}" max-timeouts="1" max-failures="${invalid_retries}" digit-len="${digit_len}">\n${xml}</menu>\n`;
  //     xml = `<configuration name="ivr.conf" description="IVR menus">\n<menus>${xml}</menus>\n</configuration>\n`;
  //     xml = `<document type="freeswitch/xml">\n<section name="configuration">\n${xml}</section>\n</document>\n`;
  //   }

  //   // Writing the XML to a file
  //    const ivr_uuid = uuid;
  //    const ivr_file_name = '/opt/caching/ivr/' + ivr_uuid + '.xml';
  //    fs.writeFileSync(ivr_file_name, xml);
  //    console.log(ivr_file_name);
  // }

  private async buildRouteParam(
    ivrUuid: string,
    domain: string,
    routing_type: string,
    routing_options: string,
    digitKey: string
  ): Promise<string> {
    let xmlElem = "";

    switch (routing_type) {
      case "1": {
        const getExtension = await this.extensions
          .find({ uuid: routing_options }, { username: 1, _id: 0 })
          .exec();
        xmlElem = "transfer " + (getExtension[0]?.username || "") + " XML ${domain_name}";
        break;
      }
      case "2":
        xmlElem = "ivr " + routing_options;
        break;

      case "3":
        xmlElem = "transfer " + routing_options + " XML ${domain_name}";
        break;

      case "4": {
        const getConference = await this.conference
          .find({ uuid: routing_options }, { pin: 1, _id: 0 })
          .exec();
        const confName =
          ivrUuid + "@default" + (getConference[0]?.pin ? "+" + getConference[0].pin : "");
        xmlElem = "conference " + confName;
        break;
      }

      case "5":
        xmlElem =
          "transfer ${original_did_number}#PBX#5#" +
          routing_options +
          " XML ${domain_name}";
        break;

      case "6":
        xmlElem =
          "transfer ${original_did_number}#PBX#6#" +
          routing_options +
          " XML ${domain_name}";
        break;

      case "7": {
        const getvoicemail = await this.extensions
          .find({ uuid: routing_options }, { username: 1, _id: 0 })
          .exec();
        xmlElem = "voicemail default " + domain + "  " + (getvoicemail[0]?.username || "");
        break;
      }

      case "8":
        xmlElem = "bridge sofia/gateway/" + routing_options.replace("|","/");
        break;

      case "9":
        xmlElem =
          "transfer ${original_did_number}#PBX#9#" +
          routing_options +
          " XML ${domain_name}";
        break;

      case "10":
        xmlElem = "lua " + routing_options + ".lua";
        break;

      case "11":
        xmlElem = "lua " + routing_options + ".lua " + digitKey;
        break;

      default:
        break;
    }

    return xmlElem;
  }

  async generateIvrXml(responseIvr, domain: string) {
    const response = responseIvr?.message !== undefined ? responseIvr.message : responseIvr;

    const {
      uuid,
      invalid_greetings_uuid,
      welcome_greetings_uuid,
      exit_greetings_uuid,
      invalid_retries,
      digits,
      timeout,
    } = response;

    const ivrDir = "/opt/caching/ivr";
    if (!fs.existsSync(ivrDir)) fs.mkdirSync(ivrDir, { recursive: true });

    const inter_digit_timeout = "2000";
    const digit_len = "1";

    const timeoutMs =
      Number.isFinite(parseInt(timeout, 10)) && parseInt(timeout, 10) > 0
        ? String(parseInt(timeout, 10) * 1000)
        : "10000";

    const maxFailures =
      Number.isFinite(parseInt(invalid_retries, 10)) && parseInt(invalid_retries, 10) > 0
        ? String(parseInt(invalid_retries, 10))
        : "1";

    const entriesXml: string[] = [];

    let timeoutAction: string | null = null;
    let failureAction: string | null = null;

    if (Array.isArray(digits)) {
      for (const d of digits) {
        const digitKey = String(d?.digits ?? "").trim();
        const digitKeyLc = digitKey.toLowerCase();

        const routing_type = String(d?.routing_type ?? "").trim();
        const routing_options = String(d?.routing_options ?? "").trim();

        const routeParam = await this.buildRouteParam(uuid, domain, routing_type, routing_options, digitKey);
        if (!routeParam) continue;

        if (digitKeyLc === "timeout") {
          timeoutAction = routeParam;
          continue;
        }

        if (digitKeyLc === "invalid") {
          failureAction = routeParam;
          continue;
        }

        entriesXml.push(
          `          <entry action="menu-exec-app" digits="${digitKey}"\n` +
          `                 param="${routeParam}"/>\n`
        );
      }
    }

    if (timeoutAction && !failureAction) failureAction = timeoutAction;

    const uploadDir = String(process.env.UPLOAD_DIRECTORY || "").trim();

    const menuAttrs: string[] = [];
    menuAttrs.push(`name="${uuid}"`);
    menuAttrs.push(`greet-long="${uploadDir}${welcome_greetings_uuid}.wav"`);
    menuAttrs.push(`greet-short=""`);
    menuAttrs.push(
      `invalid-sound="${invalid_greetings_uuid ? uploadDir + invalid_greetings_uuid + ".wav" : ""
      }"`
    );
    menuAttrs.push(
      `exit-sound="${exit_greetings_uuid ? uploadDir + exit_greetings_uuid + ".wav" : ""}"`
    );
    menuAttrs.push(`timeout="${timeoutMs}"`);
    menuAttrs.push(`inter-digit-timeout="${inter_digit_timeout}"`);
    menuAttrs.push(`max-timeouts="1"`);
    menuAttrs.push(`max-failures="${maxFailures}"`);
    menuAttrs.push(`digit-len="${digit_len}"`);

    if (timeoutAction) menuAttrs.push(`exec-on-max-timeouts="${timeoutAction}"`);
    if (failureAction) menuAttrs.push(`exec-on-max-failures="${failureAction}"`);

    const xml =
      `<document type="freeswitch/xml">\n` +
      `  <section name="configuration">\n` +
      `    <configuration name="ivr.conf" description="IVR menus">\n` +
      `      <menus>\n` +
      `        <menu ${menuAttrs.join("\n              ")}>\n\n` +
      `${entriesXml.join("\n")}` +
      `        </menu>\n` +
      `      </menus>\n` +
      `    </configuration>\n` +
      `  </section>\n` +
      `</document>\n`;

    const ivr_file_name = "/opt/caching/ivr/" + uuid + ".xml";
    fs.writeFileSync(ivr_file_name, xml);
    console.log(ivr_file_name);
  }



}

