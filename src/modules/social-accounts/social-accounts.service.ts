import { Injectable } from '@nestjs/common';
import { query } from '../../shared/db';

@Injectable()
export class SocialAccountsService {
  async listAccounts(userId: string) {
    return query(
      `SELECT id, platform, display_name, status, token_expires_at, created_at
       FROM social_accounts
       WHERE user_id = $1
       ORDER BY created_at`,
      [userId],
    );
  }

  async listTargets(userId: string) {
    return query(
      // is_publishable/publish_note để UI disable checkbox + hiện lý do,
      // thay vì cho chọn rồi báo lỗi sau.
      `SELECT t.id, t.name, t.target_type, t.member_count, t.is_active,
              t.is_publishable, t.publish_note,
              sa.platform, sa.display_name AS account_name
       FROM targets t
       JOIN social_accounts sa ON sa.id = t.social_account_id
       WHERE sa.user_id = $1 AND t.is_active = true
       ORDER BY sa.platform, t.is_publishable DESC, t.name`,
      [userId],
    );
  }
}
