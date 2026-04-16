import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "src/global_constant";
import { postDecoraters } from "src/swagger/swagger_decoraters";
import { AgentDto } from "../dto/agent.dto";
import { AgentService } from "../services/agent.service";

@Controller("agent")

/*@Usage : To provide title of API in swagger */
@ApiTags("Agent")

export class AgentController {

    /*
    @Usage  : To load agent service and other libraries
    @return : Object[agent] 
    */

    constructor(private readonly agent : AgentService){}

    @Public()
    @Post()
    @postDecoraters("Logged in successfully", "Login")

    /*
    @Usage                  : To find agent with given credentails
    @Method                 : POST
    @Param username         : string
    @Param password         : string
    @return success / error object  : { Logged in successfully / User already exist}
    */

    getAgent(@Body() agentDto: AgentDto) {
        return this.agent.getAgent(agentDto);
    }

}
