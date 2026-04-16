import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminIpMappingSchema, adminipMappingSchema } from './schema/admin-ip-mapping.schema';
import { AdminIpMappingController } from './controllers/admin-ip-mapping.controller';
import { AdminIpMappingService } from './services/admin-ip-mapping.service';

@Module({
    imports:[MongooseModule.forFeature([{ name : AdminIpMappingSchema.name , schema : adminipMappingSchema }])],
    controllers:[AdminIpMappingController],
    providers:[AdminIpMappingService]
})
export class AdminIpMappingModule {}
