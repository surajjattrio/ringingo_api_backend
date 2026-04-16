import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PbxLeadStatusSchema, pbxLeadStatusSchema } from './schema/pbx-lead-status.schema';
import { PbxLeadStatusController } from './controllers/pbx-lead-status.controller';
import { PbxLeadStatusService } from './services/pbx-lead-status.service';

@Module({
    imports: [MongooseModule.forFeature([
        { name: PbxLeadStatusSchema.name, schema: pbxLeadStatusSchema }
    ])],
    controllers: [PbxLeadStatusController],
    providers: [PbxLeadStatusService],
    exports: [MongooseModule]
})
export class PbxLeadStatusModule { }
