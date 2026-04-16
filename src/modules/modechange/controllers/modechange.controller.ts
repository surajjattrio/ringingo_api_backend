import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateModechangeDto } from "../dto/create-modechange.dto";
import { ModechangeService } from '../services/modechange.service';

@Controller( "modechange" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Modechange" )

export class ModechangeController {

    constructor( private readonly modechange: ModechangeService ) { }

    @Patch( ':user_uuid' )
    @putDecoraters( "Modechange status update successfully", "Update single modechange status using uuid" )

    /*
    @Usage               : Update single modechange using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : Modechange status updated successfully
    */

    patch ( @Param( 'user_uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() patchDto: PatchDto ) {
        return this.modechange.patch( id, patchDto );
    }

}
