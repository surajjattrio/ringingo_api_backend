import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/global_constant";
import { JwtAuthGuard } from "../../auth/jwt_auth_guard";
import { CallFeedbackService } from "../services/call-feedback.service";
import { SubmitCallFeedbackDto } from "../dto/submit-call-feedback.dto";

@Controller("call-feedback")
@ApiTags("Call Feedback")

export class CallFeedbackController {

    constructor(private readonly call_feedback: CallFeedbackService) { }

    @Get("debug")
    @UseGuards(JwtAuthGuard)
    debug(@Req() req: any, @Query() query: { callUuid?: string; token?: string }) {
        const tenantUuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
        return this.call_feedback.debug(tenantUuid, query);
    }

    // Public — the /r/[token] page fetches this server-side, no auth.
    @Get(":token")
    @Public()
    getByToken(@Param("token") token: string, @Req() req: any) {
        return this.call_feedback.getPublicByToken(token, {
            userAgent: req.headers["user-agent"],
        });
    }

    // Public — the /r/[token] page's submit button, no auth.
    @Post(":token/submit")
    @Public()
    submit(@Param("token") token: string, @Body() dto: SubmitCallFeedbackDto, @Req() req: any) {
        return this.call_feedback.submitByToken(token, dto, {
            userAgent: req.headers["user-agent"],
        });
    }
}
