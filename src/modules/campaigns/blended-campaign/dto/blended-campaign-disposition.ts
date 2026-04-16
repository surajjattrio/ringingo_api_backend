import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateDispositionDto } from 'src/modules/disposition/dto/create-disposition.dto';

export class BlendedCampaignDispositionDto extends PartialType(CreateDispositionDto) {

    @ApiProperty()
    @IsUUID()
    blended_campaign_uuid : string
}

