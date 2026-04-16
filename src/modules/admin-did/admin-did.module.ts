import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminDidController } from './controllers/admin-did.controller';
import { admindidSchema, AdminDidSchema } from './schema/admin-did.schema';
import { AdminDidService } from './services/admin-did.service';
import { DidSchema , didSchema } from "src/modules/did/schema/did.schema";

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AdminDidSchema.name, schema: admindidSchema },
            { name: DidSchema.name, schema: didSchema }
            ])
        ],
    controllers: [AdminDidController],
    providers: [AdminDidService]
})
export class AdminDidModule {

}


