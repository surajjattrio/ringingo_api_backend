import { Controller, Get, Post, Body, Res,Delete, UploadedFiles,UseInterceptors,Put,BadRequestException, Req, Param, ParseUUIDPipe, Query, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FilesInterceptor, FileFieldsInterceptor } from "@nestjs/platform-express";
import { deleteDecoraters,fileDecorator, getDecoraters, postDecoraters, putDecoraters } from 'src/swagger/swagger_decoraters';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { Public } from 'src/global_constant';
import { PatchDto } from 'src/modules/common/dto/patch.dto';
import * as path from "path";
import { ensureDir, remove } from 'fs-extra';
import { Request as ExpressRequest } from 'express';
import { diskStorage, Multer } from 'multer';
import { randomUUID } from 'crypto';
import { TenantPersonalizationDto } from '../dto/tenant-personalization.dto';
import { TenantRabbitmqService } from '../services/tenant-rabbitmq.service';

@Controller( 'tenant' )

/*@Usage : To provide title of API in swagger */
@ApiTags( 'Tenant' )

export class TenantController {

  /*
  @Usage  : To load tenant service and other libraries
  @return : Object[tenant]
  */

 constructor( 
    private readonly tenant: TenantService,
    private readonly tenantRabbitmqService: TenantRabbitmqService
  ) { }
  @Post()
  @postDecoraters( "Tenant created successfully", "Create a new tenant" )

  /*
  @Usage              : To create new tenant
  @Method             : POST
  @Param tenant_name  : string
  @Param username     : string
  @Param password     : string
  @Param domain       : string
  @Param status       : integer [Default 0]
  @Param time_zone_id : integer [Default 0]
  @return success / error object  : { Tenant created successfully / Tenant or domain already exist}
  */

  create ( @Body() createTenantDto: CreateTenantDto, @Req() req ) {
    let { uuid } = req.user;
    createTenantDto.creation_uuid = uuid;
    createTenantDto.update_uuid = uuid;
    return this.tenant.create( createTenantDto );
  }

  @Post( "/advanced-search" )
  @postDecoraters( "Retrieved tenants successfully", "Advanced search for single or multiple filed" )

  /*
  @Usage             : To search tenant
  @Method            : POST
  @Param tenant_name : string
  @Param username    : string
  @Param domain      : string
  @return Object     : Array of an object with total count of tenants with data
  */

  advancedSearch ( @Body() searchData ) {
    return this.tenant.advancedSearch( searchData );
  }

  @Get()
  @getDecoraters( "Retrieved all tenants successfully", "List all tenants" )

  /*
  @Usage  : List all tenants
  @Method : GET
  @return : Array of an object with total count of tenants with data
  */

  findAll ( @Query() queryParam ) {
    return this.tenant.findAll( queryParam );
  }

  @Get( ':uuid' )
  @getDecoraters( "Retrieved single tenant successfully", "List single tenant using uuid" )

  /*
  @Usage               : List single tenant using uuid
  @Method              : GET
  @Param  uuid         : string
  @Param ParseUUIDPipe : To validate uuid
  @return object       : Full detail of particular uuid tenant
  */

