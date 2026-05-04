import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';
import * as amqp from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerConfig } from 'src/logger/winston-logger.config';
import { TenantSchema, TenantDocument } from '../schema/tenant.schema';
import { CommonFunctions } from 'src/modules/common/common_functions';

@Injectable()
export class TenantRabbitmqService implements OnModuleInit {
  private readonly logger = WinstonModule.createLogger(winstonLoggerConfig);
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private queueName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly commonFn: CommonFunctions,
    @InjectModel(TenantSchema.name) private readonly tenantModel: Model<TenantDocument>,
  ) {
    const baseQueueName = this.config.get<string>('TENANT_MANAGEMENT_QUEUE');
    const instanceId = this.config.get<string>('INSTANCE_ID');
    this.queueName = `${baseQueueName}_${instanceId}`;
  }

  async onModuleInit() {
    this.setupConnection();
  }

  private setupConnection() {
    const rmqUrl = (this.config.get<string>('RABBITMQ_URL') || '').replace(/^\"|\"$/g, '');
    
    if (!rmqUrl) {
      this.logger.error('RABBITMQ_URL not found in environment variables.');
      return;
    }

    this.connection = amqp.connect([rmqUrl], { heartbeatIntervalInSeconds: 10 });
    
    this.connection.on('connect', () => this.logger.log('[RabbitMQ] Connected successfully'));
    this.connection.on('disconnect', (err) => {
      const message = err?.err?.message || 'Unknown disconnection error';
      this.logger.error(`[RabbitMQ] Disconnected: ${message}`);
    });
    this.connection.on('connectFailed', (err) => {
      const message = err?.err?.message || 'Connection failed';
      this.logger.error(`[RabbitMQ] Connection failed: ${message}`);
    });
    this.connection.on('error', (err) => {
      const message = err?.message || 'Connection internal error';
      this.logger.error(`[RabbitMQ] Internal Error: ${message}`);
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel) => {
        const dlqName = `${this.queueName}_dlq`;
        
        this.logger.log(`[RabbitMQ] Initializing queues: ${this.queueName} and ${dlqName}`);
        
        // 1. Assert DLQ and Main Queue
        await channel.assertQueue(dlqName, { durable: true });
        await channel.assertQueue(this.queueName, { 
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': dlqName
          }
        });
        
        await channel.prefetch(1);

        // 2. Start Consuming immediately after assertion
        this.logger.log(`[RabbitMQ] Starting consumer for ${this.queueName}`);
        await channel.consume(this.queueName, async (msg) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              this.logger.log(`[RabbitMQ Consumer] Received ${content.pattern} event`);

              await this.handleMessage(content.pattern, content.data);
              channel.ack(msg);
              this.logger.log(`[RabbitMQ Consumer] Message acknowledged`);
            } catch (err) {
              this.logger.error(`[RabbitMQ Consumer] Processing error`, {
                error: err.message,
                stack: err.stack,
                queue: this.queueName
              });
              
              // Only nack if channel is still open
              try {
                channel.nack(msg, false, false);
              } catch (nackErr) {
                this.logger.warn(`[RabbitMQ Consumer] Failed to nack message, channel might be closed: ${nackErr.message}`);
              }
            }
          }
        });
      },
    });
  }

  async publish(pattern: string, data: any, retries = 3) {
    try {
      const payload = { pattern, data };
      this.logger.log(`[RabbitMQ] Publishing event: ${pattern}`, { tenant: data.uuid, payload: data });
      await this.channelWrapper.sendToQueue(this.queueName, payload);
      this.logger.log(`[RabbitMQ] Message successfully pushed to queue`, { queue: this.queueName });
    } catch (err) {
      this.logger.error(`[RabbitMQ] Error publishing to queue: ${err.message}`);
      if (retries > 0) {
        this.logger.log(`[RabbitMQ] Retrying publish for ${pattern}... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await this.publish(pattern, data, retries - 1);
      }
    }
  }

  checkHealth() {
    if (!this.connection) {
      return { status: 'down', message: 'Connection object not initialized' };
    }
    const isConnected = this.connection.isConnected();
    return {
      status: isConnected ? 'up' : 'down',
      message: isConnected ? 'RabbitMQ is connected' : 'RabbitMQ is disconnected'
    };
  }
  /**
   * SEPARATE FLOW for manual sync.
   */
  async syncManual(pattern: string, data: any) {
    const apiKey = 'ringingo-eyFxs8ldOszbLVb0qL2zcySM';
    const baseUrl = 'https://omni.justtawk.com/api/third-party';
    const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };

    try {
      if (pattern === 'tenant.created') {
        // 1. Create Vendor
        const rawPassword = await this.commonFn.decode(data.password);
        const createPayload = {
          vendor_title: data.tenant_name,
          username: data.username,
          first_name: data.tenant_name.split(' ')[0] || 'Admin',
          last_name: data.tenant_name.split(' ').slice(1).join(' ') || 'User',
          mobile_number: data.mobile_number,
          email: data.email,
          password: rawPassword,
          password_confirmation: rawPassword,
        };

        this.logger.log(`[ManualSync] Creating vendor on JustTawk...`, { email: data.email });
        try {
          await axios.post(`${baseUrl}/vendors`, createPayload, { headers });
        } catch (e) {
          throw e;
        }

        // 2. Get API Token
        let tokenRes;
        const maxRetries = 5;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            this.logger.log(`[ManualSync] Token fetch attempt ${attempt}/${maxRetries}...`);
            tokenRes = await axios.post(`${baseUrl}/vendor-api-token`, {
              email: data.email,
              password: rawPassword
            }, { headers });

            if (tokenRes?.data?.result === 'success') break;
          } catch (e) {            
            if (attempt < maxRetries) {
              const waitTime = attempt * 3000;
              this.logger.warn(`[ManualSync] Vendor still reloading, waiting ${waitTime}ms before retry...`);
              await new Promise(res => setTimeout(res, waitTime));
            } else {
              throw e;
            }
          }
        }

        if (tokenRes?.data?.result === 'success') {
          const { vendor_uid, token } = tokenRes.data.data;
          await this.tenantModel.updateOne(
            { uuid: data.uuid },
            { vendor_uid: vendor_uid, vendor_token: token }
          );
          this.logger.log(`[ManualSync] Vendor synced and token stored`, { vendor_uid });
          return { success: true, vendor_uid };
        } else {
          throw new Error(tokenRes?.data?.message || 'Failed to fetch vendor API token');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      this.logger.error(`[ManualSync] Error: ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  private async handleMessage(pattern: string, data: any) {
    const apiKey = 'ringingo-eyFxs8ldOszbLVb0qL2zcySM';
    const baseUrl = 'https://omni.justtawk.com/api/third-party';
    const headers = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };

    try {
      if (pattern === 'tenant.created') {
        // 1. Create Vendor
        const rawPassword = await this.commonFn.decode(data.password);
        const createPayload = {
          vendor_title: data.tenant_name,
          username: data.username,
          first_name: data.tenant_name.split(' ')[0] || 'Admin', // Heuristic if first/last name not separated
          last_name: data.tenant_name.split(' ').slice(1).join(' ') || 'User',
          mobile_number: data.mobile_number,
          email: data.email,
          password: rawPassword,
          password_confirmation: rawPassword,
        };

        this.logger.log(`[Sync] Creating vendor on JustTawk...`, { email: data.email });
        let vendorUid;
        try {
          const createRes = await axios.post(`${baseUrl}/vendors`, createPayload, { headers });
          this.logger.log(`[Sync] Vendor creation successful`, { status: createRes.status });
        } catch (e) {
          if (e.response?.status === 422 && (JSON.stringify(e.response.data).includes('already exists') || JSON.stringify(e.response.data).includes('Settings updated'))) {
            this.logger.warn(`[Sync] Vendor might already exist or is initializing, proceeding...`);
          } else {
            throw e;
          }
        }

        // 2. Get API Token with Robust Retry
        this.logger.log(`[Sync] Fetching API token for vendor...`, { email: data.email });
        
        let tokenRes;
        const maxRetries = 5;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            this.logger.log(`[Sync] Token fetch attempt ${attempt}/${maxRetries}...`);
            tokenRes = await axios.post(`${baseUrl}/vendor-api-token`, {
              email: data.email,
              password: rawPassword
            }, { headers });

            if (tokenRes.data?.result === 'success') break;
          } catch (e) {
            const isReloading = JSON.stringify(e.response?.data).includes('reloading');
            if (isReloading && attempt < maxRetries) {
              const waitTime = attempt * 3000; // 3s, 6s, 9s...
              this.logger.warn(`[Sync] Vendor still reloading, waiting ${waitTime}ms before retry...`);
              await new Promise(res => setTimeout(res, waitTime));
            } else {
              this.logger.error(`[Sync] Token fetch failed on attempt ${attempt}`, { 
                status: e.response?.status, 
                data: e.response?.data 
              });
              if (attempt === maxRetries) throw e;
            }
          }
        }

        if (tokenRes?.data?.result === 'success') {
          const { vendor_uid, token } = tokenRes.data.data;
          const finalVendorUid = vendor_uid || vendorUid;
          
          await this.tenantModel.updateOne(
            { uuid: data.uuid },
            { vendor_uid: finalVendorUid, vendor_token: token }
          );
          this.logger.log(`[Sync] Vendor synced and token stored locally`, { vendor_uid: finalVendorUid });
        } else {
          this.logger.error(`[Sync] Token fetch returned non-success result after retries`, { data: tokenRes?.data });
        }
      }

      let tenantRecord: any = null;
      let vendorUid: string = data.vendor_uid;

      if (pattern !== 'tenant.created') {
        tenantRecord = await this.tenantModel.findOne({ uuid: data.uuid });
        vendorUid = vendorUid || tenantRecord?.vendor_uid;
        
        if (!vendorUid) {
          this.logger.warn(`[Sync] Pattern ${pattern}: No vendor_uid found, skipping sync`, { uuid: data.uuid });
          return;
        }

        if (pattern === 'tenant.updated') {
          // If record is missing but we have vendorUid, we can still try to update with what's in 'data'
          const nameParts = (data.tenant_name || tenantRecord?.tenant_name || 'Tenant').split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || 'User';

          const updatePayload: any = {
            vendor_title: data.tenant_name || tenantRecord?.tenant_name,
            username: data.username || tenantRecord?.username,
            first_name: firstName,
            last_name: lastName,
            mobile_number: data.mobile_number || tenantRecord?.mobile_number,
            email: data.email || tenantRecord?.email,
            is_active: data.status !== undefined ? data.status === '0' : (tenantRecord?.status === '0')
          };

          this.logger.log(`[Sync] Updating vendor on JustTawk...`, { vendor_uid: vendorUid });
          await axios.put(`${baseUrl}/vendors/${vendorUid}`, updatePayload, { headers });

          // If status specifically changed, call status endpoint
          if (data.status !== undefined) {
            await axios.post(`${baseUrl}/vendors/${vendorUid}/status`, {
              is_active: data.status === '0'
            }, { headers });
          }

          // If password changed, re-fetch token
          if (data.password) {
            this.logger.log(`[Sync] Password changed, re-fetching API token...`, { email: updatePayload.email });
            const rawPassword = await this.commonFn.decode(data.password);
            const tokenRes = await axios.post(`${baseUrl}/vendor-api-token`, {
              email: updatePayload.email,
              password: rawPassword
            }, { headers });

            if (tokenRes.data?.result === 'success') {
              const { token } = tokenRes.data.data;
              await this.tenantModel.updateOne(
                { uuid: data.uuid },
                { vendor_token: token }
              );
              this.logger.log(`[Sync] Vendor token refreshed after password change`);
            }
          }
        }

        if (pattern === 'tenant.deleted') {
          this.logger.log(`[Sync] Deleting vendor on JustTawk...`, { vendor_uid: vendorUid });
          await axios.delete(`${baseUrl}/vendors/${vendorUid}`, { headers });
        }
      }
    } catch (error) {
      const errorMessage = error.response
        ? `Status: ${error.response.status} - Data: ${JSON.stringify(error.response.data)}`
        : error.message;

      this.logger.error(`[Sync] Error syncing to JustTawk`, {
        pattern,
        tenant: data.uuid,
        error: errorMessage
      });
      throw error;
    }
  }
}
