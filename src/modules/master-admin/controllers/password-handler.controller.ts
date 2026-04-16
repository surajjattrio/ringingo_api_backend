import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/global_constant";
import { postDecoraters } from "src/swagger/swagger_decoraters";
import { ForgotPasswordDto } from "../dto/forgot-password.dto";
import { PasswordHandlerService } from "../services/password-handler.service";
import { UpdatePasswordDto } from "../dto/update-password.dto";

@Controller("auth")

/*@Usage : To provide title of API in swagger */
@ApiTags("Reset/Change Password")

export class PasswordHandlerController {

    /*
    @Usage  : To load password handler and other libraries
    @return : Object[password_handler] 
    */

    constructor(private readonly password_handler: PasswordHandlerService) { }

    @Public()
    @Post("/forgot-password")
    @postDecoraters("Password reset successfully", "To reset a password")

    /*
    @Usage                          : To reset a password
    @Method                         : POST
    @Param email/username           : string
    @return success / error object  : { Password reset successfully / username/email not exist}
    */

    updatePassword(@Body() ForgotPasswordDto: ForgotPasswordDto) {
        return this.password_handler.getEntityDetails(ForgotPasswordDto);
    }

    @Public()
    @Post("/update-password")
    @postDecoraters("Password updated successfully", "To update a password")

    /*
    @Usage                          : To update a password
    @Method                         : POST
    @Param email/username           : string
    @return success / error object  : { Password updated successfully / username/email not exist}
    */

    create(@Body() updatePasswordDto: UpdatePasswordDto) {
        return this.password_handler.updatePassword(updatePasswordDto);
    }
}
