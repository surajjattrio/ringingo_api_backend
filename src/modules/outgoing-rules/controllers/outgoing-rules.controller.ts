import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateOutgoingRulesDto } from "../dto/create-outgoing-rules.dto";
import { OutgoingRulesService } from "../services/outgoing-rules.service";

@Controller("outgoing-rules")

/*@Usage : To provide title of API in swagger */
@ApiTags('Outgoing rule')

export class OutgoingRulesController {

    /*
    @Usage  : To load outgoing service and other libraries
    @return : Object[outgoing_rules] 
    */

    constructor(private readonly outgoing_rules: OutgoingRulesService) { }

    @Post()
    @jsonDecorator("Outgoing rule created successfully", "Create a new outgoing rule")

    /*
    @Usage                          : To create new outgoing rule
    @Method                         : POST
    @Param name                     : string
    @Param description              : string
    @Param status                   : string[Default 0]
    @Param rules                    : Array of an object
    @return success / error object  : { Outgoing rule created successfully / Outgoing rule already exist}
    */

    create(@Body() createOutgoingRulesDto: CreateOutgoingRulesDto) {
        return this.outgoing_rules.create(createOutgoingRulesDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved outgoing rules successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search outgoing rules
    @Method            : POST
    @Param             : Single or multiple parameters 
    @return Object     : Array of an object with total count of outgoing rules with data
    */

    advancedSearch(@Body() searchData) {
        return this.outgoing_rules.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all outgoing rules successfully", "List all outgoing rules")

    /*
    @Usage  : List all outgoing rules
    @Method : GET
    @return : Array of an object with total count of outgoing rules with data
    */

    findAll(@Query() queryParam) {
        return this.outgoing_rules.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved single outgoing rules successfully", "List single outgoing rules using uuid")

    /*
    @Usage               : List single outgoing rules using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid outgoing rules
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.outgoing_rules.findOne(id);
    }

    @Put(':uuid')
    @jsonDecorator("Outgoing rule update successfully", "Update single outgoing rule using uuid")

    /*
    @Usage                          : Update single outgoing rule using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param description              : string
    @Param status                   : string[Default 0]
    @Param rules                    : Array of an object
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Outgoing rule updated successfully / Outgoing rule already exist}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createOutgoingRulesDto: CreateOutgoingRulesDto) {
        return this.outgoing_rules.update(id, createOutgoingRulesDto);
    }

    @Patch(':uuid')
    @putDecoraters("Outgoing rule status update successfully", "Update single outgoing rule status using uuid")

    /*
    @Usage               : Update single outgoing rule using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Outgoing rule status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
        return this.outgoing_rules.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Outgoing rule deleted successfully", "Delete single or multiple outgoing rule using uuid")

    /*
    @Usage               : Delete single or multiple outgoing rule using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single outgoing rule pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Outgoing rule deleted successfully / Outgoing rule not found}
    */

    remove(@Param('uuid') id: string) {
        return this.outgoing_rules.remove(id);
    }
}

