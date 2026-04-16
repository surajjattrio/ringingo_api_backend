import { ApiProperty } from "@nestjs/swagger";
import { call_forward } from "../utils/extension-utils";

export class CallForwardingDto {

    @ApiProperty({default : call_forward})
    call_forward : any
}