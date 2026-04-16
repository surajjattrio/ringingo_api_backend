import { Body, Controller, Post, Query, Req } from "@nestjs/common";
import { VoiceAlertService } from "../services/voice-alert.service";
import { ApiTags } from "@nestjs/swagger";
import { deleteDecoraters, getDecoraters, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";

@Controller("voice-alert")
export class VoiceAlertController {

    constructor(private readonly voice_alert: VoiceAlertService,) { }

    @Post("/")
    createVoiceAlert(@Body() body, @Req() req, @Query() queryParam) {
        return this.voice_alert.createVoiceAlert(body, req, queryParam);
    }
}
