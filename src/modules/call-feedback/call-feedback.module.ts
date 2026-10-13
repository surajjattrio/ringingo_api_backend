import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { CallFeedbackSchema, callFeedbackSchema } from "./schema/call-feedback.schema";
import { CallFeedbackLogSchema, callFeedbackLogSchema } from "./schema/call-feedback-log.schema";
import { CallFeedbackLoggingService } from "./services/call-feedback-logging.service";
import { CallFeedbackService } from "./services/call-feedback.service";
import { CallFeedbackController } from "./controllers/call-feedback.controller";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CallFeedbackSchema.name, schema: callFeedbackSchema },
            { name: CallFeedbackLogSchema.name, schema: callFeedbackLogSchema },
        ]),
    ],
    controllers: [CallFeedbackController],
    providers: [CallFeedbackLoggingService, CallFeedbackService],
    exports: [MongooseModule, CallFeedbackLoggingService, CallFeedbackService]
})
export class CallFeedbackModule { }
