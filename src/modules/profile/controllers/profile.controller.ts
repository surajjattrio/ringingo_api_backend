import { Body, Controller, Post , Get , Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { postDecoraters , getDecoraters } from "src/swagger/swagger_decoraters";
import { ChangePasswordDto } from "../dto/change-password.dto";
import { ProfileService } from "../services/profile.service";
import { WebHookDto } from "../dto/web-hook.dto";

@Controller("profile")

/*@Usage : To provide title of API in swagger */
@ApiTags("Profile")

export class ProfileController {

    constructor(private readonly profile : ProfileService) { }

    @Post("change-password")
    @postDecoraters("Password updated successfully", "To update password")

    /*
    @Usage                          : To create new tenant
    @Method                         : POST
    @Param password                 : string
    @return success / error object  : { Password updated successfully / User not found }
    */

    changePassword(@Body() changePasswordDto: ChangePasswordDto) {
        return this.profile.changePassword(changePasswordDto);
    }

    @Post("web-hook")
    @postDecoraters("Password updated successfully", "To update password")

    /*
    @Usage                          : To add web hook
    @Method                         : POST
    @Param password                 : string
    @return success / error object  : { Web hook added successfully }
    */

    addWebHookDetails(@Body() webHookDto: WebHookDto) {
        return this.profile.addWebHookDetails(webHookDto);
    }

    @Get('/web-hook/:uuid')
    @getDecoraters("To fetch web hook", "List single web hook using uuid")

    /*
    @Usage               : List single web hook using uuid
    @Method              : GET
    @Param  uuid         : string
    @Param ParseUUIDPipe : To validate uuid
    @return object       : Full detail of particular uuid web hook
    */

    findOne(@Param('uuid', new ParseUUIDPipe({ version: '4' })) id: string) {
        return this.profile.getWebHookDetails(id);
    }
}
