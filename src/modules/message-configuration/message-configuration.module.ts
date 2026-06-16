import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageConfigurationController } from './controllers/message-configuration.controller';
import { MessageConfigurationService } from './services/message-configuration.service';
import { MessageConfiguration, MessageConfigurationSchema } from './schema/message-configuration.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageConfiguration.name, schema: MessageConfigurationSchema },
    ]),
    CommonModule,
  ],
  controllers: [MessageConfigurationController],
  providers: [MessageConfigurationService],
  exports: [MessageConfigurationService],
})
export class MessageConfigurationModule {}
