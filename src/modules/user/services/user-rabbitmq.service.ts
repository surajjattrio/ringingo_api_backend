import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as amqp from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerConfig } from 'src/logger/winston-logger.config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UserDocument, UserSchema } from '../schema/user.schema';
import { TenantDocument, TenantSchema } from '../../tenant/schema/tenant.schema';
import { CommonFunctions } from '../../common/common_functions';

@Injectable()
export class UserRabbitmqService implements OnModuleInit {
  private readonly logger = WinstonModule.createLogger(winstonLoggerConfig);
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private queueName: string;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(UserSchema.name) private userModel: Model<UserDocument>,
    @InjectModel(TenantSchema.name) private tenantModel: Model<TenantDocument>,
    private readonly commonFn: CommonFunctions,
  ) {
    const baseQueueName = this.config.get<string>('AGENT_MANAGEMENT_QUEUE');
    const instanceId = this.config.get<string>('INSTANCE_ID');
    this.queueName = `${baseQueueName}_${instanceId}`;
  }

  async onModuleInit() {
    this.setupConnection();
  }

  private setupConnection() {
    const rmqUrl = (this.config.get<string>('RABBITMQ_URL') || '').replace(/^\"|\"$/g, '');
    
    if (!rmqUrl) {
      this.logger.error('[UserRabbitMQ] RABBITMQ_URL not found in environment variables.');
      return;
    }

    this.connection = amqp.connect([rmqUrl], { heartbeatIntervalInSeconds: 10 });
    
    this.connection.on('connect', () => this.logger.log('[UserRabbitMQ] Connected successfully'));
    this.connection.on('disconnect', (err) => {
      const message = err?.err?.message || 'Unknown disconnection error';
      this.logger.error(`[UserRabbitMQ] Disconnected: ${message}`);
    });

    this.channelWrapper = this.connection.createChannel({
      json: true,
      setup: async (channel) => {
        const dlqName = `${this.queueName}_dlq`;
        await channel.assertQueue(dlqName, { durable: true });
        await channel.assertQueue(this.queueName, { 
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': dlqName
          }
        });
        
        await channel.prefetch(1);
        await channel.consume(this.queueName, async (msg) => {
          if (msg) {
            const content = JSON.parse(msg.content.toString());
            const maxRetries = 3;
            let attempt = 0;
            let success = false;

            while (attempt < maxRetries && !success) {
              try {
                await this.handleMessage(content.pattern, content.data);
                channel.ack(msg);
                success = true;
              } catch (err) {
                attempt++;
                this.logger.error(`[UserRabbitMQ] Error pattern ${content.pattern} (Attempt ${attempt}/${maxRetries})`, { error: err.message });
                
                if (attempt < maxRetries) {
                  const backoff = attempt * 2000;
                  this.logger.log(`[UserRabbitMQ] Waiting ${backoff}ms before retrying...`);
                  await new Promise(resolve => setTimeout(resolve, backoff));
                } else {
                  this.logger.error(`[UserRabbitMQ] Max retries reached for pattern ${content.pattern}, moving to DLQ.`);
                  try {
                    channel.nack(msg, false, false); 
                  } catch (nackErr) {
                    this.logger.warn(`[UserRabbitMQ] Failed to nack message, channel might be closed: ${nackErr.message}`);
                  }
                }
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
      await this.channelWrapper.sendToQueue(this.queueName, payload);
    } catch (err) {
      this.logger.error(`[UserRabbitMQ] Error publishing: ${err.message}`);
      if (retries > 0) {
        this.logger.log(`[UserRabbitMQ] Retrying publish for ${pattern}... (${retries} attempts left)`);
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

  private async handleMessage(pattern: string, data: any) {
    const baseUrl = 'https://omni.justtawk.com/api';
    
    // 1. Fetch User and Parent Tenant
    const user = await this.userModel.findOne({ uuid: data.uuid });
    if (!user && pattern !== 'user.deleted') {
      this.logger.warn(`[Sync] Agent ${data.uuid} not found, skipping sync`);
      return;
    }

    const tenantUuid = user?.tenant_uuid || data.tenant_uuid;
    if (!tenantUuid) {
      this.logger.warn(`[Sync] No tenant_uuid for agent ${data.uuid}, skipping`);
      return;
    }

    const tenant = await this.tenantModel.findOne({ uuid: tenantUuid });
    if (!tenant || !tenant.vendor_uid || !tenant.vendor_token) {
      this.logger.warn(`[Sync] Tenant not synced or credentials missing for agent ${data.uuid}`);
      return;
    }

    const headers = { 
        'Authorization': `Bearer ${tenant.vendor_token}`,
        'Content-Type': 'application/json'
    };

    if (pattern === 'user.created') {
      const nameParts = (user.fullname || 'Agent').split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'User';
      const rawPassword = await this.commonFn.decode(user.password as string);

      const payload = {
        email: user.email,
        password: rawPassword,
        username: user.username,
        first_name: firstName,
        last_name: lastName,
        mobile_number: (user as any)?.mobile_number || data.mobile_number || '919876543210',
        permissions: ["messaging", "manage_contacts", "assigned_chats_only"]
      };

      this.logger.log(`[Sync] Creating Agent on JustTawk...`, { email: user.email });
      try {
          // Always store the parent's vendor_uid in the user record
          await this.userModel.updateOne({ uuid: user.uuid }, { vendor_uid: tenant.vendor_uid });

          const res = await axios.post(`${baseUrl}/${tenant.vendor_uid}/team-users`, payload, { headers });
          
          if (res.data?.result === 'success') {
              // Fetch the specific team_user_uid from the list
              const teamUserUid = await this.fetchTeamUserUid(tenant.vendor_uid as string, tenant.vendor_token as string, user.email as string);
              if (teamUserUid) {
                  await this.userModel.updateOne({ uuid: user.uuid }, { team_user_uid: teamUserUid });
                  this.logger.log(`[Sync] Agent created, vendor_uid and team_user_uid saved`, { teamUserUid });
              }
          } else {
              this.logger.error(`[Sync] JustTawk Agent Creation Failed`, { 
                  result: res.data?.result, 
                  message: res.data?.message,
                  data: res.data?.data
              });
          }
      } catch (err) {
          const errMsg = err.response?.data?.message || err.message;
          const errData = err.response?.data;
          this.logger.error(`[Sync] JustTawk Agent Creation Error`, { 
              status: err.response?.status,
              error: errMsg,
              details: errData
          });
          throw err;
      }
    }

    if (pattern === 'user.updated') {
      const teamUserUid = (user as any).team_user_uid || data.team_user_uid;
      if (!teamUserUid) {
          this.logger.warn(`[Sync] No team_user_uid found for agent update`);
          return;
      }

      const nameParts = (user.fullname || data.fullname || 'Agent').split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || 'User';

      const payload: any = {
        email: user.email || data.email,
        username: user.username || data.username,
        first_name: firstName,
        last_name: lastName,
        mobile_number: (user as any)?.mobile_number || data.mobile_number || '919876543210',
        is_active: data.status !== undefined ? data.status === '0' : (user.status === '0'),
        permissions: ["messaging", "manage_contacts", "assigned_chats_only"]
      };

      if (data.password) {
          payload.password = await this.commonFn.decode(data.password);
      }

      this.logger.log(`[Sync] Updating Agent on JustTawk...`, { team_user_uid: teamUserUid });
      try {
          await axios.put(`${baseUrl}/${tenant.vendor_uid}/team-users/${teamUserUid}`, payload, { headers });

          if (data.status !== undefined) {
              await axios.post(`${baseUrl}/${tenant.vendor_uid}/team-users/${teamUserUid}/status`, {
                  is_active: data.status === '0'
              }, { headers });
          }
      } catch (err) {
          const errMsg = err.response?.data?.message || err.message;
          this.logger.error(`[Sync] JustTawk Agent Update Error`, { 
              status: err.response?.status,
              error: errMsg,
              details: err.response?.data
          });
          throw err;
      }
    }

    if (pattern === 'user.deleted') {
      const teamUserUid = data.team_user_uid || (user as any)?.team_user_uid;
      this.logger.log(`[Sync] Delete Data`, { data, teamUserUid });
      if (!teamUserUid) return;

      this.logger.log(`[Sync] Deleting Agent on JustTawk...`, { team_user_uid: teamUserUid });
      try {
          await axios.delete(`${baseUrl}/${tenant.vendor_uid}/team-users/${teamUserUid}`, { headers });
      } catch (err) {
          const errMsg = err.response?.data?.message || err.message;
          this.logger.error(`[Sync] JustTawk Agent Deletion Error`, { 
              status: err.response?.status,
              error: errMsg,
              details: err.response?.data
          });
          throw err;
      }
    }
  }

  private async fetchTeamUserUid(vendorUid: string, token: string, email: string, maxRetries = 3): Promise<string | null> {
    let delay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await axios.get(`https://omni.justtawk.com/api/${vendorUid}/team-users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.data?.result === 'success') {
                const users = res.data?.data?.team_users || [];
                const found = users.find(u => u.email === email);
                
                if (found?.team_user_uid) {
                    return found.team_user_uid;
                }
                this.logger.warn(`[Sync] Team user ${email} not found (Attempt ${attempt}/${maxRetries})`);
            } else {
                this.logger.error(`[Sync] Failed to fetch team users from JustTawk`, { 
                    message: res.data?.message 
                });
            }
        } catch (err) {
            this.logger.error(`[Sync] Error fetching team user list`, { 
                error: err.message,
                details: err.response?.data
            });
        }

        if (attempt < maxRetries) {
            this.logger.log(`[Sync] Retrying fetch for ${email} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
    return null;
  }
}
