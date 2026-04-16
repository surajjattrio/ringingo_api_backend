import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpStatus,
  Logger,
  Get,
  Query
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AuthGuard } from "@nestjs/passport";
import { Public } from "src/global_constant";
import { loginDecoraters } from "src/swagger/swagger_decoraters";
import { LoginDto } from "../dto/create-master-admin.dto";
import { JWTService } from "src/modules/auth/jwt.service";

import { CheckLicenseService } from "../services/check-license.service";
import { CommonFunctions } from "src/modules/common/common_functions";

@Controller( "login" )

/*@Usage : To provide title of API in swagger */
@ApiTags( "Login" )

export class MasterAdminController {

  /*
  @Usage  : To load jwt service and other libraries
  @return : Object[jwt]
  */


  constructor(
    private readonly jwt: JWTService,
    private readonly license: CheckLicenseService,
    private readonly commonFn: CommonFunctions,
  ) { }

  @Public()
  @Post()
  @loginDecoraters( "Logged in successfully" )
  @UseGuards( AuthGuard( "local" ) )

  /*
  @Usage : To authenticate user[Authentication will check by @UseGuards(AuthGuard('local')) once user is authenticated , we will receive authenticated user details in(req.user) from that details JWT token will be created
  @Method : POST
  @Param username/email : string
  @Param password : string
  @return access_token[Using JWT]
  */
  async authenticate ( @Body() createMasterAdminDto: LoginDto, @Req() req ) {
    if ( req.user.statusCode == 404 || req.user.statusCode == 403 ) return req.user;
    let role = req.user.role;
    if ( role == "tenant" || role == "manager" ) {

      let obj, loginEntityInfo = "tenant_detail", tokenObj = {};
      obj = { tenant_name: req.user.tenant_name, username: req.user.username, domain: req.user.domain, email: req.user.email, uuid: req.user.uuid, roles: req.user.roles, timezone: req.user.timezoneName };

      if ( role == "manager" ) {
        loginEntityInfo = "manager_detail";
        obj = { username: req.user.username, domain: req.user.domain, email: req.user.email, uuid: req.user.uuid, roles: req.user.manager_role, timezone: req.user.timezoneName, sip_port: req.user.sip_port, extension_details: req.user.extension_details };
        tokenObj[ "assigned_manager_role" ] = obj.roles[ 0 ].uuid;
	tokenObj["parent_uuid"] = req.user.parent_uuid;
      }

      //Check admin has added license and status active or not
      let response = await this.license.checkLicenseExist();
      if ( response == false ) return { statusCode: HttpStatus.FORBIDDEN, data: "Access not permitted. Please contact the administrator." }

      //Check license status
      let licenseInfo: any = await this.commonFn.licenseCheck( response, "", this.license, role );

      //Check result flag true or false
      if ( licenseInfo.licenseValid ) {
        tokenObj = { ...tokenObj, username: obj.username, domain: obj.domain, email: obj.email, role, uuid: obj.uuid, timezone: obj.timezone };
	      console.log("TOKEN",this.jwt.generateToken( tokenObj ));
        if (req.body.webhook === true) {
          return {
            statusCode: HttpStatus.OK,
            message: "Token generated successfully",
            role: role,
            access_token: this.jwt.generateToken(tokenObj)
          }
        } else {
          return {
            statusCode: HttpStatus.OK,
            data: "Logged in successfully",
            [ loginEntityInfo ]: obj,
            role: role,
            access_token: this.jwt.generateToken( tokenObj )
          }
        }
      } else {
        return { statusCode: HttpStatus.FORBIDDEN, data: "Access not permitted. Please contact administrator." };
      }

    } else {
      let { username, _id, master_admin_uuid } = req.user;
      let id = _id.toString();
      let uuid = master_admin_uuid;

      //Check license key exist
      let response: any = await this.license.checkLicenseExist();

      //Check given license
      let licenseInfo: any = await this.commonFn.licenseCheck( response, createMasterAdminDto.key, this.license, role );

      //Check flag true or false
      if ( licenseInfo.licenseValid ) {
        return {
          statusCode: HttpStatus.OK,
          data: "Logged in successfully",
          role: role,
          username,
          master_admin_uuid,
          access_token: await this.jwt.generateToken( {
            username,
            id,
            uuid,
            role,
          } )
        };
      } else return { statusCode: HttpStatus.UNAUTHORIZED, data: licenseInfo?.errorMessage };
    }
  }

  /*@Usage : To check license exist or not*/

  @Public()
  @Get( '/check-license' )
  async checkLicenseExist ( @Query() queryParam ) {
    return true;
    try {
      const { domain, from } = queryParam;

      //To send expiry date to when this API call from FS side
      if ( from != "" && from == "FS" ) {
        let result: any = await this.license.checkLicenseExist();
        if ( result ) {
          result = JSON.parse( result );
          return result.checkdate;
        } else {
          return false;
        }
      }

      //No need to show popup in tenant portal
      if ( domain != process.env.TENANT_PORTAL_DOMIAN ) { return true; }
      let result = await this.license.checkLicenseExist();
      return result != false ? true : false;
    } catch ( error ) {
      Logger.error( `Error in catch block`, error.message );
    }
  }
}


