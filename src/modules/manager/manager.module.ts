import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ManagerSchema, managerSchema } from './schema/manager.schema';
import { ManagerController } from './controllers/manager.controller';
import { ManagerService } from './services/manager.service';


@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ManagerSchema.name, schema: managerSchema }
        ])
    ],
    controllers: [ManagerController],
    providers: [ManagerService],
})
export class ManagerModule { }

