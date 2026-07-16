import { BadRequestException, Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { query, withTransaction } from '../../shared/db';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class CampaignsService {
  constructor(private readonly ai: AiService) {}

  async create(userId: string, dto: CreateCampaignDto) {
    // Xác thực target thuộc về user (qua social_accounts).
    const targets = await query<{ id: string; name: string; is_publishable: boolean; publish_note: string | null }>(
      `SELECT t.id, t.name, t.is_publishable, t.publish_note
       FROM targets t
       JOIN social_accounts sa ON sa.id = t.social_account_id
       WHERE sa.user_id = $1 AND t.id = ANY($2::uuid[])`,
      [userId, dto.targetIds],
    );
    if (targets.length !== dto.targetIds.length) {
      throw new BadRequestException('Một số target không tồn tại hoặc không thuộc về bạn');
    }

    // Official API only: từ chối ngay lúc tạo, không tạo post rồi để worker
    // skip lúc 20h — user phải biết ngay khi bấm nút.
    const blocked = targets.filter((t) => !t.is_publishable);
    if (blocked.length > 0) {
      throw new BadRequestException({
        message: 'Một số mục tiêu không đăng được qua API chính thức',
        blockedTargets: blocked.map((t) => ({
          id: t.id,
          name: t.name,
          reason: t.publish_note ?? 'Nền tảng không cung cấp API đăng bài cho mục tiêu này.',
        })),
      });
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : new Date();

    // === Bước AI (gọi API MẠNG — thực hiện NGOÀI transaction) ===
    // 1. Hashtag: dùng của user; nếu bật spin mà chưa có thì nhờ AI gợi ý.
    let hashtags = dto.hashtags ?? [];
    if (dto.aiSpin && hashtags.length === 0) {
      hashtags = await this.ai.suggestHashtags(dto.content);
    }
    // 2. Spin nội dung: mỗi target 1 biến thể riêng (chống trùng lặp).
    const variants = dto.aiSpin
      ? await this.ai.spinContent(dto.content, dto.targetIds.length)
      : null;

    const tagSuffix = hashtags.length
      ? '\n\n' + hashtags.map((h) => `#${h.replace(/^#/, '')}`).join(' ')
      : '';

    return withTransaction(async (client) => {
      // Tạo campaign.
      const { rows: campRows } = await client.query(
        `INSERT INTO campaigns
          (user_id, name, content_template, media_urls, hashtags,
           schedule_type, ai_spin_enabled, status)
         VALUES ($1,$2,$3,$4,$5,'once',$6,'scheduled')
         RETURNING id`,
        [userId, dto.name, dto.content, dto.mediaUrls ?? null, hashtags, dto.aiSpin ?? false],
      );
      const campaignId = campRows[0].id;

      // Sinh 1 post cho mỗi target.
      const created: string[] = [];
      for (let i = 0; i < dto.targetIds.length; i++) {
        const targetId = dto.targetIds[i];
        const baseText = variants ? variants[i] : dto.content;
        const content = `${baseText}${tagSuffix}`;
        const idempotencyKey = crypto
          .createHash('sha256')
          .update(`${campaignId}:${targetId}`)
          .digest('hex')
          .slice(0, 40);

        const { rows: postRows } = await client.query(
          `INSERT INTO posts
            (campaign_id, target_id, content, media_urls, scheduled_at,
             status, idempotency_key)
           VALUES ($1,$2,$3,$4,$5,'scheduled',$6)
           RETURNING id`,
          [campaignId, targetId, content, dto.mediaUrls ?? null, scheduledAt, idempotencyKey],
        );
        created.push(postRows[0].id);
      }

      return {
        campaignId,
        postsCreated: created.length,
        aiSpin: dto.aiSpin ?? false,
        hashtags,
        scheduledAt,
        message: 'Đã lên lịch. Feeder sẽ nạp vào queue khi đến giờ.',
      };
    });
  }

  async findAll(userId: string) {
    return query(
      `SELECT c.id, c.name, c.status, c.schedule_type, c.ai_spin_enabled, c.created_at,
              COUNT(p.id)::int AS total_posts,
              COUNT(p.id) FILTER (WHERE p.status='success')::int AS success,
              COUNT(p.id) FILTER (WHERE p.status='failed')::int  AS failed,
              COUNT(p.id) FILTER (WHERE p.status='skipped')::int AS skipped
       FROM campaigns c
       LEFT JOIN posts p ON p.campaign_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [userId],
    );
  }
}
