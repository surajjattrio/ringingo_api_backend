import { Body, Controller, Get, Param, Post, Query, Req, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters } from "src/swagger/swagger_decoraters";
import { UserPerformanceReportService } from "../services/user-performance-report.service";

@Controller("user-performance-report")

/*@Usage : To provide title of API in swagger */
@ApiTags("User Performance Report")

export class UserPerformanceReportController {

    /*
    @Usage  : To load user performance report service and other libraries
    @return : Object[cdrs]
    */

    constructor(private readonly user_performance_report: UserPerformanceReportService) { }

     @Get()
     @getDecoraters( "Retrieved all user performance report successfully", "List all user performance report" )

    /*
    @Usage  : List all user performance report
    @Method : GET
    @return : Array of an object with total count of user performance report with data
    */

    findAll ( @Query() queryParam ) {
       return this.user_performance_report.findAll( queryParam );
    }

    @Get(':user_uuid')
    @getDecoraters("Disposition Count successfully", "Disposition Count")


    /*
    @Usage                          : Disposition Count
    @Method                         : POST
    @Param count                    : string
    @Param disposition_count        : string
    @return success / error object  : { Disposition Count successfully / Disposition Count already exist}
    */

    fetchDispositionsDetails(@Param('user_uuid', new ParseUUIDPipe({ version: '4' })) id: string, @Query() queryParams) {
        queryParams["id"] = id;
        return this.user_performance_report.fetchDispositionsDetails(queryParams);
    }

    @Post("/user-performance-report-search")
    @postDecoraters("Retrieved user performance report successfully", "search for single or multiple filed")

    /*
    @Usage             : To search user performance report
    @Method            : POST
    @Param             : Single or multiple parameters
    @return Object     : Array of an object with total count of user performance report with data
    */

    getUserPerfomanceWiseReport(@Body() searchedData) {
        return this.user_performance_report.getUserPerfomanceWiseReport(searchedData);
    }

}

