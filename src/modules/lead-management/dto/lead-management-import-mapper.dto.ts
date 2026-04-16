import { ApiProperty, PickType } from "@nestjs/swagger";
import { LeadManagementImportDto } from "./lead-management-import.dto";
import { IsNotEmpty } from "class-validator";

let mapper_keys = {
    first_name: "0",
    last_name: "1",
    address: "2",
    city: "3",
    state: "4",
    province: "5",
    postcal_code : "6",
    dob : "7",
    phone_code : "8",
    phone_number : "9",
    alternate_phone_number : "10",
    email : "11",
    lead_status : "12",
    gender : "13",
    description : "14"
}
export class LeadManagementImportMapperDto extends PickType(LeadManagementImportDto, ['lead_group_uuid', 'file', 'tenant_uuid', 'filter_by', 'phone_code', 'custom_fields', 'manager_uuid'] as const) {

    @ApiProperty()
    @IsNotEmpty()
    mapper_keys: Object

    @ApiProperty()
    custom_fields: any
}
