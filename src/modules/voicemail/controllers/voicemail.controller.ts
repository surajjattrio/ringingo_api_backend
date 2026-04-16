import { Controller, Delete, Get, Param, Req , Res , Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters } from "src/swagger/swagger_decoraters";
import { VoicemailService } from '../services/voicemail.service';
import * as path from "path";
import { Public } from "src/global_constant";
@Controller("voicemail")

/*@Usage : To provide title of API in swagger */
@ApiTags("Voicemail")

export class VoicemailController {

    constructor(private readonly voicemail: VoicemailService) { }

    @Get()
    @getDecoraters("Retrieved all voicemail successfully", "List all voicemail")

    /*
    @Usage  : List all voicemail
    @Method : GET
    @return : Array of an object with total count of voicemail with data
    */

    findAll(@Query() queryParam ,@Req() req) {
    return this.voicemail.findAll(queryParam,req.user);
     }


    @Delete(':uuid')
    @deleteDecoraters("voicemail deleted successfully", "Delete single voicemail using uuid")

    /*
    @Usage               : Delete single voicemail using uuid
    @Method              : DELETE
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return success / error object  : { Voicemail deleted successfully / Voicemail Not found}
    */

    remove(@Param('uuid') id: string ,@Req() req ) {
        return this.voicemail.remove(id ,req.user);
    }

    @Public()
    @Get("/download/voicemail")
    @getDecoraters("To download voicemail", "Download voicemail")

    /*
    @Usage           : To download .wav file
    @Method          : POST
    @Param  filename : Name of file which need to be download
    @return success / error object  : { Fill we be sent in body / Unable to find file }
    */

    downloadWav(@Query() filename , @Res() res){
	 res.download(`${filename.voicemail}`);
    }

    @Get("voicemail-report")
    @getDecoraters("Retrieved all voicemail successfully", "List all voicemail")

    /*
    @Usage  : List all voicemail
    @Method : GET
    @return : Array of an object with total count of voicemail with data
    */

   async  findTenantExtension(@Query() queryParam) {
     return this.voicemail.getVoicemailReport(queryParam);
	//    return this.voicemail.myFun(queryParam);
    }


}
