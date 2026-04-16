import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MailConfigurationController } from './controllers/mail-configuration.controller';
import { mailConfigurationSchema, MailConfigurationSchema } from './schema/mail-configuration.schema';
import { MailConfigurationService } from './services/mail-configuration.service';

@Module({
    imports:[MongooseModule.forFeature([ { name : MailConfigurationSchema.name  , schema : mailConfigurationSchema} ])],
    controllers:[MailConfigurationController],
    providers:[MailConfigurationService],
    exports : [MongooseModule]
})
export class MailConfigurationModule {}
