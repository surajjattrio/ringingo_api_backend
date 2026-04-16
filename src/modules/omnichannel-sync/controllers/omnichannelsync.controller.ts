import { Body, Controller, Get, Param, Post, Query, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { Public } from "src/global_constant";
import { OmnichannelsyncService } from "../services/omnichannelsync.service";
import { jsonDecorator } from "src/swagger/swagger_decoraters";

@Controller("omnichannelsync")
@ApiTags("OmnichannelSync")
export class OmnichannelsyncController {
  constructor(private readonly omnichannelsync: OmnichannelsyncService) { }

  /**
   * ========================================
   * ✅ DYNAMIC WEBHOOK VERIFICATION
   * Supports: Instagram, WhatsApp, etc.
   * Example:
   * GET /omnichannelsync/webhook/instagram
   * GET /omnichannelsync/webhook/whatsapp
   * ========================================
   */
  @Public()
  @Get("webhook/:channel")
  async verifyWebhook(
    @Param("channel") channel: string,
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") verifyToken: string,
    @Query("hub.challenge") challenge: string,
    @Res() res: Response
  ) {
    console.log(`📞 Webhook verification request for: ${channel}`, { mode, verifyToken });

    if (mode !== "subscribe") {
      return res.status(403).send("Forbidden");
    }

    // ✅ Lookup matching messaging channel
    const channelDoc = await this.omnichannelsync.findChannel(channel);
    if (!channelDoc) {
      console.log(`❌ No channel found in DB for type: ${channel}`);
      return res.status(403).send("Forbidden");
    }

    // ✅ Compare with stored token
    if (verifyToken !== channelDoc.customFields.verify_token) {
      console.log(`❌ Token mismatch for channel: ${channel}`);
      return res.status(403).send("Forbidden");
    }

    console.log(`✅ Webhook verified for channel: ${channel}`);
    return res.status(200).type("text/plain").send(challenge);
  }

  /**
   * ========================================
   * ✅ DYNAMIC WEBHOOK EVENT RECEIVER
   * Supports: Instagram, WhatsApp
   * Example:
   * POST /omnichannelsync/webhook/instagram
   * POST /omnichannelsync/webhook/whatsapp
   * ========================================
   */
  @Public()
  @Post("webhook/:channel")
  async receiveWebhook(
    @Param("channel") channel: string,
    @Body() body: any,
    @Res() res: Response
  ) {
    console.log(`📨 Incoming webhook for: ${channel}`);
    console.log(JSON.stringify(body, null, 2));

    try {
      // Process asynchronously
      setImmediate(async () => {
        await this.omnichannelsync.handleWebhook(channel, body);
      });

      // Always ACK to Meta
      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error(`❌ Error processing webhook for ${channel}:`, error);
      return res.status(200).send("EVENT_RECEIVED");
    }
  }

  @Post("read_unreadsection")
  @jsonDecorator("WhatsappMessage created successfully", "Create a new WhatsappMessage")

  /*
  @Usage                          : To create new send WhatsappMessage
  @Method                         : POST
  @Param name                     : string
  @return success / error object  : { Whatsappmessage created successfully / Whatsappmessage already exist}
  */

  unreadsection(@Body() queryParam) {
    return this.omnichannelsync.unreadsection(queryParam);
  }
}