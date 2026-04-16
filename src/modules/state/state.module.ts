import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StateController } from './controllers/state.controller';
import { stateSchema, StateSchema } from './schema/state.schema';
import { StateService } from './services/state.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: StateSchema.name, schema: stateSchema }])],
    controllers: [StateController],
    providers: [StateService]
})
export class StateModule { }
