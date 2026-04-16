import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { OmniChannelReportController } from "./controllers/omni-channel-report.controller";
import { OmniChannelReportService } from "./services/omni-channel-report.service";
import {
  OmniChannelReportSchema,
  omniChannelReportSchema,
} from "./schema/omni-channel-report.schema";
import { omnichannelmessageSchema, OmnichannelmessageSchema } from "../omnichannel-message/schema/omnichannelmessage.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: OmniChannelReportSchema.name,
        schema: omniChannelReportSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: OmnichannelmessageSchema.name,
        schema: omnichannelmessageSchema,
      },
    ]),
  ],
  controllers: [OmniChannelReportController],
  providers: [OmniChannelReportService],
  exports: [OmniChannelReportService],
})
export class OmniChannelReportModule {}
