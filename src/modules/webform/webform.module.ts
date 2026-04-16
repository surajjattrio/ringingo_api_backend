import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebformSchema, webformSchema } from './schema/webform.schema';
import { WebformController } from './controllers/webform.controller';
import { WebformService } from './services/webform.service';
import { LeadManagementSchema, leadManagementSchema } from '../lead-management/schema/lead-management.schema';

@Module({
    imports:[MongooseModule.forFeature([ { name : WebformSchema.name , schema : webformSchema } , { name : LeadManagementSchema.name , schema : leadManagementSchema } ])],
    controllers : [WebformController],
    providers:[WebformService],
    exports: [MongooseModule]
})
export class WebformModule {}
