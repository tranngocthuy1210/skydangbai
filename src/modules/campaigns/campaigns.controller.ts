import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { resolveUserId } from '../../common/current-user';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Post()
  async create(
    @Headers('x-user-id') userIdHeader: string,
    @Body() dto: CreateCampaignDto,
  ) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.create(userId, dto);
  }

  @Get()
  async list(@Headers('x-user-id') userIdHeader: string) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.findAll(userId);
  }
}
