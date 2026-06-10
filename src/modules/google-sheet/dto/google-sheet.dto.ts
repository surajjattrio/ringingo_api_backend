import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, IsNumber, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

// export class GoogleSheetRowDto {
//     row: any[];
//     sheetDate: string;
// }

export class CreateGoogleSheetDto {

    @ApiProperty({ type: [Object] })
    @IsArray()
    row: any[]

    @ApiProperty()
    @IsNotEmpty()
    @IsDateString()
    sheetDate: string

    // Mapped fields (all optional, raw string form from sheet)
    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    name?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    phone?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    amount?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    shopifyCustomerId?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    product1?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    address?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    date?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    time?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    orderPlaced?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    orderId?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    orderName?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    orderCreatedAt?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    mobileNumber?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    count?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    callingDate?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    agentName?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    finalConnected?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    finalSellingPrice?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    finalMOP?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    finalOrderPlaced?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    callingStatus?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    finalRemark?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    extraRemarks?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    orderDate?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    month?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    churnCount?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    lastCallDate?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    countType?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    orderedMonth?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    leadsMonth?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    orderStatus?: string

    @ApiProperty({ required: false, default: 'pending' })
    @IsOptional()
    @IsString()
    status?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsDateString()
    processed_at?: string

    @ApiProperty({ required: false, description: 'Unique token extracted from row to prevent duplicates' })
    @IsOptional()
    @IsString()
    token?: string

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    note?: string
}

export class FieldMappingDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    index: number;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    field: string;

    @ApiProperty({ required: false, default: 'string', enum: ['string', 'number', 'date', 'phone'] })
    @IsOptional()
    @IsString()
    type?: 'string' | 'number' | 'date' | 'phone';
}

export class GoogleSheetConfigDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    tenant_uuid: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    credential_uuid: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    user_group_uuid: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    campaign_uuid: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    lead_status: string;

    @ApiProperty({ required: false, default: 'blended', enum: ['blended', 'outbound'] })
    @IsOptional()
    @IsString()
    campaign_flag?: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    sheet_id: string;

    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    range_without_tab: string;

    @ApiProperty({ type: [FieldMappingDto], required: false })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FieldMappingDto)
    field_mappings?: FieldMappingDto[];
}