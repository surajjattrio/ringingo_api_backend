import { Body, Controller, Post , Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/global_constant";
import { postDecoraters } from "src/swagger/swagger_decoraters";
import { ZohocrmService } from "../services/zohocrm.service";
import { ZohocrmDto } from "../dto/zohocrm.dto";
import { ZohocrmcdrsDto } from "../dto/zohocrmcdrs.dto";


@Controller("zohocrm")

/*@Usage : To provide title of API in swagger */
@ApiTags("Zohocrm")

export class ZohocrmController {

    /*
    @Usage  : To load agent service and other libraries
    @return : Object[agent] 
    */

    constructor(private readonly zohocrm : ZohocrmService){}

    @Public()
    @Post('/getzohouser')
    @postDecoraters("Get Zoho users", "zoho user")

    /*
    @Usage                  : To find agent with given credentails
    @Method                 : POST
    @Param username         : string
    @Param password         : string
    @return success / error object  : { Logged in successfully / User already exist}
    */

    getzohouser(@Body() zohocrmdto:ZohocrmDto) {
        return this.zohocrm.getzohouser(zohocrmdto);
    }


    @Public()
    @Post('/getzohocdrs')
    @postDecoraters("Get Zoho users", "zoho user")

    /*
    @Usage                  : To find agent with given credentails
    @Method                 : POST
    @Param username         : string
    @Param password         : string
    @return success / error object  : { Logged in successfully / User already exist}
    */

    getzohocdrs(@Body() zohocrmcdrsdto:ZohocrmcdrsDto) {
        return this.zohocrm.getzohocdrs(zohocrmcdrsdto);
    }



}

