import { Global, Module } from "@nestjs/common";
import { CommonDBFunctions } from "./common_db_functions";
import { CommonFunctions } from "./common_functions";
import { MailService } from "./mail-service";
import { PushNotification } from "./services/push-notification";
import { MongooseModule } from "@nestjs/mongoose";
import { ManagerRoleSchema, managerRoleSchema } from "../manager-role/schema/manager-role.schema";
import { ManagerSchema, managerSchema } from "../manager/schema/manager.schema";

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ManagerRoleSchema.name, schema: managerRoleSchema },
	    { name: ManagerSchema.name, schema: managerSchema },
        ])
    ],
    exports : [CommonDBFunctions,CommonFunctions,MailService,PushNotification],
    providers : [CommonDBFunctions,CommonFunctions,MailService,PushNotification]
})

export class CommonModule{}
