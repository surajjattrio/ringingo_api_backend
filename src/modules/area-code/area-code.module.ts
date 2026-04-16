import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AreaCodeController } from './controllers/area-code.controller';
import { areaCodeSchema, AreaCodeSchema } from './schema/area-code.schema';
import { AreaCodeService } from './services/area-code.service';
import { stateSchema, StateSchema } from '../state/schema/state.schema';

@Module({
    imports: [MongooseModule.forFeature([{ name: AreaCodeSchema.name, schema: areaCodeSchema }, { name: StateSchema.name, schema: stateSchema },])],
    controllers: [AreaCodeController],
    providers: [AreaCodeService],
    exports: [MongooseModule]
})
export class AreaCodeModule { }
