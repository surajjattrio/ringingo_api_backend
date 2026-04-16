import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { GreetingController } from "./controllers/greeting.controller";
import { greetingSchema, GreetingSchema } from "./schema/greeting.schema";
import { GreetingService } from "./services/greeting.service";
import { managerSchema, ManagerSchema } from '../manager/schema/manager.schema';


@Module({
    imports: [MongooseModule.forFeature([
        { name: GreetingSchema.name, schema: greetingSchema },
        { name: ManagerSchema.name, schema: managerSchema },
    ])],
    controllers: [GreetingController],
    providers: [GreetingService],
    exports: [GreetingService], // ✅ IMPORTANT
})

export class GreetingModule {

}