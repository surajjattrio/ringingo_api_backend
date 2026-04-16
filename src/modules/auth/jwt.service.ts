import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JWTService {

constructor( private readonly jwt : JwtService ){}  

    /*
    @Usage : To generate JWT Token.
    @Param   userPayload : object
    @return  JWT Token
    */
    generateToken(payload){
        Logger.debug("Authentication passed , generated JWT Token..\n"); 
        return this.jwt.sign(payload);
    }
}