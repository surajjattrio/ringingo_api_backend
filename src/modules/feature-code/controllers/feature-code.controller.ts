import { Body, Controller, Get, Param, ParseUUIDPipe, Put, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { UpdateFeatureCodeDto } from "../dto/update-feature-code.dto";
import { FeatureCodeService } from "../services/feature-code.service";

@Controller("feature-code")

/*@Usage : To provide title of API in swagger */
@ApiTags("Feature Code")

export class FeatureCodeController {

    /*
    @Usage  : To load feature_code service and other libraries
    @return : Object[feature_code] 
    */

    constructor(
        private readonly feature_code: FeatureCodeService
    ) { }

    @Get()
    @getDecoraters("Retrieved all feature codes successfully", "List all feature codes")

    /*
    @Usage  : List all feature codes
    @Method : GET
    @return : Array of an object with total count of feature code with data
    */

    findAll(@Query() queryParam) {
        return this.feature_code.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single feature code successfully", "List single feature code using uuid")

    /*
    @Usage               : List single feature code using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid feature code
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.feature_code.findOne(id);
    }
    
    @Put(':uuid')
    @putDecoraters("Feature code update successfully", "Update single feature code using uuid")

    /*
    @Usage                          : Update single feature code using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param description              : string
    @Param feature_code             : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Feature code updated successfully / Feature code already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() updateFeatureCodeDto: UpdateFeatureCodeDto) {
        return this.feature_code.update(id, updateFeatureCodeDto);
    }
}