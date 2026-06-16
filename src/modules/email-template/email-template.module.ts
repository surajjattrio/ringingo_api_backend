import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmailTemplateController } from './controllers/email-template.controller';
import { emailTemplateSchema, EmailTemplateSchema } from './schema/email-template.schema';
import { EmailTemplateService } from './services/email-template.service';

@Global()
@Module({
    imports: [MongooseModule.forFeature([{ name: EmailTemplateSchema.name, schema: emailTemplateSchema }])],
    controllers: [EmailTemplateController],
    providers: [EmailTemplateService],
    exports: [EmailTemplateService, MongooseModule]
})
export class EmailTemplateModule { }
