import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TenantDocument, TenantSchema } from "../tenant/schema/tenant.schema";

/*
@Usage : Guard for endpoints that accept EITHER auth mode:
         - If an "Authorization: Bearer <token>" header is present, it MUST be a valid JWT
           [same secret as the normal login flow] - request.user is set from its payload.
         - Else, if an "x-api-key" header is present, it is looked up against the
           tenant.api_key field - request.tenant_uuid is set from the matching tenant.
         - Else the request is rejected.
         Used on routes marked @Public() [to skip the global JwtAuthGuard] so both
         paths can be evaluated here instead of forcing JWT-only.
*/
@Injectable()
export class TokenOrApiKeyAuthGuard implements CanActivate {

    constructor(
        private readonly jwtService: JwtService,
        @InjectModel(TenantSchema.name) private readonly tenantModel: Model<TenantDocument>
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader: string | undefined = request.headers['authorization'];

        if (authHeader) {
            const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
            try {
                request.user = this.jwtService.verify(token, { secret: process.env.SECRET_KEY });
                return true;
            } catch (err) {
                throw new UnauthorizedException('Invalid or expired token');
            }
        }

        const apiKey = request.headers['x-api-key'];
        if (apiKey) {
            const tenant = await this.tenantModel.findOne({ api_key: apiKey }).lean().exec();
            if (!tenant) {
                throw new UnauthorizedException('Invalid API key');
            }
            request.tenant_uuid = tenant.uuid;
            return true;
        }

        throw new UnauthorizedException('Provide either a Bearer token or an x-api-key header');
    }
}
