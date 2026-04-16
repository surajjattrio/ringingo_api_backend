import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureCodeController } from './controllers/feature-code.controller';
import { featureCodeSchema, FeatureCodeSchema } from './schema/feature-code.schema';
import { FeatureCodeService } from './services/feature-code.service';

@Module({
    imports:[MongooseModule.forFeature([{ name : FeatureCodeSchema.name , schema : featureCodeSchema }])],
    controllers:[FeatureCodeController],
    providers:[FeatureCodeService],
    exports:[MongooseModule]
})
export class FeatureCodeModule {}
