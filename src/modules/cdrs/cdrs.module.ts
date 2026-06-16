import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CdrsController } from './controllers/cdrs.controller';
import { cdrsSchema, CdrsSchema } from './schema/cdrs.schema';
import { CdrsService } from './services/cdrs.service';
import { ivrSchema, IvrSchema } from '../ivr/schema/ivr.schema';
import { ringgroupSchema, RinggroupSchema } from '../ringgroup/schema/ringgroup.schema';
import { callQueueSchema, CallQueueSchema } from '../call-queue/schema/call-queue.schema';
import { TenantDocument, tenantSchema, TenantSchema } from "src/modules/tenant/schema/tenant.schema";
import { cdrsArchiveSchema, CdrsArchiveSchema } from './schema/cdrs-archive.schema';  
import { CdrsArchiveService } from './services/cdrs-archive.service';  
import { CDRSArchieveSearchService } from './services/cdrs-archive-search.service'; 
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';
import {UserSchema,userSchema} from "src/modules/user/schema/user.schema"

@Module({
    imports: [MongooseModule.forFeature([{ name: CdrsSchema.name, schema: cdrsSchema },
    { name: IvrSchema.name, schema: ivrSchema },
    { name: RinggroupSchema.name, schema: ringgroupSchema },
    { name: CallQueueSchema.name, schema: callQueueSchema },
    { name: TenantSchema.name, schema: tenantSchema },
    { name: DispositionSchema.name, schema: dispositionSchema },
	{ name: CdrsArchiveSchema.name, schema: cdrsArchiveSchema },    
	{ name: UserSchema.name, schema:userSchema },    
    ])],
    controllers: [CdrsController],
    providers: [CdrsService, CdrsArchiveService, CDRSArchieveSearchService],
    exports: [MongooseModule,CdrsService]
})

export class CdrsModule { }
