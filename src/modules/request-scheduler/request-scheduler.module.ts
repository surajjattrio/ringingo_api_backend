import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  RequestSchedulerSchema,
  requestSchedulerSchema,
} from "./schema/request-scheduler.schema";
import { RequestSchedulerService } from "./services/request-scheduler.service";

// ✅ IMPORT CDRS SCHEMA ALSO
import { CdrsSchema, cdrsSchema } from "src/modules/cdrs/schema/cdrs.schema";
import { RequestSchedulerController } from "./controller/request-scheduler.controller";
import { leadManagementSchema, LeadManagementSchema } from "../lead-management/schema/lead-management.schema";
import { dispositionSchema, DispositionSchema } from '../disposition/schema/disposition.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RequestSchedulerSchema.name, schema: requestSchedulerSchema },

      // ✅ ADD THIS LINE
      { name: CdrsSchema.name, schema: cdrsSchema },
      { name: LeadManagementSchema.name, schema: leadManagementSchema },
      { name: DispositionSchema.name, schema: dispositionSchema },
    ]),
  ],
  controllers: [RequestSchedulerController],
  providers: [RequestSchedulerService],

  // ✅ export service so CronModule can use it
  exports: [RequestSchedulerService],
})
export class RequestSchedulerModule { }
