import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessageConfigurationService } from '../services/message-configuration.service';
import { CreateMessageConfigurationDto, UpdateMessageConfigurationDto } from '../dto/message-configuration.dto';
import { JwtAuthGuard } from '../../auth/jwt_auth_guard';
import { getDecoraters, deleteDecoraters, putDecoraters, jsonDecorator } from 'src/swagger/swagger_decoraters';
import { Public } from 'src/global_constant';

@Controller("message-configuration")
@ApiTags("Message Configuration")
@UseGuards(JwtAuthGuard)
export class MessageConfigurationController {
  constructor(private readonly messageConfigurationService: MessageConfigurationService) { }

  @Public()
  @Get('test')
  test() {
    return { message: "Message Configuration Module is working!" };
  }

  @Post()
  @jsonDecorator("Message Configuration created successfully", "Create a new message configuration")
  create(@Body() createDto: CreateMessageConfigurationDto, @Req() req: any) {
    if (!createDto.tenant_uuid) {
      createDto.tenant_uuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    }
    return this.messageConfigurationService.create(createDto);
  }

  @Get()
  @getDecoraters("Retrieved all message configurations successfully", "List all message configurations")
  findAll(@Query() queryParam: any, @Req() req: any) {
    if (!queryParam.tenant_uuid) {
      queryParam.tenant_uuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    }
    return this.messageConfigurationService.findAll(queryParam);
  }

  @Get(':uuid')
  @getDecoraters("Retrieved single message configuration successfully", "Get single message configuration using uuid")
  findOne(@Param('uuid') uuid: string, @Query('tenant_uuid') tenant_uuid: string, @Req() req: any) {
    const t_uuid = tenant_uuid || req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    return this.messageConfigurationService.findOne(uuid, t_uuid);
  }

  @Patch(':uuid')
  @putDecoraters("Message Configuration updated successfully", "Update single message configuration using uuid")
  update(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateMessageConfigurationDto,
    @Req() req: any,
  ) {
    if (!updateDto.tenant_uuid) {
      updateDto.tenant_uuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    }
    return this.messageConfigurationService.update(uuid, updateDto);
  }

  @Public()
  @Post("send-message")
  @jsonDecorator("Message sent successfully", "Send message using dynamic configuration")
  sendMessage(@Body() payload: any) {
    return this.messageConfigurationService.sendMessage(payload);
  }

  @Delete(':uuid')
  @deleteDecoraters("Message Configuration deleted successfully", "Delete single message configuration using uuid")
  remove(@Param('uuid') uuid: string, @Query('tenant_uuid') tenant_uuid: string, @Req() req: any) {
    const t_uuid = tenant_uuid || req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    // Note: the service's remove doesn't take second argument, but it is fine to pass or we can omit it.
    return this.messageConfigurationService.remove(uuid);
  }
}
