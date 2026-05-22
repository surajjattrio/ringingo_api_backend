import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { getDecoraters } from "src/swagger/swagger_decoraters";
import { Request as ExpressRequest } from "express";
import { InboundCallDebugService } from "./inbound-call-debug.service";

@Controller( "inbound-call-debug" )
@ApiTags( "Inbound Call Debug" )
export class InboundCallDebugController {
    constructor( private readonly inboundCallDebug: InboundCallDebugService ) {}

    @Get( "snapshot" )
    @getDecoraters( "Inbound call debug snapshot", "Aggregate Mongo + FreeSWITCH callcenter + SIP state for troubleshooting" )
    async snapshot (
        @Req() req: ExpressRequest,
        @Query( "campaign_uuid" ) campaign_uuid: string,
        @Query( "extension" ) extension?: string,
        @Query( "user_uuid" ) user_uuid?: string,
        @Query( "call_queue_uuid" ) call_queue_uuid?: string,
    ) {
        const user: any = ( req as any ).user;
        const tenant_uuid = user?.uuid;
        if ( !tenant_uuid ) {
            return { statusCode: 403, message: "tenant_uuid missing on session" };
        }
        if ( !campaign_uuid ) {
            return { statusCode: 400, message: "campaign_uuid is required" };
        }
        if ( !extension && !user_uuid ) {
            return { statusCode: 400, message: "extension or user_uuid is required" };
        }
        const data = await this.inboundCallDebug.getSnapshot( tenant_uuid, {
            campaign_uuid,
            extension,
            user_uuid,
            call_queue_uuid,
        } );
        return { statusCode: 200, data };
    }

    @Get( "form-options" )
    @getDecoraters( "Inbound call debug form options", "Fetch campaigns, extensions, users, and queues for dropdown selectors" )
    async formOptions (
        @Req() req: ExpressRequest,
        @Query( "campaign_uuid" ) campaign_uuid?: string,
    ) {
        const user: any = ( req as any ).user;
        const tenant_uuid = user?.uuid;
        if ( !tenant_uuid ) {
            return { statusCode: 403, message: "tenant_uuid missing on session" };
        }
        const data = await this.inboundCallDebug.getFormOptions( tenant_uuid, {
            campaign_uuid,
        } );
        return { statusCode: 200, data };
    }
}
