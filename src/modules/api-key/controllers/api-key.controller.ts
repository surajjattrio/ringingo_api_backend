import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ApiKeyService } from "../services/api-key.service";
import { CreateApiKeyDto } from "../dto/create-api-key.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator } from "src/swagger/swagger_decoraters";

/*
@Usage : Admin-only routes to generate/manage the hardcoded API key stored on a tenant
         [see TokenOrApiKeyAuthGuard]. Protected by the normal JWT auth [global guard] -
         not exposed to the clients themselves. tenant_uuid can be passed explicitly
         [e.g. a master-admin managing another tenant's key] or omitted, in which case
         it defaults to the logged-in tenant's own uuid from the JWT.
*/
@Controller("api-key")
@ApiTags("Api Key")
export class ApiKeyController {

    constructor(private readonly apiKeyService: ApiKeyService) { }

    @Post()
    @jsonDecorator("API key generated successfully", "Generate the API key for a tenant")
    create(@Body() createDto: CreateApiKeyDto, @Req() req: any) {
        if (!createDto.tenant_uuid) {
            createDto.tenant_uuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
        }
        if (!createDto.tenant_uuid) {
            throw new BadRequestException("tenant_uuid is required");
        }
        return this.apiKeyService.create(createDto);
    }

    @Get(":tenant_uuid?")
    @getDecoraters("Retrieved API key successfully", "Get a tenant's current API key")
    findOne(@Param("tenant_uuid") tenant_uuid: string, @Req() req: any) {
        const t_uuid = tenant_uuid || req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
        if (!t_uuid) {
            throw new BadRequestException("tenant_uuid is required");
        }
        return this.apiKeyService.findOne(t_uuid);
    }

    @Delete(":tenant_uuid?")
    @deleteDecoraters("API key revoked successfully", "Revoke a tenant's API key")
    remove(@Param("tenant_uuid") tenant_uuid: string, @Req() req: any) {
        const t_uuid = tenant_uuid || req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
        if (!t_uuid) {
            throw new BadRequestException("tenant_uuid is required");
        }
        return this.apiKeyService.revoke(t_uuid);
    }
}
