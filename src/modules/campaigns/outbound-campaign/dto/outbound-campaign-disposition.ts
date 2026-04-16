import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateDispositionDto } from 'src/modules/disposition/dto/create-disposition.dto';

export class OutboundCampaignDispositionDto extends PartialType(CreateDispositionDto) {

    @ApiProperty()
    @IsUUID()
    outbound_campaign_uuid : string
}
