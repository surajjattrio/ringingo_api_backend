import { Body, Controller, Get, HttpException, HttpStatus, Post, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { RecordingsService } from "../services/recordings.service";
import { Public } from "src/global_constant";

@Controller("recordings")

/*@Usage : To provide title of API in swagger */
@ApiTags("Recordings")

export class RecordingsController {

    /*
    @Usage  : To load recordings service and other libraries
    @return : Object[recording] 
    */

    constructor(
        private readonly recordings: RecordingsService
    ) { }

    @Post("/advanced-search")
    @postDecoraters("Retrieved recordings successfully", "Advanced search for single or multiple filed")

    /*
    @Usage             : To search recordings
    @Method            : POST
    @Param domain      : Single or multiple parameters
    @return Object     : Array of an object with total count of recordings with data
    */

    advancedSearch(@Body() searchData) {
        return this.recordings.advancedSearch(searchData);
    }

    @Get()
    @getDecoraters("Retrieved all recordings successfully", "List all recordings")

    /*
    @Usage  : List all recordings
    @Method : GET
    @return : Array of an object with total count of recordings with data
    */

    findAll(@Query() queryParam) {
        return this.recordings.findAll(queryParam);
    }

    @Public()
    @Get("/download/recording")
    @getDecoraters("To download voicemail", "Download voicemail")

    /*
    @Usage           : To download .wav file
    @Method          : POST
    @Param  filename : Name of file which need to be download
    @return success / error object  : { Fill we be sent in body / Unable to find file }
    */

    downloadWav(@Query() filename, @Res() res) {
        res.download(`${filename.recording}`);
    }

    /* 
    @Usage   : Download all recordings using the same filter rules of advanced-search
    @Method  : POST
    @Body    : Same object as advanced-search
    @Return  : ZIP file
    */
    @Public()
    @Post("/download/advanced-search")
    @postDecoraters("Download recordings ZIP", "Download all recordings returned by advanced search filters")
    async downloadByAdvancedSearch(
        @Body() searchData,
        @Res() res
    ) {
        return this.recordings.downloadByAdvancedSearch(searchData, res);
    }

}
