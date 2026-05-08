import { Module } from '@nestjs/common';
import { HttpModule } from "@nestjs/axios";
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookController } from './controllers/webhook.controller';
import { cdrsSchema, CdrsSchema } from '../cdrs/schema/cdrs.schema';
import { CdrsService } from '../cdrs/services/cdrs.service';
import { ivrSchema, IvrSchema } from '../ivr/schema/ivr.schema';
import { ringgroupSchema, RinggroupSchema } from '../ringgroup/schema/ringgroup.schema';
import { callQueueSchema, CallQueueSchema } from '../call-queue/schema/call-queue.schema';
import { tenantSchema, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { cdrsArchiveSchema, CdrsArchiveSchema } from '../cdrs/schema/cdrs-archive.schema';
import { CdrsArchiveService } from '../cdrs/services/cdrs-archive.service';
import { CDRSArchieveSearchService } from '../cdrs/services/cdrs-archive-search.service';
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import { UserSchema, userSchema } from "src/modules/user/schema/user.schema"
import { WebhookService } from './services/webhook.service';
import { WebhookCron } from './services/webhook.cron';
import { Webhook, WebhookSchema } from './schema/webhook.schema';
import { WebhookConfig, WebhookConfigSchema } from './schema/webhook-config.schema';
import { WebhookDeliveryLog, WebhookDeliveryLogSchema } from './schema/webhook-delivery-log.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Webhook.name, schema: WebhookSchema },
            { name: WebhookConfig.name, schema: WebhookConfigSchema },
            { name: WebhookDeliveryLog.name, schema: WebhookDeliveryLogSchema },
            { name: CdrsSchema.name, schema: cdrsSchema },
            { name: IvrSchema.name, schema: ivrSchema },
            { name: RinggroupSchema.name, schema: ringgroupSchema },
            { name: CallQueueSchema.name, schema: callQueueSchema },
            { name: TenantSchema.name, schema: tenantSchema },
            { name: DispositionSchema.name, schema: dispositionSchema },
            { name: CdrsArchiveSchema.name, schema: cdrsArchiveSchema },
            { name: UserSchema.name, schema: userSchema },
        ]),
        HttpModule],
    controllers: [WebhookController],
    providers: [WebhookService, WebhookCron, CdrsService, CdrsArchiveService, CDRSArchieveSearchService],
    exports: [MongooseModule, WebhookService]
})

export class WebhookModule { }
