import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CustomFieldDto } from "../dto/custom-field-dto";
import { CustomFieldsService } from "../services/custom-field-service";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";


@Controller( "custom-fields" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Custom-Fields" )
export class CustomFieldsController {

     /*
     @Usage  : To load custom-fields service and other libraries
     @return : Object[custom-fields]
     */

     constructor( private readonly custom_fields: CustomFieldsService, private readonly commonDbFn: CommonDBFunctions ) { }

     @Get()
     @getDecoraters( "Retrieved all custom field successfully", "List all custom field" )

     /*
     @Usage  : List all custom field
     @Method : GET
     @return : Array of an object with total count of custom field with data
     */

     findAll ( @Query() queryParam ) {
          return this.custom_fields.findAll( queryParam );
     }


     @Post( "/advanced-search" )
     @postDecoraters( "Retrieved custom-field successfully", "Advanced search for single or multiple filed" )

     /*
     @Usage             : To search custom-field
     @Method            : POST
     @Param             : Single or multiple parameter
     @return Object     : Array of an object with total count of custom field with data
     */

     advancedSearch ( @Body() searchData ) {
          return this.custom_fields.advancedSearch( searchData );
     }

     @Post()
     @postDecoraters( "Custom Field created successfully", "Create a new Custom-Field" )

     /*
     @Usage                          : To create new Custom-field
     @Method                         : POST
     @Param routing_uuid             : string
     @Param did_type                 : string
     @Param caller_id                : string
     @Param tenant_uuid              : string
     @Param destination              : string
     @Param user_uuid                : string
     @return success / error object  : { Custom Field created successfully / Custom Field already exist}
     */

     create ( @Body() customfielddto: CustomFieldDto ) {
          return this.custom_fields.create( customfielddto );
     }

     @Get( ':uuid' )
     @getDecoraters( "Retrieved single custom field successfully", "List single custom field using uuid" )

     /*
     @Usage               : List single custom field using uuid
     @Method              : GET
     @Param  uuid         : string
     @Param ParseUUIDPipe : To validate uuid
     @return object       : Full detail of particular uuid custom field
     */

     findOne ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
          return this.custom_fields.findOne( id );
     }


     @Put( ':uuid' )
     @putDecoraters( "Custom Field update successfully", "Update single Custom Field using uuid" )

     /*
     @Usage                          : Update single custom field using uuid
     @Method                         : PUT
        @Param name                     : string
     @Param description              : string
     @Param url                      : string
     @Param tenant_uuid              : string
     @Param ParseUUIDPipe            : To validate uuid
     @return success / error object  : { Custom Field updated successfully / Cusotm Field already exist}
     */

     update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() customfielddto: CustomFieldDto ) {
          return this.custom_fields.update( id, customfielddto );
     }

     @Delete( ':uuid' )
     @deleteDecoraters( "Cusom Field deleted successfully", "Delete single or multiple Custom Field using uuid" )

     /*
     @Usage               : Delete single or multiple Custom Field using uuid
     @Method              : DELETE
     @Param  uuid         : To delete single custom Field pass one uuid , for multiple pass comma separated uuids without space
     @return success / error object  : { custom Field deleted successfully / custom field not found}
     */

     remove ( @Param( 'uuid' ) id: string ) {
          return this.custom_fields.remove( id );
     }




}
