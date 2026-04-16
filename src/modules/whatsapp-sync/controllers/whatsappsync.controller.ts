
import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PatchDto } from "src/modules/common/dto/patch.dto";
import { deleteDecoraters, getDecoraters, jsonDecorator, postDecoraters, putDecoraters } from "src/swagger/swagger_decoraters";
import { WhatsappsyncService } from '../services/whatsappsync.service';
import { Response } from "express";
import { Public } from "src/global_constant";

@Controller("whatsappsync")

/*@Usage : To provide title of API in swagger */
@ApiTags("Whatsappsync")

export class WhatsappsyncController {

    private readonly VERIFY_TOKEN = "my_secret_verify_token_123";

    constructor(private readonly whatsappsync: WhatsappsyncService) { }

    // @Post()
    // @jsonDecorator( "Whatsappsync created successfully", "Create a new Whatsappsync" )

    // /*
    // @Usage                          : To create new Whatsappsync
    // @Method                         : POST
    // @Param name                     : string
    // @return success / error object  : { Whatsappsync created successfully / Whatsappsync already exist}
    // */

    // create ( @Body() createWhatsappsyncDto: CreateWhatsappsyncDto ) {
    //     return this.whatsappsync.create( createWhatsappsyncDto );
    // }


    @Public()
    @Post()
    @postDecoraters("Whatsappsync created successfully", "Create a new Whatsappsync")

    /*
   @Usage                          : To create new Whatsappsync
   @Method                         : POST
   @Param name                     : string
   @return success / error object  : { Whatsappsync created successfully / Whatsappsync already exist}
   */

    create(@Body() body: any, @Param() params: any, @Query() query: any) {
        console.log("NEW body");
        console.log("NEW params", params);
        console.log("NEW query", query);
        console.log("📩 Received webhook POSTTTT:", JSON.stringify(body, null, 2));
        const parsedBpdy = JSON.stringify(body, null, 2);


        console.log("parsedBpdy", parsedBpdy);
        // console.dir( body, { depth : null} );
        console.log(body);
        return this.whatsappsync.create(body);
    }

    @Public()
    @Get()
    verifyWebhook(
        @Query('hub.mode') mode: string,
        @Query('hub.verify_token') token: string,
        @Query('hub.challenge') challenge: string,
        @Res() res: Response, // Express response
    ) {
        console.log("Getting int othe verifyWebhook", mode, token, challenge);
        if (mode === 'subscribe' && token === this.VERIFY_TOKEN) {
            console.log('Webhook verified! Sending challenge:', challenge);
            res.status(200).type('text/plain').send(challenge); // Send as plain text
            return
        }

        console.log('Webhook verification failed. Mode:', mode, 'Token:', token);
        res.status(403).send('Forbidden');
    }

    // @Public()
    // @Post()
    // receiveWebhook(@Body() body: any, @Res() res: Response) {
    //   console.log("📩 Received webhook POST:", JSON.stringify(body, null, 2));

    //   // Optional: Save to DB / call service
    //   // this.whatsappsync.create(body);

    //   // Always return 200 to acknowledge Meta
    //   return res.status(200).send('EVENT_RECEIVED');
    // }
}
