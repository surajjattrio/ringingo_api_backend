import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CustomFieldsController } from './controllers/custom-field-controller';
import { CustomFieldsService } from './services/custom-field-service';
import { CustomFieldSchema, customfieldschema } from './schema/custom-field-schema';
import { LeadGroupModule } from '../lead-group/lead-group.module';

@Module( {
     imports: [ MongooseModule.forFeature( [ { name: CustomFieldSchema.name, schema: customfieldschema }, ] ),LeadGroupModule  ],
     controllers: [ CustomFieldsController ],
     providers: [ CustomFieldsService ]
} )
export class CustomFieldsModule { }
