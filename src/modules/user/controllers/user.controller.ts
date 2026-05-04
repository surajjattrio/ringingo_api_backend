import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateUserDto } from "../dto/create-user.dto";
import { UserService } from "../services/user.service";
import { LoggedInUserDto } from "../dto/logged-in-user.dto";
import { Public } from "src/global_constant";
import { LogoutUserDto } from "../dto/logout-user.dto";
import { UserRabbitmqService } from "../services/user-rabbitmq.service";

@Controller("user")

/*@Usage : To provide title of API in swagger */
@ApiTags("User")

export class UserController {

    /*
    @Usage  : To load user service and other libraries
    @return : Object[user] 
    */

    constructor(
        private readonly user: UserService,
        private readonly userRabbitmqService: UserRabbitmqService
    ) { }

    @Post()
    @postDecoraters("User created successfully", "Create a new user")

    /*
    @Usage                          : To create new user
    @Method                         : POST
    @Param username                 : string
    @Param email                    : string
    @Param password                 : string
    @Param default_timeout          : string
    @Param recording                : string
    @Param status                   : integer [Default 0]
    @Param default_extension_type   : integer [Default 0]
    @return success / error object  : { User created successfully / User already exist }
    */

    create(@Body() createUserDto: CreateUserDto) {
        return this.user.create(createUserDto);
    }

    @Post("/advanced-search")
    @postDecoraters("Retrieved users successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search user
    @Method            : POST
    @Param             : Single or multiple parameter
    @return Object     : Array of an object with total count of tenants with data
    */

    advancedSearch(@Body() searchData) {
        return this.user.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all users successfully", "List all users")

    /*
    @Usage  : List all users
    @Method : GET
    @return : Array of an object with total count of users with data
    */

    findAll(@Query() queryParam) {        
        return this.user.findAll(queryParam);
    }



    @Get('/allowed_campaigns')
    @Public()
    @getDecoraters("Retrieved all allowed campaign successfully", "List all allowed campaigns")

    /*
    @Usage  : List all allowed campaigns
    @Method : GET
    @return : Array of an object with total count of users with data
    */

    findAllowedCampaigns(@Query() queryParam) {   
        console.log("queryParamsqueryParams",queryParam);
        return this.user.findAllowedCampaigns(queryParam);
    }



    @Get(':uuid')
    @getDecoraters("Retrieved single user successfully", "List single user using uuid")

    /*
    @Usage               : List single user using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid user
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.user.findOne(id);
    }

    @Put(':uuid')
    @putDecoraters("User update successfully", "Update single user using uuid")

    /*
    @Usage                          : Update single user using uuid
    @Method                         : PUT
    @Param username                 : string
    @Param email                    : string
    @Param password                 : string
    @Param default_timeout          : string
    @Param recording                : string
    @Param status                   : integer [Default 0]
    @Param default_extension_type   : integer [Default 0]
    @Param ParseUUIDPipe            : To validate uuid
    @return success / error object  : { User updated successfully / User not found}
    */

    update(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() createUserDto: CreateUserDto) {
        return this.user.update(id, createUserDto);
    }

    @Patch(':uuid')
    @putDecoraters("User status update successfully", "Update single user status using uuid")

    /*
    @Usage               : Update single user using uuid
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : Single or multiple params will receive here
    @return string       : User status updated successfully
    */

    patch(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: PatchDto) {
	    //findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
	//	        userdata = this.user.findOne(id);
	//		console.log("userdata");
	//		console.log(userdata);
	//	    }

        return this.user.patch(id, patchDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("User deleted successfully", "Delete single or multiple user using uuid")

    /*
    @Usage               : Delete single or multiple user using uuid
    @Method              : DELETE
    @Param  uuid         : To delete single user pass one uuid , for multiple pass comma separated uuids without space
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { User deleted successfully / User not found}
    */

    remove(@Param('uuid') id: string) {
        return this.user.remove(id);
    }

    @Get("/external/details")
    @getDecoraters("Retrieved PSTN details successfully", "List PSTN details")

    /*
    @Usage  : List all users having extension type = 1
    @Method : GET
    @return : Array of an object with total count of users with data
    */

    getExternalOnly(@Query() queryParam) { // External = PSTN
        return this.user.getExternalOnly(queryParam);
    }
    
    @Public()
    @Patch('update-user-auth-status/:uuid')
    @putDecoraters("User status update successfully", "Update single user status using uuid")

    /*
    @Usage               : To update is_logged_in to 0
    @Method              : PATCH
    @Param ParseUUIDPipe : To validate uuid
    @Param               : is_logged_in will receive here
    @return string       : User status updated successfully
    */

    updateUserLoggedInStatus(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Body() patchDto: LoggedInUserDto) {
        return this.user.patch(id, patchDto , "logout");
    }

    /*********************** For Mobile *********************/

    @Public()
    @Post("/logout")
    @postDecoraters("Logout user successfully", "To logout user")

    /*
    @Usage             : To logout user
    @Method            : POST
    @Param username    : string
    @Param domain      : string
    @return Object     : Success / Error
    */

    logoutUser(@Body() logoutUserDto : LogoutUserDto) {
        return this.user.logoutUser(logoutUserDto);
    }


    /*********************** For Zoho *********************/

    @Public()
    @Get( "zoho/:zoho_user_id" )

    /*
    @Usage               : Login to tenant
    @Method              : POST
    @Param  uuid         : Tenant uuid to login
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Logged in successfully / Tenant not found}
    */
    loginzohoUser ( @Param( 'zoho_user_id' ) zoho_user_id: string ) {
        console.log( "DATA COMING" )
        return this.user.loginzohoUser( zoho_user_id );
    }

    @Public()
    @Get("/test/rabbitmq")
    @getDecoraters("Test RabbitMQ health successfully", "Test RabbitMQ health status")
    async testRabbitMQ() {
        try {
            const health = this.userRabbitmqService.checkHealth();
            return { success: health.status === 'up', ...health };
        } catch (error) {
            return { success: false, message: 'Failed to check health', error: error.message };
        }
    }

    @Post(":uuid/sync-waba")
    @postDecoraters("User sync initiated successfully", "Initiate manual WABA sync for user")
    syncWaba(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.user.syncWaba(id);
    }

}
