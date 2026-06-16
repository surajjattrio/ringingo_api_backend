import { Body, Controller, Get, Param, Post, Put, Delete, Query, ParseUUIDPipe, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters, postDecoraters, putDecoraters, deleteDecoraters } from "src/swagger/swagger_decoraters";
import { CreateMailScheduleDto, UpdateMailScheduleDto, ListMailScheduleDto } from "./dto/mail-schedule.dto";
import { MailScheduleService } from "./mail-schedule.service";

@Controller("mail-schedule")
@ApiTags("Mail Schedule")
export class MailScheduleController {

    constructor(private readonly mailScheduleService: MailScheduleService) { }

    @Post()
    @postDecoraters("Mail Schedule created successfully", "Create a new Mail Schedule")
    create(@Req() req: any, @Body() createDto: any) {
        createDto.tenant_uuid = req?.user?.tenant_uuid || req?.user?.uuid || '';
        return this.mailScheduleService.create(createDto);
    }

    @Get()
    @getDecoraters("Retrieved all mail schedules successfully", "List all Mail Schedules")
    findAll(@Req() req: any, @Query() queryParam: any) {
        queryParam.tenant_uuid = req?.user?.tenant_uuid || req?.user?.uuid || '';
        return this.mailScheduleService.findAll(queryParam);
    }

    @Get(':uuid')
    @getDecoraters("Retrieved mail schedule successfully", "Get single mail schedule by uuid")
    findOne(@Param('uuid') uuid: string) {
        return this.mailScheduleService.findOne(uuid);
    }

    @Put(':uuid')
    @putDecoraters("Mail Schedule updated successfully", "Update Mail Schedule by uuid")
    update(@Param('uuid') uuid: string, @Body() updateDto: UpdateMailScheduleDto) {
        return this.mailScheduleService.update(uuid, updateDto);
    }

    @Delete(':uuid')
    @deleteDecoraters("Mail Schedule deleted successfully", "Delete single mail schedule by uuid")
    remove(@Param('uuid') uuid: string) {
        return this.mailScheduleService.remove(uuid);
    }

    @Put('status/update')
    @putDecoraters("Mail Schedule status updated successfully", "Update status of multiple mail schedules")
    updateStatus(@Body() updateDto: any) {
        return this.mailScheduleService.updateStatus(updateDto);
    }

    @Delete('multiple/delete')
    @deleteDecoraters("Mail Schedules deleted successfully", "Delete multiple mail schedules")
    removeMultiple(@Body('uuid') uuid: string) {
        return this.mailScheduleService.removeMultiple(uuid);
    }
}
