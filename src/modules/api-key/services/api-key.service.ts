import { HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomBytes } from "crypto";
import { TenantDocument, TenantSchema } from "../../tenant/schema/tenant.schema";
import { CreateApiKeyDto } from "../dto/create-api-key.dto";

@Injectable()
export class ApiKeyService {

    constructor(
        @InjectModel(TenantSchema.name) private readonly tenantModel: Model<TenantDocument>,
    ) { }

    /*
    @Usage : Generates a random API key and stores it on the tenant's own api_key field.
             Refuses to overwrite an existing key - caller must revoke it first.
             The plaintext key is only ever returned here, at generation time.
    */
    async create(createDto: CreateApiKeyDto) {
        const tenant = await this.tenantModel.findOne({ uuid: createDto.tenant_uuid }).select({ api_key: 1 }).lean().exec();

        if (!tenant) {
            return { statusCode: HttpStatus.NOT_FOUND, message: "Tenant not found" };
        }
        if (tenant.api_key) {
            return { statusCode: HttpStatus.BAD_REQUEST, message: "API key already configured for this tenant, revoke it before generating a new one" };
        }

        const api_key = `rk_${randomBytes(32).toString("hex")}`;
        await this.tenantModel.updateOne({ uuid: createDto.tenant_uuid }, { api_key }).exec();

        return {
            statusCode: HttpStatus.CREATED,
            message: "API key generated successfully",
            data: { tenant_uuid: createDto.tenant_uuid, api_key },
        };
    }

    async findOne(tenant_uuid: string) {
        const tenant = await this.tenantModel
            .findOne({ uuid: tenant_uuid })
            .select({ uuid: 1, tenant_name: 1, api_key: 1 })
            .lean()
            .exec();

        if (!tenant) {
            return { statusCode: HttpStatus.NOT_FOUND, message: "Tenant not found" };
        }
        if (!tenant.api_key) {
            return { statusCode: HttpStatus.BAD_REQUEST, message: "No API key configured for this tenant" };
        }
        return { statusCode: HttpStatus.OK, data: tenant };
    }

    async revoke(tenant_uuid: string) {
        const tenant = await this.tenantModel.findOne({ uuid: tenant_uuid }).select({ api_key: 1 }).lean().exec();

        if (!tenant) {
            return { statusCode: HttpStatus.NOT_FOUND, message: "Tenant not found" };
        }
        if (!tenant.api_key) {
            return { statusCode: HttpStatus.BAD_REQUEST, message: "No API key configured for this tenant" };
        }

        await this.tenantModel.updateOne({ uuid: tenant_uuid }, { $unset: { api_key: "" } }).exec();
        return { statusCode: HttpStatus.OK, message: "API key revoked successfully" };
    }
}
