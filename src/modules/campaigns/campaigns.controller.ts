import { Body, Controller, Get, Post } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CurrentUser } from '../../common/auth';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly service: CampaignsService) {}

  @Post()
  async create(@CurrentUser() userId: string, @Body() dto: CreateCampaignDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  async list(@CurrentUser() userId: string) {
    return this.service.findAll(userId);
  }
}