  findOne ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
    return this.tenant.findOne( id );
  }

  @Put( ':uuid' )
  @putDecoraters( "Tenant update successfully", "Update single tenant using uuid" )

  /*
  @Usage               : Update single tenant using uuid
  @Method              : PUT
  @Param tenant_name   : string
  @Param username      : string
  @Param password      : string
  @Param domain        : string
  @Param status        : integer [Default 0]
  @Param time_zone_id  : integer [Default 0]
  @Param ParseUUIDPipe : To validate uuid
  @return success / error object  : { Tenant updated successfully / Domain already exist}
  */

  update ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() createTenantDto: CreateTenantDto ) {
    return this.tenant.update( id, createTenantDto );
  }

  @Patch( ':uuid' )
  @putDecoraters( "Tenant status update successfully", "Update single tenant status using uuid" )

  /*
  @Usage               : Update single tenant using uuid
  @Method              : PATCH
  @Param ParseUUIDPipe : To validate uuid
  @Param               : Single or multiple params will receive here
  @return string       : Tenant status updated successfully
  */

  patch ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string, @Body() patchDto: PatchDto ) {
    return this.tenant.patch( id, patchDto );
  }

  @Delete( ':uuid' )
  @deleteDecoraters( "Tenant deleted successfully", "Delete single or multiple tenant using uuid" )

  /*
  @Usage               : Delete single or multiple tenant using uuid
  @Method              : DELETE
  @Param  uuid         : To delete single tenant pass one uuid , for multiple pass comma separated uuids without space
  @Param ParseUUIDPipe : To validate uuid
  @return success / error object  : { Tenant deleted successfully / Tenant not found}
  */

  remove ( @Param( 'uuid' ) id: string ) {
    return this.tenant.remove( id );
  }

  @Public()
  @Get( "login/:uuid" )

  /*
  @Usage               : Login to tenant
  @Method              : POST
  @Param  uuid         : Tenant uuid to login
  @Param ParseUUIDPipe : To validate uuid
  @return success / error object  : { Logged in successfully / Tenant not found}
  */

  tenantLogin ( @Param( 'uuid', new ParseUUIDPipe( { version: '4' } ) ) id: string ) {
    return this.tenant.tenantLogin( id );
  }


  /*********************************** Agent's Realtime Report ***************************************/

  @Get( "realtime-report/agents" )
  @getDecoraters( "Retrieved all agent report successfully", "List all agents report" )

  /*
  @Usage  : List all details of agent in realtime time report
  @Method : GET
  @return : Array of an object with agent details
  */

  getRealtimeReportOfAgents(@Query() queryParam, @Req() req) {
    let { uuid, role, parent_uuid } = req.user;
    queryParam.tenant_uuid = uuid;
    queryParam.role = role;
    queryParam.parent_uuid = parent_uuid;
    return this.tenant.getRealtimeReportOfAgents( queryParam );
  }

  @Put("agent-break/:feature/:uuid")
  @putDecoraters( "Agent put on break  successfully", "Agent on Break by Tenant" )

  putAgentOnBreak(@Param() params: any, @Body() body: any){
    const {uuid,feature} = params;
    console.log("Inside constroller",uuid,body)
    let result;
    switch (feature) {
      case "on":
        result = this.tenant.putAgentOnBreak(uuid,body)
        break;
      case "off":
        result = this.tenant.putAgentOffBreak(uuid,body)
        break;

    }
    
    return result;
  }

  @Post( "realtime-report/advanced-search" )
  @postDecoraters( "Retrieved all agent report successfully", "Advanced search for single or multiple filed" )

  /*
  @Usage             : To search data in realtime report
  @Method            : POST
  @Param             : Single or multiple params receive here
  @return Object     : Array of an object with agent details
  */

  realtimeReportAdvancedSearch(@Body() searchData, @Req() req) {
    let { uuid, role, parent_uuid } = req.user;
    searchData.tenant_uuid = uuid;
    searchData.role = role;
    searchData.parent_uuid = parent_uuid;
    return this.tenant.realtimeReportAdvancedSearch( searchData );
  }

  @Post( "realtime-report/call-pause" )
  @postDecoraters( "Fetched call successfully", "To get call uuid" )

  /*
  @Usage             : To filter call based on caller_id_number and destination
  @Method            : POST
  @Param requestDto  : Conatins request data
  @return Object     : Success / Error
  */

  getCallUUIDFromFS ( @Body() requestDto ) {
    return this.tenant.getCallUUIDFromFS( requestDto );
  }

  @Post( '/tenantpersonalization' )
  @fileDecorator( "Greeting created successfully", "Create a new greeting" )
  @UseInterceptors( FileFieldsInterceptor( [
    { name: 'expandedfile', maxCount: 1 },
    { name: 'collapsedfile', maxCount: 1 },
    { name: 'faviconfile', maxCount: 1 }
  ], {
    storage: diskStorage( {
      destination: async ( req: ExpressRequest, file, cb ) => { // Use ExpressRequest
        const tenantDomain = req.body?.tenant_domain;
        console.log( 'Destination Middleware - Tenant Domain:', tenantDomain );
        try {
          if ( !tenantDomain ) {
            throw new Error( 'Tenant domain is missing in the request body' );
          }
          const destinationPath = `./upload/${tenantDomain}`;
          await ensureDir( destinationPath );
          cb( null, destinationPath );
        } catch ( err ) {
          cb( err, '' );
        }
      },
      filename: ( req, file, cb ) => {


        const fileExtension = file.originalname.split( '.' ).pop().toLowerCase();
        // Validating file types (SVG, JPEG, PNG)

        if ( ![ 'svg', 'jpeg', 'jpg', 'png' ].includes( fileExtension ) ) {
          return cb( new BadRequestException( 'Invalid file format' ), '' );
        }


        cb( null, `${randomUUID()}.${fileExtension}` );
      }
    } )
  } ) )
  /*
  @Usage                          : To create new greeting with logos
  @Method                         : POST
  @Param name                     : string
  @Param user                     : string
  @Param files                    : array of files
  @return success / error object  : { Greeting created successfully / Greeting already exist}
  */
  async createtenantpersonalization (
    @Body() tenantpersonalizationDto: TenantPersonalizationDto,
    @UploadedFiles() file: { expandedfile?: Express.Multer.File[], collapsedfile?: Express.Multer.File[], faviconfile?: Express.Multer.File[] },
    @Req() req
  ) {

    // const { uuid } = req.user;
    const { title, footer, tenant_uuid, tenant_domain } = req.body;
    // console.log( tenantpersonalizationDto );
    // console.log( file );

    // Check if all files are uploaded
    // if ( !file.expandedfile || !file.collapsedfile || !file.faviconfile ) {
    //   throw new BadRequestException( 'Please upload all required files' );
    // }
    if ( file.expandedfile && file.expandedfile[ 0 ].size > 2097152 ) { // 2 MB in bytes
      throw new BadRequestException( 'Expanded File should be less than 2 MB' );
    }
    if ( file.collapsedfile && file.collapsedfile[ 0 ].size > 2097152 ) { // 2 MB in bytes
      throw new BadRequestException( 'Collapsed File should be less than 2 MB' );
    }
    if ( file.faviconfile && file.faviconfile[ 0 ].size > 2097152 ) { // 2 MB in bytes
      throw new BadRequestException( 'Favicon File should be less than 2 MB' );
    }
    // console.log( file.expandedfile[ 0 ].fieldname );
    // console.log( file.collapsedfile );
    // tenantpersonalizationDto.expandedfile = file.map( file => file.filename );
    tenantpersonalizationDto.tenant_uuid = tenant_uuid;
    tenantpersonalizationDto.tenant_domain = tenant_domain;
    // tenantpersonalizationDto.expandedfile =
    if ( file.expandedfile ) {
      tenantpersonalizationDto.expandedfile = tenant_domain + "_" + file.expandedfile[ 0 ].filename;
    }
    if ( file.collapsedfile ) {
      tenantpersonalizationDto.collapsedfile = tenant_domain + "_" + file.collapsedfile[ 0 ].filename;
    }
    if ( file.faviconfile ) {
      tenantpersonalizationDto.faviconfile = tenant_domain + "_" + file.faviconfile[ 0 ].filename;
    }

    tenantpersonalizationDto.footer = footer;
    tenantpersonalizationDto.title = title;
    console.log( tenantpersonalizationDto )
    // tenantpersonalizationDto.uuid = files.map( file => file.filename.split( '.' )[ 0 ] );

    let response = await this.tenant.createtenantpersonalization( tenantpersonalizationDto );

    console.log( response );
    if ( response.statusCode == 409 ) {
      if ( file.expandedfile ) {
        remove( file.expandedfile[ 0 ].path );
      }
      if ( file.collapsedfile ) {
        remove( file.collapsedfile[ 0 ].path );
      }
      if ( file.faviconfile ) {
        remove( file.faviconfile[ 0 ].path );
      }

    }
    return response;

  }

  @Public()
  @Get( 'tenantpersonalization/:domain' )
  @getDecoraters( "Retrieved single tenantpersonalization successfully", "List single tenant personalization using uuid" )

  /*
  @Usage               : List single tenant personalization using uuid
  @Method              : GET
  @Param  uuid         : string
  @Param ParseUUIDPipe : To validate uuid
  @return object       : Full detail of particular uuid tenant personalization
  */

  tenantpersonalizationfindone ( @Param() domain: string ) {
    return this.tenant.tenantpersonalizationfindone( domain );
  }

  @Public()
  @Get( "/download/:file" )
  @postDecoraters( "Retrieved logo successfully", "Advanced search for single or multiple filed" )

  /*
  @Usage           : To download .wav file
  @Method          : POST
  @Param  filename : Name of file which need to be download
  @return success / error object  : { Fill we be sent in body / Unable to find file }
  */

  downloadWav ( @Param() filename, @Res() res ) {
    console.log( filename.file )
    const parts = filename.file.split( '_' );
    console.log( parts );
    let domain = parts[ 0 ];
    let file = parts[ 1 ];
    res.download( path.join( __dirname, `../../../../upload/${domain}/${file}` ) )
  }

   @Public()
  @Get( '/test/rabbitmq' )
  @getDecoraters( "Test RabbitMQ health successfully", "Test RabbitMQ health status" )
  async testRabbitMQ() {
    try {
      const health = this.tenantRabbitmqService.checkHealth();
      return { success: health.status === 'up', ...health };
    } catch (error) {
      return { success: false, message: 'Failed to check health', error: error.message };
    }
  }

  @Post( 'sso/waba/token' )
  @postDecoraters( "Generate WABA SSO Token", "Generates a short-lived token for SSO to WABA" )
  async generateWabaSsoToken( @Req() req ) {
    return this.tenant.generateWabaSsoToken( req.user );
  }

}
