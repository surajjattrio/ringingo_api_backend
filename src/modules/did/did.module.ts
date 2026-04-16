import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DidController } from './controllers/did.controller';
import { didSchema, DidSchema } from './schema/did.schema';
import { DidService } from './services/did.service';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';

@Module({
    imports : [MongooseModule.forFeature([ { name : DidSchema.name , schema : didSchema },{ name: ManagerSchema.name, schema: managerSchema }, ])],
    controllers:[DidController],
    providers:[DidService],
    exports: [MongooseModule]

})
export class DidModule {}
