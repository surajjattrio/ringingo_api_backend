import { ApiProperty } from "@nestjs/swagger";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from "class-validator";

export class CreateCdrWebhookDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUrl({ require_tld: false })
  webhook_url: string;

  @ApiProperty({ default: "cdr" })
  @IsOptional()
  @IsString()
  webhook_type: string;

  @ApiProperty({ default: "POST" })
  @IsOptional()
  @IsIn(["GET", "POST", "PUT", "PATCH"])
  method: string;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  headers: Record<string, string>;

  @ApiProperty({ default: 30000 })
  @IsOptional()
  @IsNumber()
  timeout: number;

  @ApiProperty({ default: 3 })
  @IsOptional()
  @IsNumber()
  max_retries: number;

  @ApiProperty({ default: 2000 })
  @IsOptional()
  @IsNumber()
  retry_delay: number;

  // Added to prevent whitelist stripping (see main.ts's global ValidationPipe with
  // whitelist: true) — without this, `delay` silently vanished from the request
  // body before it ever reached the controller, no error, no trace.
  @ApiProperty({ default: 120000, description: "Delivery post-delay in ms — how long to wait after the CDR is written before posting the webhook" })
  @IsOptional()
  @IsNumber()
  delay: number;

  @ApiProperty({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  bearer_token: string;

  @ApiProperty({ default: "legacy", enum: ["legacy", "ui"] })
  @IsOptional()
  @IsIn(["legacy", "ui"])
  transform_strategy: string;

  @ApiProperty({ type: Object, required: false })
  @IsOptional()
  @IsObject()
  transform_template: Record<string, any>;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  wrapInJson: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  wrapperKey: string;

  @ApiProperty({ default: "object", enum: ["object", "array"] })
  @IsOptional()
  @IsIn(["object", "array"])
  wrapperType: string;

  // Added to prevent whitelist stripping (see main.ts's global ValidationPipe with
  // whitelist: true) — same issue as `delay` above.
  @ApiProperty({ default: false, description: "Remove mapped keys whose rendered value is empty, null, or a dash from the outgoing payload" })
  @IsOptional()
  @IsBoolean()
  stripEmpty: boolean;

  @ApiProperty()
  @IsNotEmpty()
  tenant_uuid: string;
}
