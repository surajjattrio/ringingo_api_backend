import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { JwtAuthGuard } from "../../auth/jwt_auth_guard";
import { SmsProviderConfigService } from "../services/sms-provider-config.service";
import { CreateSmsProviderConfigDto } from "../dto/create-sms-provider-config.dto";
import { UpdateSmsProviderConfigDto } from "../dto/update-sms-provider-config.dto";

@Controller("sms-provider-config")
@ApiTags("SMS Provider Config")
@UseGuards(JwtAuthGuard)

export class SmsProviderConfigController {

    constructor(private readonly sms_provider_config: SmsProviderConfigService) { }

    private tenantUuid(req: any): string {
        return req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    }

    @Post()
    @postDecoraters("SMS provider config created successfully", "Create a new SMS provider configuration")
    create(@Req() req: any, @Body() dto: CreateSmsProviderConfigDto) {
        return this.sms_provider_config.create(this.tenantUuid(req), dto);
    }

    @Get()
    @getDecoraters("Retrieved all SMS provider configs successfully", "List all SMS provider configurations for the current tenant")
    findAll(@Req() req: any) {
        return this.sms_provider_config.findAll(this.tenantUuid(req));
    }

    @Get(":uuid")
    @getDecoraters("Retrieved SMS provider config successfully", "Get a single SMS provider configuration")
    findOne(@Req() req: any, @Param("uuid") uuid: string) {
        return this.sms_provider_config.findOne(this.tenantUuid(req), uuid);
    }

    @Put(":uuid")
    @putDecoraters("SMS provider config updated successfully", "Update a single SMS provider configuration")
    update(@Req() req: any, @Param("uuid") uuid: string, @Body() dto: UpdateSmsProviderConfigDto) {
        return this.sms_provider_config.update(this.tenantUuid(req), uuid, dto);
    }

    @Delete(":uuid")
    @deleteDecoraters("SMS provider config deleted successfully", "Delete a single SMS provider configuration")
    remove(@Req() req: any, @Param("uuid") uuid: string) {
        return this.sms_provider_config.remove(this.tenantUuid(req), uuid);
    }
}
