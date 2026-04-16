import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesController } from './controllers/roles.controller';
import { rolesSchema, RolesSchema } from './schema/roles-schema';
import { RolesService } from './services/roles.service';

@Module({
    imports: [MongooseModule.forFeature([{ name: RolesSchema.name, schema: rolesSchema }])],
    controllers: [RolesController],
    providers: [RolesService]
})
export class RolesModule {}
