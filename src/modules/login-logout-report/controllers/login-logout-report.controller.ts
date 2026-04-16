import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, Delete, Put } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters, deleteDecoraters } from "src/swagger/swagger_decoraters";
import { LoginlogoutreportService } from "../services/login-logout-report.service";


@Controller( "login-logout-report" )

@ApiTags( "Login-Logout Report" )

export class LoginlogoutreportController {

     constructor( private readonly login_logout_report: LoginlogoutreportService ) { }

     @Get()
     @getDecoraters( "Retrieved all login logout report successfully", "List all login logout report" )

     /*
     @Usage            : To fetch all login logout report
     @Method           : GET
     @Param req        : LoggedIn user details
     @return Object    : Array of an object with total count of campaign with data
     */

     fetchLoginLogoutReportStatistics ( @Query() queryParam ) {
          return this.login_logout_report.fetchLoginLogoutReportStatistics( queryParam );
     }

     @Get( "/entries" )
     @getDecoraters( "Retrieved all login logout report successfully", "List all login logout report" )

     /*
     @Usage            : To fetch all login logout report entries based on date
     @Method           : GET
     @Param queryParam : Params receive with request
     @return Object     : Array of an object with total count of login logout with data
     */

     fetchLoginLogoutEntries ( @Query() queryParam ) {
          return this.login_logout_report.fetchLoginLogoutEntries( queryParam );
     }

     @Get( "/export" )
     @getDecoraters( "Export login logout report with information data successfully", "Export login logout report with detailed information" )

     /*
     @Usage            : To export login logout report with detailed information data
     @Method           : GET
     @Param queryParam : Query parameters for filtering
     @return Object     : Array of export data with summary and information details
     */

     exportLoginLogoutWithInfo ( @Query() queryParam ) {
          return this.login_logout_report.exportLoginLogoutWithInfo( queryParam );
     }

     @Post( "/advanced-search" )
     @postDecoraters( "Retrieved all login logout report successfully", "Advanced search for single or multiple filed" )

     /*
     @Usage             : To search cdrs
     @Method            : POST
     @Param             : Single or multiple parameters
     @return Object     : Array of an object with total count of cdrs with data
     */

     advancedSearch ( @Body() searchData ) {
          return this.login_logout_report.advancedSearch( searchData );
     }
}
