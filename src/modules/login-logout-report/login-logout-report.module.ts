import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginlogoutreportController } from './controllers/login-logout-report.controller';
import { LoginlogoutreportService } from './services/login-logout-report.service';
import { AgentLoginLogoutSchema, agentLoginLogoutSchema } from '../call-center/schema/agent-login-logout.schema';
import { BreakcodeSchema, breakcodeSchema } from '../breakcode/schema/breakcode.schema';


@Module( {
     imports: [ MongooseModule.forFeature(
          [
               { name: AgentLoginLogoutSchema.name, schema: agentLoginLogoutSchema },
               { name: BreakcodeSchema.name, schema: breakcodeSchema },
          ]
     ) ],
     providers: [ LoginlogoutreportService ],
     controllers: [ LoginlogoutreportController ]
} )
export class LoginlogoutreportModule { }

