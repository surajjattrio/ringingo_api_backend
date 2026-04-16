import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CountryController } from './controllers/country.controller';
import { countrySchema, CountrySchema } from './schema/country.schema';
import { CountryService } from './services/country.service';

@Module({
    imports:[MongooseModule.forFeature([{ name : CountrySchema.name , schema : countrySchema }])],
    controllers : [CountryController],
    providers : [CountryService]
})
export class CountryModule {}
