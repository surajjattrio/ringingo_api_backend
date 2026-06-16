import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiConfiguration, ApiConfigurationDocument } from '../schema/api-configuration.schema';
import { CreateApiConfigurationDto, UpdateApiConfigurationDto } from '../dto/api-configuration.dto';
import { CommonDBFunctions } from 'src/modules/common/common_db_functions';
import axios from 'axios';

@Injectable()
export class ApiConfigurationService {
  constructor(
    @InjectModel(ApiConfiguration.name)
    private apiConfigurationModel: Model<ApiConfigurationDocument>,
    private readonly commonDbFn: CommonDBFunctions,
  ) {}

  async create(createDto: any): Promise<any> {
    const logMessages = {
      logSuccessMsg: "API Configuration Created Successfully",
      logErrorMsg: "Failed to Create API Configuration"
    };
    return this.commonDbFn.insert(this.apiConfigurationModel, createDto, JSON.stringify(logMessages), true);
  }

  async findAll(queryParams: any): Promise<any> {
    const { tenant_uuid, search, limit = 10, page = 1 } = queryParams;
    const query: any = { tenant_uuid };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const data = await this.apiConfigurationModel.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(limit) * (Number(page) - 1))
      .lean()
      .exec();
      
    const count = await this.apiConfigurationModel.countDocuments(query).exec();
    
    return {
      statusCode: HttpStatus.OK,
      data: data,
      count: count
    };
  }

  async findOne(uuid: string, tenant_uuid?: string): Promise<any> {
    const query: any = { uuid };
    if (tenant_uuid) query.tenant_uuid = tenant_uuid;
    
    const result = await this.apiConfigurationModel.findOne(query).exec();
    if (!result) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: "API Configuration Not Found"
      };
    }
    return {
      statusCode: HttpStatus.OK,
      data: result
    };
  }

  async update(uuid: string, updateDto: any): Promise<any> {
    const logMessages = {
      logSuccessMsg: "API Configuration Updated Successfully",
      logErrorMsg: "Failed to Update API Configuration"
    };
    const { tenant_uuid } = updateDto;
    return this.commonDbFn.update(this.apiConfigurationModel, uuid, updateDto, JSON.stringify(logMessages));
  }

  async remove(uuid: string, tenant_uuid?: string): Promise<any> {
    const logMessages = {
      logSuccessMsg: "API Configuration Deleted Successfully",
      logErrorMsg: "Failed to Delete API Configuration"
    };
    // The CommonDBFunctions.delete expects an object with uuid
    return this.commonDbFn.delete(this.apiConfigurationModel, { uuid }, JSON.stringify(logMessages));
  }

  async sendEmail(payload: any): Promise<any> {
    const { config_uuid, to, lead_data } = payload;
    Logger.log(`[sendEmail] Attempting to send API email to ${to} using config ${config_uuid}`);

    try {
      const apiConfig = await this.apiConfigurationModel.findOne({ uuid: config_uuid }).exec();
      if (!apiConfig) {
        throw new Error(`API configuration not found for UUID: ${config_uuid}`);
      }
      console.log("API Configuration for email:", apiConfig);

      return await this.sendNetcoreEmail(apiConfig, to, lead_data, payload.templateId);
    } catch (error: any) {
      Logger.error(`[sendEmail] Failed to send API email: ${error.message}`);
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, `Failed to send API email: ${error.message}`);
    }
  }

  private async sendNetcoreEmail(apiConfig: any, toEmail: string, leadData: any, customTemplateId?: string) {
    try {
      const email = toEmail || leadData?.email || "";
      
      let baseTemplateId = apiConfig.templateId;
      if (typeof baseTemplateId === 'string') {
        if (baseTemplateId.includes(',')) {
          baseTemplateId = baseTemplateId.split(',')[0].trim();
        }
        if (baseTemplateId.includes(':')) {
          baseTemplateId = baseTemplateId.split(':')[0].trim();
        }
      }
      
      let finalTemplateStr = customTemplateId || baseTemplateId;
      if (typeof finalTemplateStr === 'string' && finalTemplateStr.includes(':')) {
        finalTemplateStr = finalTemplateStr.split(':')[0].trim();
      }
      const templateId = Number(finalTemplateStr) || 225;

      Logger.log(`[sendNetcoreEmail] Sending Netcore Email template ${templateId} to ${email}`);

      // Parse and map variables dynamically
      let configVariables: string[] = [];
      if (Array.isArray(apiConfig.variables)) {
        configVariables = apiConfig.variables;
      } else if (typeof apiConfig.variables === 'string') {
        configVariables = (apiConfig.variables as string).split(',').map(s => s.trim());
      }

      const mappedVariables = configVariables.map((variable: string) => {
        const trimmed = variable.trim();
        if (trimmed === "$username") {
          return leadData?.first_name || "User";
        }
        if (trimmed === "$email") {
          return email;
        }
        return variable;
      });
      console.log("Mapped Variables:", mappedVariables);
      

      const payload: any = {
        templateId: templateId,
        fromEmail: apiConfig.fromEmail || "",
        to: [
          {
            email: email
          }
        ],
        variables: mappedVariables
      };

      // Attachments only if configured
      if (apiConfig.attachmentFileUrl && apiConfig.attachmentFileUrl.trim() !== "") {
        payload.attachments = [
          {
            fileName: apiConfig.attachmentFileName || "Documents.pdf",
            fileURL: apiConfig.attachmentFileUrl.trim()
          }
        ];
      }

      const headers = {
        'Source': 'kpo',
        'Content-Type': 'application/json',
        'Authorization': 'Basic MWZfdHRic19kaWFsZXI6N1RQdUkzbTcxcjE0'
      };
      console.log(payload,'payloadddddddddddddddd')

      const targetUrl = apiConfig.baseUrl && apiConfig.baseUrl.trim() !== "" ? apiConfig.baseUrl.trim() : 'https://netcore.onefin.app/api/netcore/email';
      Logger.log(`[sendNetcoreEmail] Posting to URL: ${targetUrl}`);
      const response = await axios.post(targetUrl, payload, { headers });
      
      Logger.log(`[sendNetcoreEmail] Netcore API response: ${JSON.stringify(response.data)}`);

      if (response.data && (response.data.status === 'success' || response.data.message)) {
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, response.data.message || "Email sent successfully via Netcore.");
      } else {
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, `Netcore response: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      Logger.error(`[sendNetcoreEmail] Axios call to Netcore failed: ${error.message}`);
      if (error.response?.data) {
        Logger.error(`[sendNetcoreEmail] Failure Details: ${JSON.stringify(error.response.data)}`);
      }
      return this.commonDbFn.sendResponseWithMessage(HttpStatus.BAD_REQUEST, `Failed to send API email: ${error.message}`);
    }
  }
}
