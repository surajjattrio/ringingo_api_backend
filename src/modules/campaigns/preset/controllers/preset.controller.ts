import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";

import { PresetDto } from "../dto/preset.dto";
import { PresetService } from "../services/preset.service";

@Controller( "preset" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Preset" )
export class PresetController {

     /*
     @Usage  : To load Preset service and other libraries
     @return : Object[preset]
     */

     constructor( private readonly preset: PresetService ) { }

     @Post("/create")
     @postDecoraters( "Preset created successfully", "Create a new Preset" )
     /*
     @Usage                          : To create new Presest
     @Method                         : POST
     @Param phone_number             : string
     @Param status                   : number[Default 0]
     @Param global_status            : string
     @Param campaign_uuid                 : string
     @Param tenant_uuid              : string
     @return success / error object  : { Preset created successfully / Preset already exist}
     */

     create ( @Body() presetDto: PresetDto ) {
          return this.preset.create( presetDto );
     }

     @Get()
     @getDecoraters( "Retrieved all Preset successfully", "List all Preset" )

     /*
     @Usage  : List all preset
     @Method : GET
     @return : Array of an object with total count of dnc with data
     */

     findAll ( @Query() queryParam ) {
          return this.preset.findAll( queryParam );
     }


     @Get('edit/:uuid')
     @getDecoraters("Retrieved single preset successfully", "List single preset using uuid")

    /*
    @Usage               : List single preset using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid preset
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.preset.findOne(id);
    }

     @Put( ':uuid' )
     @putDecoraters( "Preset update successfully", "Update single Preset using uuid" )

     /*
     @Usage                          : Update single Preset using uuid
     @Method                         : PUT
     @Param phone_number             : string
     @Param status                   : number[Default 0]
     @Param global_status            : string
     @Param campaign_uuid                : string
     @Param tenant_uuid              : string
     @Param ParseUUIDPipe            : To validate uuid
     @return success / error object  : { Preset updated successfully / Preset already exist}
     */

     update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() presetDto: PresetDto ) {
          return this.preset.update( id, presetDto );
     }

     @Delete( ':uuid' )
     @deleteDecoraters( "Preset deleted successfully", "Delete single or multiple Preset using uuid" )

     /*
     @Usage               : Delete single or multiple Preset using uuid
     @Method              : DELETE
     @Param  uuid         : To delete single preset pass one uuid , for multiple pass comma separated uuids without space
     @return success / error object  : { Preset deleted successfully / Preset not found}
     */

     remove ( @Param( 'uuid' ) id: string ) {
          return this.preset.remove( id );
     }
}

