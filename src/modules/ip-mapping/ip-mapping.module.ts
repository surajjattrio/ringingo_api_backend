import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IpMappingSchema, ipMappingSchema } from './schema/ip-mapping.schema';
import { IpMappingController } from './controllers/ip-mapping.controller';
import { IpMappingService } from './services/ip-mapping.service';

@Module({
    imports:[MongooseModule.forFeature([{ name : IpMappingSchema.name , schema : ipMappingSchema }])],
    controllers:[IpMappingController],
    providers:[IpMappingService]
})
export class IpMappingModule {}
