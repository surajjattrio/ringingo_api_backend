import { Injectable, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as amqp from 'amqp-connection-manager';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { WinstonModule } from 'nest-winston';
import { winstonLoggerConfig } from 'src/logger/winston-logger.config';
import { LeadResetJobSchema, LeadResetJobDocument } from './lead-reset-job.schema';

// Bounds how long a publish waits for the broker's confirm before we give up
// and surface a 503 to the caller instead of hanging the request.
const PUBLISH_CONFIRM_TIMEOUT_MS = 5000;

@Injectable()
export class LeadResetProducerService implements OnModuleInit {
  private readonly logger = WinstonModule.createLogger(winstonLoggerConfig);
  private connection: AmqpConnectionManager;
  private channelWrapper: ChannelWrapper;
  private readonly queueName: string;
  private readonly dlqName: string;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(LeadResetJobSchema.name) private readonly leadResetJobModel: Model<LeadResetJobDocument>,
  ) {
    // Same convention as TenantRabbitmqService/UserRabbitmqService:
    // <base>_<INSTANCE_ID> for the queue, <queueName>_dlq for its DLQ.
    // Base name is fixed — only INSTANCE_ID is environment-driven.
    const instanceId = this.config.get<string>('INSTANCE_ID');
    this.queueName = `lead_reset_${instanceId}`;
    this.dlqName = `${this.queueName}_dlq`;
  }

  async onModuleInit() {
    this.setupConnection();
  }

  private setupConnection() {
    const rmqUrl = (this.config.get<string>('RABBITMQ_URL') || '').replace(/^\"|\"$/g, '');

    if (!rmqUrl) {
      this.logger.error('[LeadResetProducer] RABBITMQ_URL not found in environment variables.');
      return;
    }

    this.connection = amqp.connect([rmqUrl], { heartbeatIntervalInSeconds: 10 });

    this.connection.on('connect', () => this.logger.log('[LeadResetProducer] Connected successfully'));
    this.connection.on('disconnect', (err) => {
      const message = err?.err?.message || 'Unknown disconnection error';
      this.logger.error(`[LeadResetProducer] Disconnected: ${message}`);
    });
    this.connection.on('connectFailed', (err) => {
      const message = err?.err?.message || 'Connection failed';
      this.logger.error(`[LeadResetProducer] Connection failed: ${message}`);
    });
    this.connection.on('error', (err) => {
      const message = err?.message || 'Connection internal error';
      this.logger.error(`[LeadResetProducer] Internal Error: ${message}`);
    });

    // amqp-connection-manager creates a ConfirmChannel by default, so
    // sendToQueue()'s promise only resolves once the broker has confirmed
    // the message — this IS the publisher-confirm guarantee we need.
    this.channelWrapper = this.connection.createChannel({
      json: true,
      publishTimeout: PUBLISH_CONFIRM_TIMEOUT_MS,
      setup: async (channel) => {
        this.logger.log(`[LeadResetProducer] Initializing queues: ${this.queueName} and ${this.dlqName}`);

        await channel.assertQueue(this.dlqName, { durable: true });
        await channel.assertQueue(this.queueName, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': this.dlqName,
          },
        });
      },
    });
  }

  /**
   * Resolves only once the broker has confirmed the publish; rejects
   * (bounded by publishTimeout) otherwise. Callers must treat a rejection as
   * "not queued" and must not report success to their own caller.
   */
  async publish(payload: Record<string, any>): Promise<void> {
    if (!this.channelWrapper) {
      throw new ServiceUnavailableException('Lead reset queue is not available');
    }

    try {
      await this.channelWrapper.sendToQueue(this.queueName, payload);
    } catch (err) {
      this.logger.error(`[LeadResetProducer] Publish confirm failed: ${err.message}`);
      throw new ServiceUnavailableException('Failed to queue lead reset job');
    }
  }

  /**
   * Records a "pending" lead_reset_jobs doc (so the frontend can poll for
   * status via job_uuid) and publishes the job. If the publish confirm fails,
   * the doc is deleted before rethrowing — the caller never receives a
   * job_uuid in that case, so there'd be nothing to poll it with anyway.
   */
  async publishJob(jobUuid: string, resetLeadDto: Record<string, any>): Promise<void> {
    await this.leadResetJobModel.create({
      job_uuid: jobUuid,
      lead_group_uuid: resetLeadDto.lead_group_uuid,
      campaign_uuid: resetLeadDto.campaign_uuid,
      tenant_uuid: resetLeadDto.tenant_uuid,
      status: 'pending',
    });

    try {
      await this.publish({ job_uuid: jobUuid, ...resetLeadDto });
    } catch (err) {
      await this.leadResetJobModel.deleteOne({ job_uuid: jobUuid }).exec().catch(() => {});
      throw err;
    }
  }

  checkHealth() {
    if (!this.connection) {
      return { status: 'down', message: 'Connection object not initialized' };
    }
    const isConnected = this.connection.isConnected();
    return {
      status: isConnected ? 'up' : 'down',
      message: isConnected ? 'RabbitMQ is connected' : 'RabbitMQ is disconnected',
    };
  }
}
