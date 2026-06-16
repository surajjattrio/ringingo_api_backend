import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApiConfigurationService } from './services/api-configuration.service';
import { ApiConfigurationController } from './controllers/api-configuration.controller';
import { ApiConfiguration, ApiConfigurationSchema } from './schema/api-configuration.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ApiConfiguration.name, schema: ApiConfigurationSchema }]),
    CommonModule
  ],
  controllers: [ApiConfigurationController],
  providers: [ApiConfigurationService],
  exports: [ApiConfigurationService],
})
export class ApiConfigurationModule { }
