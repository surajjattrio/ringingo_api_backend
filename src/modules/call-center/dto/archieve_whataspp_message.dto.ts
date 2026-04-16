import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsArray, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf } from "class-validator";
import { ArrayExpression } from "mongoose";


let json_data = [
     {
          "field1": "fielddata"
     }
]
export class ArchieveWhatsappMessaggeDto {

     @ApiProperty()
     @IsNotEmpty()
     from_number: string

     @ApiProperty()
     @IsOptional()
     user_uuid: string

     @ApiProperty()
     @IsOptional()
     @IsUUID()
     tenant_uuid: string

     // @ApiProperty()
     // @IsNotEmpty()
     // @IsUUID()
     @IsOptional()
     disposition_uuid: string

     @IsOptional()
     uuid: string

     @ApiProperty()
     @IsNotEmpty()
     phone_number_id: string

     @IsOptional()
     lead_management_uuid: String

     @ApiProperty()
     @IsOptional()
     note: string

     @ApiProperty( { default: json_data } )
     @IsOptional()
     message_json: ArrayExpression

     @ApiProperty()
     type: string
}

