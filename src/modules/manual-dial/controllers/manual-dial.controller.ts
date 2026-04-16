import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { CreateManualDialDto } from "../dto/create-manual-dial.dto";
import { ManualDialService } from "../services/manual-dial.service";


@Controller("manual-dial")

/*@Usage : To provide title of API in swagger */
@ApiTags("Manual Dial")
export class ManualDialController {

    /*
    @Usage  : To load manual dial service and other libraries
    @return : Object[manual_dial] 
    */

    constructor(private readonly manual_dial: ManualDialService) { }

    @Post()
    @postDecoraters("ManualDial created successfully", "Create a new ManualDial")
    /*
    @Usage                          : To create new Manual Dial
    @Method                         : POST
    @Param campaign_uuid            : string
    @Param dial_number              : number[Default 0]
    @Param campaign_type            : string
    @return success / error object  : { Manual Dial created successfully / Manual Dial already exist}
    */

    create(@Body() createManualDialDto: CreateManualDialDto) {
        return this.manual_dial.create(createManualDialDto);
    }



    
}