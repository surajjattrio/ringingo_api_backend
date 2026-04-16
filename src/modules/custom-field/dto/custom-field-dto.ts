import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsUUID,IsIn, IsOptional, IsNumberString, IsString, ValidateIf, Matches, IsArray } from "class-validator";

export class CustomFieldDto {

     @ApiProperty()
     @IsNumberString()
     field_rank: string


     @ApiProperty()
     @IsString()
     field_label: string


     @ApiProperty()
     @IsString()
     field_name: string

     @ApiProperty()
     @IsString()
     field_placeholder: string

     @ApiProperty( { description: "0-Text | 1-Area | 2-Select | 3-MultiSelect | 4-Radio | 5-CheckBox | 6-Date | 7-Time" } )
     @IsNumberString()
     field_type: string

     @ApiProperty()
     @IsOptional()
     @IsString()
     field_options: string



 @ApiProperty({ 
          description: "Array of Lead Group UUIDs or comma-separated string",
          type: [String],
          example: ["uuid1", "uuid2"]
     })
     @Transform(({ value }) => {
          // Handle both array and comma-separated string
          if (Array.isArray(value)) {
               return value;
          }
          if (typeof value === 'string') {
               return value.split(',').map(s => s.trim()).filter(Boolean);
          }
          return value;
     })
     @IsArray()
     @IsUUID('4', { each: true })

     lead_group_uuid: string[]

     @ApiProperty()
     @IsUUID()
     tenant_uuid: string

     @ApiProperty({description : "0 - Yes | 1 - No" , default : "0"})
     @IsString()
     @IsIn(["0","1"])
     required : string


}

