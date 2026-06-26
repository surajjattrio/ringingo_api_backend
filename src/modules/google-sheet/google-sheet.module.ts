import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GoogleSheetController } from './controllers/google-sheet.controller';
import { GoogleSheetService } from './services/google-sheet.service';
import { SampannGoogleSheetService } from './services/google-sheet-sampan_new.service';
// import { GoogleSheetProducer } from './services/google-sheet.producer';
// import { GoogleSheetConsumer } from './services/google-sheet.consumer';
// import { GoogleSheetHealthService } from './services/google-sheet.health';
import { GoogleSheetCron } from './services/google-sheet.cron';
import { MongooseModule } from '@nestjs/mongoose';
import { GoogleSheetSchema, GoogleSheet } from 'src/modules/google-sheet/schema/google-sheet.schema';
import { GoogleSheetLead, GoogleSheetLeadSchema } from 'src/modules/google-sheet/schema/google-sheet-leads.schema';
import { GoogleSheetConfigSchema, GoogleSheetConfig } from './schema/google-sheet-config.schema';
import { LeadsInQueueDocument, LeadsInQueueSchema, leadsInQueueSchema } from 'src/modules/lead-management/schema/leads-in-queue.schema';
import { GoogleCredential, GoogleCredentialSchema } from './schema/google-credential.schema';
import { GoogleSheetTab, GoogleSheetTabSchema } from './schema/google-sheet-tab.schema';
import { LeadManagementModule } from 'src/modules/lead-management/lead-management.module';
import { LeadGroupModule } from '../lead-group/lead-group.module';
import { OutboundCampaignModule } from 'src/modules/campaigns/outbound-campaign/outbound-campaign.module';
import { BlendedCampaignModule } from '../campaigns/blended-campaign/blended-campaign.module';

@Module({
    imports: [
        ClientsModule.registerAsync([
            {
                name: 'GOOGLE_SHEET_QUEUE',
                imports: [ConfigModule],
                useFactory: async (config: ConfigService) => {
                    const raw = config.get<string>('RABBITMQ_URL');
                    const url = raw?.replace(/^\"|\"$/g, '');
                    if (!url) {
                        console.warn('GoogleSheetModule: RABBITMQ_URL is not set via config');
                    }
                    return {
                        transport: Transport.RMQ,
                        options: {
                            urls: url ? [url] : [],
                            queue: 'ringingo_auric_google_sheet_queue',
                            queueOptions: { durable: true },
                        },
                    } as any;
                },
                inject: [ConfigService],
            },
        ]),
        MongooseModule.forFeature([
            { name: GoogleSheet.name, schema: GoogleSheetSchema },
            { name: GoogleSheetConfig.name, schema: GoogleSheetConfigSchema },
            { name: GoogleCredential.name, schema: GoogleCredentialSchema },
            { name: GoogleSheetTab.name, schema: GoogleSheetTabSchema },
            { name: GoogleSheetLead.name, schema: GoogleSheetLeadSchema },
            { name: LeadsInQueueSchema.name, schema: leadsInQueueSchema },
        ]),
        LeadManagementModule,
        LeadGroupModule,
        OutboundCampaignModule,
        BlendedCampaignModule
    ],
    controllers: [GoogleSheetController],
    providers: [
        GoogleSheetCron,
        GoogleSheetService,
        SampannGoogleSheetService,
        // GoogleSheetConsumer,
        // GoogleSheetProducer,
        // Health provider to verify RabbitMQ connectivity
        // GoogleSheetHealthService,
    ],
})
export class GoogleSheetModule { }
