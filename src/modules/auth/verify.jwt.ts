import { Injectable, Logger } from "@nestjs/common";
import { Strategy, ExtractJwt } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";

@Injectable()
export class VerifyJWT extends PassportStrategy(Strategy) {

    /*
    @Usage : To verify JWT Token[It automatically extract JWT token from headers].
    @return  JWT Token
    */
    constructor() {

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.SECRET_KEY,
        })
    }

    /*
    @Usage : Once token verified and token was correct this function invoke and send user info in the decoded form to the requested route.
    @Param   payload : object
    @return  Decoded Information of user[Which was stored into token]
    */
    validate(payload: any) { Logger.debug("Token verified : OK \n"); return payload; }
}
