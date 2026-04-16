import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { FtpDto } from "../dto/ftp.dto";
import { FtpService } from "../services/ftp.service";



@Controller("ftp")

/*@Usage : To provide title of API in swagger */
@ApiTags("Ftp")

export class FtpController {

    /*
    @Usage  : To load ftp details
    @return : Object[notes] 
    */

    constructor(private readonly ftp: FtpService) {}

    @Get()
    @getDecoraters("Retrieved all notes successfully", "List Ftp details")

    /*
    @Usage  : List Ftp details
    @Method : GET
    @return :  response code and data
    */

    findAll(@Query() queryParam) {
        return this.ftp.findAll(queryParam);
    }

    @Post("update-ftp-details")
    @postDecoraters("Ftp details updated successfully", "To update ftp details")

    /*
    @Usage                          : To update ftp details
    @Method                         : POST
    @Param password                 : string
    @return  : Ftp details updated successfully
    */

    update_ftp_details(@Body() ftpDto: FtpDto) {
        return this.ftp.update_ftp_details(ftpDto);
    }
}


