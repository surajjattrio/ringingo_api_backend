import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PresetSchema, presetSchema } from './schema/preset.schema';
import { PresetController } from './controllers/preset.controller';
import { PresetService } from './services/preset.service';

@Module( {
     imports: [ MongooseModule.forFeature( [ { name: PresetSchema.name, schema: presetSchema } ] ) ],
     controllers: [ PresetController ],
     providers: [ PresetService ],
     exports: [ MongooseModule ]
} )
export class PresetModule { }

