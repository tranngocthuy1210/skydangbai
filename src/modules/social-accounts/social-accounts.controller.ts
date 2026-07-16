import { Controller, Get, Headers } from '@nestjs/common';
import { SocialAccountsService } from './social-accounts.service';
import { resolveUserId } from '../../common/current-user';

@Controller()
export class SocialAccountsController {
  constructor(private readonly service: SocialAccountsService) {}

  @Get('social-accounts')
  async accounts(@Headers('x-user-id') userIdHeader: string) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.listAccounts(userId);
  }

  @Get('targets')
  async targets(@Headers('x-user-id') userIdHeader: string) {
    const userId = await resolveUserId(userIdHeader);
    return this.service.listTargets(userId);
  }
}
