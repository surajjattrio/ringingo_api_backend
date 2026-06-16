import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailConfigurationController } from './controllers/mail-configuration.controller';
import { mailConfigurationSchema, MailConfigurationSchema } from './schema/mail-configuration.schema';
import { MailConfigurationService } from './services/mail-configuration.service';
import { EmailTemplateModule } from '../email-template/email-template.module';
import { ApiConfiguration, ApiConfigurationSchema } from '../api-configuration/schema/api-configuration.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: MailConfigurationSchema.name, schema: mailConfigurationSchema }, { name: ApiConfiguration.name, schema: ApiConfigurationSchema }]), EmailTemplateModule],
    controllers: [MailConfigurationController],
    providers: [MailConfigurationService],
    exports: [MongooseModule]
})
export class MailConfigurationModule { }
