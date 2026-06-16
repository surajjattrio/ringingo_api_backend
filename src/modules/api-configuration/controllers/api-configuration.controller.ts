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
import { ApiConfigurationService } from '../services/api-configuration.service';
import { CreateApiConfigurationDto, UpdateApiConfigurationDto } from '../dto/api-configuration.dto';
import { JwtAuthGuard } from '../../auth/jwt_auth_guard';
import { getDecoraters, deleteDecoraters, putDecoraters, jsonDecorator } from 'src/swagger/swagger_decoraters';
import { Public } from 'src/global_constant';

@Controller("api-configuration")
@ApiTags("Api Configuration")
@UseGuards(JwtAuthGuard)
export class ApiConfigurationController {
  constructor(private readonly apiConfigurationService: ApiConfigurationService) { }

  @Public()
  @Get('test')
  test() {
    return { message: "API Configuration Module is working!" };
  }

  @Post()
  @jsonDecorator("API Configuration created successfully", "Create a new API configuration")
  create(@Body() createDto: CreateApiConfigurationDto, @Req() req: any) {
    // Ensuring tenant_uuid is taken from req.user if not already in body
    if (!createDto.tenant_uuid) {
      createDto.tenant_uuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    }
    return this.apiConfigurationService.create(createDto);
  }

  @Get()
  @getDecoraters("Retrieved all API configurations successfully", "List all API configurations")
  findAll(@Query() queryParam: any, @Req() req: any) {
    if (!queryParam.tenant_uuid) {
      queryParam.tenant_uuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    }
    return this.apiConfigurationService.findAll(queryParam);
  }

  @Get(':uuid')
  @getDecoraters("Retrieved single API configuration successfully", "Get single API configuration using uuid")
  findOne(@Param('uuid') uuid: string, @Query('tenant_uuid') tenant_uuid: string, @Req() req: any) {
    const t_uuid = tenant_uuid || req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    return this.apiConfigurationService.findOne(uuid, t_uuid);
  }

  @Patch(':uuid')
  @putDecoraters("API Configuration updated successfully", "Update single API configuration using uuid")
  update(
    @Param('uuid') uuid: string,
    @Body() updateDto: UpdateApiConfigurationDto,
    @Req() req: any,
  ) {
    if (!updateDto.tenant_uuid) {
      updateDto.tenant_uuid = req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    }
    return this.apiConfigurationService.update(uuid, updateDto);
  }

  @Public()
  @Post("send-email")
  @jsonDecorator("Email sent successfully", "Send email using Netcore API")
  sendEmail(@Body() payload: any) {
    return this.apiConfigurationService.sendEmail(payload);
  }

  @Delete(':uuid')
  @deleteDecoraters("API Configuration deleted successfully", "Delete single API configuration using uuid")
  remove(@Param('uuid') uuid: string, @Query('tenant_uuid') tenant_uuid: string, @Req() req: any) {
    const t_uuid = tenant_uuid || req.user?.parent_uuid || req.user?.tenant_uuid || req.user?.uuid;
    return this.apiConfigurationService.remove(uuid, t_uuid);
  }
}
