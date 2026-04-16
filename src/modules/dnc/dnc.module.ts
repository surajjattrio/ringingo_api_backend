import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DncSchema, dncSchema } from './schema/dnc.schema';
import { DncController } from './controllers/dnc.controller';
import { DncService } from './services/dnc.service';
import { LeadManagementSchema, leadManagementSchema } from '../lead-management/schema/lead-management.schema';

@Module({
    imports:[MongooseModule.forFeature([ { name : DncSchema.name , schema : dncSchema } , { name : LeadManagementSchema.name , schema : leadManagementSchema } ])],
    controllers : [DncController],
    providers:[DncService],
    exports: [MongooseModule]
})
export class DncModule {}
