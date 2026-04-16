import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RinggroupController } from './controllers/ringgroup.controller';
import { ringgroupSchema, RinggroupSchema } from './schema/ringgroup.schema';
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';
import { RinggroupService } from './services/ringgroup.service';

@Module({
    imports : [MongooseModule.forFeature([ { name : RinggroupSchema.name , schema : ringgroupSchema },{ name: ManagerSchema.name, schema: managerSchema },  ])],
    controllers:[RinggroupController],
    providers:[RinggroupService],

})
export class RinggroupModule {}
