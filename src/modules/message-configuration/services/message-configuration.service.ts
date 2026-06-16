import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MessageConfiguration, MessageConfigurationDocument } from '../schema/message-configuration.schema';
import { CommonDBFunctions } from 'src/modules/common/common_db_functions';
import axios from 'axios';

@Injectable()
export class MessageConfigurationService {
  constructor(
    @InjectModel(MessageConfiguration.name)
    private messageConfigurationModel: Model<MessageConfigurationDocument>,
    private readonly commonDbFn: CommonDBFunctions,
  ) {}

  async create(createDto: any): Promise<any> {
    const logMessages = {
      logSuccessMsg: "Message Configuration Created Successfully",
      logErrorMsg: "Failed to Create Message Configuration"
    };
    return this.commonDbFn.insert(this.messageConfigurationModel, createDto, JSON.stringify(logMessages), true);
  }

  async findAll(queryParams: any): Promise<any> {
    const { tenant_uuid, search, limit = 10, page = 1 } = queryParams;
    const query: any = { tenant_uuid };
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const data = await this.messageConfigurationModel.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(limit) * (Number(page) - 1))
      .lean()
      .exec();
      
    const count = await this.messageConfigurationModel.countDocuments(query).exec();
    
    return {
      statusCode: HttpStatus.OK,
      data: data,
      count: count
    };
  }

  async findOne(uuid: string, tenant_uuid?: string): Promise<any> {
    const query: any = { uuid };
    if (tenant_uuid) query.tenant_uuid = tenant_uuid;
    
    const result = await this.messageConfigurationModel.findOne(query).exec();
    if (!result) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: "Message Configuration Not Found"
      };
    }
    return {
      statusCode: HttpStatus.OK,
      data: result
    };
  }

  async update(uuid: string, updateDto: any): Promise<any> {
    const logMessages = {
      logSuccessMsg: "Message Configuration Updated Successfully",
      logErrorMsg: "Failed to Update Message Configuration"
    };
    return this.commonDbFn.update(this.messageConfigurationModel, uuid, updateDto, JSON.stringify(logMessages));
  }

  async remove(uuid: string): Promise<any> {
    const logMessages = {
      logSuccessMsg: "Message Configuration Deleted Successfully",
      logErrorMsg: "Failed to Delete Message Configuration"
    };
    return this.commonDbFn.delete(this.messageConfigurationModel, { uuid }, JSON.stringify(logMessages));
  }

  async sendMessage(payload: any): Promise<any> {
    const { config_uuid, to, lead_data } = payload;
    console.log("sendMessage called with payload:", payload);
    try {
      const config = await this.messageConfigurationModel.findOne({ uuid: config_uuid }).exec();
      if (!config) {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: "Message Configuration Not Found"
        };
      }

        // Create a unified replacement object that guarantees both phone variables are updated with 'to'
        const replacementData = { ...lead_data, phone_number: to, custom_phone_number: to };

      // 1. Resolve URL
      const resolvedUrl = this.replacePlaceholders(config.baseUrl, replacementData);

      // 2. Resolve headers dynamically from the database UI
      const resolvedHeaders: Record<string, string> = {};
      if (Array.isArray(config.headers)) {
        for (const h of config.headers) {
          if (h && h.key && h.value) {
            resolvedHeaders[h.key] = this.replacePlaceholders(h.value, replacementData);
          }
        }
      }

      // Ensure Content-Type is set if not provided, default to application/json
      if (!Object.keys(resolvedHeaders).some(k => k.toLowerCase() === 'content-type')) {
        resolvedHeaders['Content-Type'] = 'application/json';
      }

      // 3. Resolve body dynamically from the database UI
      let requestData: any = undefined;
      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method.toUpperCase())) {
        const resolvedBodyStr = this.replacePlaceholders(config.body, replacementData);
        try {
          requestData = JSON.parse(resolvedBodyStr);
        } catch (e) {
          requestData = resolvedBodyStr; // fallback to string if JSON parsing fails
        }
      }

      const response = await axios({
        method: config.method.toUpperCase() || 'POST',
        url: resolvedUrl,
        headers: resolvedHeaders,
        data: requestData,
        timeout: 10000 // 10s timeout
      });

      return {
        statusCode: HttpStatus.OK,
        message: "Message sent successfully",
        data: response.data
      };

    } catch (error: any) {
      console.error(`[MessageConfiguration] Error sending message to ${payload.to}:`, error.message);
      if (error.response?.data) {
        console.error(`[MessageConfiguration] Response Error Details:`, error.response.data);
      }
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: error.response?.data?.message || error.response?.data?.error || error.message || "Failed to send message"
      };
    }
  }

  private replacePlaceholders(template: string, leadData: any): string {
    if (!template || typeof template !== 'string') return template;
    
    // Supports <Variable>, [Variable], {Variable}, {{Variable}} or $Variable
    return template.replace(/(?:<|&lt;|\[|\{+)(.*?)(?:>|&gt;|\]|\}+)|\$([a-zA-Z0-9_]+)/g, (match, g1, g2) => {
      const variableName = g1 || g2;
      const simplifiedSearchKey = variableName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      if (simplifiedSearchKey === 'phone' || simplifiedSearchKey === 'phonenumber') {
        return leadData?.custom_phone_number || leadData?.phone_number || '';
      }
      
      if (!leadData) return '';
      
      // Direct match in leadData keys (e.g. first_name, email)
      const directFieldKey = Object.keys(leadData).find(
        k => k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() === simplifiedSearchKey
      );
      if (directFieldKey && leadData[directFieldKey] !== undefined && leadData[directFieldKey] !== null) {
        return String(leadData[directFieldKey]);
      }
      
      // Custom fields match
      if (leadData.custom_fields) {
        const customFieldKey = Object.keys(leadData.custom_fields).find(k => {
          const simplifiedK = k.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          return simplifiedK === simplifiedSearchKey;
        });
        if (customFieldKey && leadData.custom_fields[customFieldKey] !== undefined && leadData.custom_fields[customFieldKey] !== null) {
          return String(leadData.custom_fields[customFieldKey]);
        }
      }
      
      return match;
    });
  }
}
