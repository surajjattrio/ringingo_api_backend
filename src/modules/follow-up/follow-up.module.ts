import { Module } from '@nestjs/common';
import { FollowUpController } from './controllers/follow-up.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FollowUpSchema, followUpSchema } from './schema/follow-up.schema';
import { FollowUpService } from './services/follow-up.service';
import { ArchiveFollowUpSchema, archiveFollowUpSchema } from './schema/archive-follow-up.schema';
import { TenantSchema, tenantSchema } from '../tenant/schema/tenant.schema';
import { TimezoneSchema, timezoneSchema } from '../timezone/schema/timezone.schema';

@Module({
    imports : [
        MongooseModule.forFeature([
            { name : FollowUpSchema.name , schema : followUpSchema },
	    { name : ArchiveFollowUpSchema.name , schema : archiveFollowUpSchema },
        { name: TenantSchema.name, schema: tenantSchema },
        { name: TimezoneSchema.name, schema: timezoneSchema },

        ])
    ],
    controllers : [FollowUpController],
    providers: [FollowUpService]
})
export class FollowUpModule {}
