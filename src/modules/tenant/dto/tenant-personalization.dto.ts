import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsNumberString, IsUUID, IsOptional, ValidateIf } from "class-validator";

export class TenantPersonalizationDto {

     @ApiProperty()
     tenant_uuid: string

     @ApiProperty()
     expandedfile: any

     @ApiProperty()
     collapsedfile: any

     @ApiProperty()
     faviconfile: any

     @IsOptional()
     uuid: string

     @ApiProperty()
     title: string

     @ApiProperty()
     tenant_domain: string

     @ApiProperty()
     footer: string
}

