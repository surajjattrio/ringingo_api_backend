import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { CommonDBFunctions } from "src/modules/common/common_db_functions";
import { CreateMailScheduleDto, UpdateMailScheduleDto, ListMailScheduleDto } from "./dto/mail-schedule.dto";
import { MailScheduleDocument, MailScheduleSchema } from "./schema/mail-schedule.schema";

@Injectable()
export class MailScheduleService {

    constructor(
        @InjectModel(MailScheduleSchema.name) private readonly mailSchedule: Model<MailScheduleDocument>,
        private readonly commonDbFn: CommonDBFunctions
    ) { }

    async create(createDto: any) {
        createDto.user_uuid = createDto.uuid || createDto.tenant_uuid;

        let logMessages = {
            logSuccessMsg: "Mail Schedule created successfully \n"
        }
        return this.commonDbFn.insert(this.mailSchedule, createDto, JSON.stringify(logMessages));
    }

    async findAll(queryParams: any) {
        return this.commonDbFn.findAllWithPagination(this.mailSchedule, queryParams, "", [], "", false);
    }

    async findOne(uuid: string) {
        let result = await this.mailSchedule.findOne({ uuid }, { _id: 0 }).exec();
        return this.commonDbFn.sendResponseWithMessage(HttpStatus.OK, result);
    }

    async update(uuid: string, updateDto: UpdateMailScheduleDto) {
        let logMessages = {
            logSuccessMsg: "Mail Schedule updated successfully \n"
        }
	 if (updateDto.timing) {
            (updateDto as any).mail_status = "pending";
            (updateDto as any).last_sent_date = "";
            (updateDto as any).last_sent_time = "";
        }
        return this.commonDbFn.update(this.mailSchedule, uuid, updateDto, JSON.stringify(logMessages));
    }

    async remove(uuid: string) {
        let condition = { uuid };
        let logMessages = {
            logSuccessMsg: "Mail Schedule deleted successfully \n"
        }
        return this.commonDbFn.delete(this.mailSchedule, condition, JSON.stringify(logMessages));
    }

    async updateStatus(updateDto: any) {
        let condition = { uuid: Array.isArray(updateDto.uuid) ? updateDto.uuid.join(',') : updateDto.uuid };
        let payload = { status: updateDto.status };
        let logMessages = {
            logSuccessMsg: "Mail Schedule status updated successfully \n"
        }
        return this.commonDbFn.updateByStatus(this.mailSchedule, condition, payload, JSON.stringify(logMessages));
    }

    async removeMultiple(ids: string) {
        let condition = { uuid: ids }; // CommonDbFunctions.delete natively supports comma-separated ids
        let logMessages = {
            logSuccessMsg: "Mail Schedules deleted successfully \n"
        }
        return this.commonDbFn.delete(this.mailSchedule, condition, JSON.stringify(logMessages));
    }
}
