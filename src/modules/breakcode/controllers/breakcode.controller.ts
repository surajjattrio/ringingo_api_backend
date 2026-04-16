import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateBreakcodeDto } from "../dto/create-breakcode.dto";
import { BreakcodeService } from '../services/breakcode.service';
import { AgentLoginLogoutReportDto } from "src/modules/call-center/dto/agent-login-logout-report.dto";

@Controller( "breakcode" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "BreakCode" )

export class BreakcodeController {

    constructor( private readonly breakcode: BreakcodeService ) { }

    @Post()
    @jsonDecorator( "Break Code created successfully", "Create a new Break Code" )

    /*
    @Usage                          : To create new BreakCode
    @Method                         : POST
    @Param name                     : string
    @Param status                   : number[Default 0]
    @Param user_uuid                : string
    @Param tenant_uuid              : string
    @return success / error object  : { Breakcode created successfully / Breakcode already exist}
    */

    create ( @Body() createBreakcodeDto: CreateBreakcodeDto ) {
        return this.breakcode.create( createBreakcodeDto );
    }

    @Get()
    @getDecoraters( "Retrieved all break code successfully", "List all break code" )

    /*
    @Usage  : List all breakcode
    @Method : GET
    @return : Array of an object with total count of breakcode with data
    */

    findAll ( @Query() queryParam ) {
        return this.breakcode.findAll( queryParam );
    }

    @Get( ':uuid' )
    @getDecoraters( "Retrieved single break code successfully", "List single break code using uuid" )

    /*
    @Usage               : List single breakcode using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid breakcode
    */

    findOne ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
        return this.breakcode.findOne( id );
    }

    @Put( ':uuid' )
    @putDecoraters( "break code update successfully", "Update single break code using uuid" )

    /*
    @Usage                          : Update single breakcode using uuid
    @Method                         : PUT
    @Param name                     : string
    @Param status                   : number[Default 0]
    @Param user_uuid                : string
    @Param tenant_uuid              : string
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { Breakcode updated successfully / name already exist}
    */

    update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() CreateBreakcodeDto: CreateBreakcodeDto ) {
        return this.breakcode.update( id, CreateBreakcodeDto );
    }

    @Patch( ':uuid' )
    @putDecoraters( "Break code status update successfully", "Update single break code status using uuid" )

    /*
    @Usage               : Update single breakcode using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Breakcode status updated successfully
    */

    patch ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() patchDto: PatchDto ) {
        return this.breakcode.patch( id, patchDto );
    }

    @Delete( ':uuid' )
    @deleteDecoraters( "Break code deleted successfully", "Delete single or multiple break code using uuid" )

    /*
    @Usage               : Delete single or multiple breakcode using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single breakcode pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Breakcode deleted successfully / Breakcode not found}
    */

    remove ( @Param( 'uuid' ) id: string ) {
        return this.breakcode.remove( id );
    }

    @Post( "/advanced-search" )
    @postDecoraters( "Retrieved break code successfully", "Advanced search for single or multiple filed" )

    /*
    @Usage             : To search breakcode
    @Method            : POST
    @Param number      : string
    @Param user_uuid   : string
    @Param timeout     : string
    @Param status      : string
    @return Object     : Array of an object with total count of breakcode with data
    */

    advancedSearch ( @Body() searchData ) {
        return this.breakcode.advancedSearch( searchData );
    }

    @Post( "/inbreak" )
    @jsonDecorator( "Break Code insert successfully", "Insert a new Break Code" )

    /*
    @Usage                          : To create new BreakCode
    @Method                         : POST
    @Param name                     : string
    @Param status                   : number[Default 0]
    @Param user_uuid                : string
    @Param tenant_uuid              : string
    @return success / error object  : { Breakcode created successfully / Breakcode already exist}
    */

    inbreak ( @Body() agentLoginLogoutReportDto: AgentLoginLogoutReportDto ) {
        return this.breakcode.inbreak( agentLoginLogoutReportDto );
    }


}
