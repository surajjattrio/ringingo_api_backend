import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateCountryDto } from "../dto/create-country.dto";
import { CountryService } from "../services/country.service";

@Controller("country")

/*@Usage : To provide title of API in swagger */
@ApiTags("Country")
export class CountryController {

    constructor(private readonly countries: CountryService) { }

    @Post()
    @postDecoraters("Country created successfully", "Create a new country")

    /*
    @Usage              : To create new country
    @Method             : POST
    @Param country      : string
    @Param nicename     : string
    @Param iso          : string
    @Param iso3         : string
    @Param countrycode  : integer [Default 0]
    @Param vat          : integer [Default 0]
    @Param latitude     : integer [Default 0]
    @Param longitude    : string 
    @Param capital      : string 
    @return success / error object  : { Country created successfully / Country already exist}
    */

    create(@Body() createCountryDto: CreateCountryDto) {
        return this.countries.create(createCountryDto);
    }

    @Get()
    @getDecoraters("Retrieved all countries successfully", "List all countries")

    /*
    @Usage  : List all countries
    @Method : GET
    @return : Array of an object with total count of countries with data
    */
   
    findAll(@Query() queryParam) {
        return this.countries.findAll(queryParam);
    }
    
    @Get(':uuid')
    @getDecoraters("Retrieved single country successfully", "List single country using uuid")

    /*
    @Usage         : List single country using uuid
    @Method        : GET
    @Param  uuid   : string
    @return object : Full detail of particular uuid country
    */

    findOne(@Param('uuid' , new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.countries.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("Country update successfully", "Update single country using uuid")

    /*
    @Usage              : Update single country using uuid
    @Method             : PUT
    @Param country      : string
    @Param nicename     : string
    @Param iso          : string
    @Param iso3         : string
    @Param countrycode  : integer [Default 0]
    @Param vat          : integer [Default 0]
    @Param latitude     : integer [Default 0]
    @Param longitude    : string 
    @Param capital      : string 
    @return success / error object  : { Country updated successfully / Country already exist}
    */

    update(@Param('uuid' , new ParseUUIDPipe({ version: '4' })) id: string, @Body() createCountryDto: CreateCountryDto) {
        return this.countries.update(id, createCountryDto);
    }

    @Patch(':uuid')
    @putDecoraters("Country status update successfully", "Update single country status using uuid")

    /*
    @Usage               : Update single timezone using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Country status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.countries.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Country deleted successfully", "Delete single country using uuid")

    /*
    @Usage       : Delete single country using uuid
    @Method      : DELETE
    @Param  uuid : string
    @return success / error object  : { Country deleted successfully / Country Not found}
    */

    remove(@Param('uuid') id: string) {
        return this.countries.remove(id);
    }
    
    @Post("advanced-search")
    @postDecoraters("Country created successfully", "Create a new country")

     /*
    @Usage              : To search countries
    @Method             : POST
    @Param country      : string
    @Param nicename     : string
    @Param iso          : string
    @Param iso3         : string
    @Param countrycode  : integer [Default 0]
    @Param vat          : integer [Default 0]
    @Param latitude     : integer [Default 0]
    @Param longitude    : string 
    @Param capital      : string 
    @return Object      : Array of an object with total count of countries with data
    */

    advancedSearch(@Body() searchData) {
        return this.countries.advancedSearch(searchData);
    }
}
