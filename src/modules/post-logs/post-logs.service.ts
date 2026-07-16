import { Injectable, NotFoundException } from '@nestjs/common';
import { query } from '../../shared/db';

export interface LogFilter {
  status?: string;
  platform?: string;
  from?: string; // ISO
  to?: string; // ISO
  limit?: number;
  offset?: number;
}

@Injectable()
export class PostLogsService {
  async list(userId: string, f: LogFilter) {
    const where: string[] = ['user_id = $1'];
    const params: any[] = [userId];

    if (f.status) {
      params.push(f.status);
      where.push(`status = $${params.length}`);
    }
    if (f.platform) {
      params.push(f.platform);
      where.push(`platform = $${params.length}`);
    }
    if (f.from) {
      params.push(f.from);
      where.push(`created_at >= $${params.length}`);
    }
    if (f.to) {
      params.push(f.to);
      where.push(`created_at <= $${params.length}`);
    }

    const limit = Math.min(f.limit ?? 50, 200);
    const offset = f.offset ?? 0;
    params.push(limit, offset);

    const rows = await query(
      `SELECT id, post_id, platform, attempt_number, status, error_code,
              error_message, http_status, duration_ms, created_at
       FROM post_logs
       WHERE ${where.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return rows;
  }

  // Timeline chi tiết 1 bài, cho trang /logs/:postId.
  // Trả kèm request/response thô — nơi đội support sống khi khách gửi ticket.
  async detail(userId: string, postId: string) {
    const [post] = await query(
      `SELECT p.id, p.content, p.status, p.status_reason, p.scheduled_at,
              p.published_at, p.permalink, p.platform_post_id, p.retry_count,
              t.name AS target_name, t.target_type,
              sa.platform, sa.display_name AS account_name,
              c.id AS campaign_id, c.name AS campaign_name
       FROM posts p
       JOIN targets t          ON t.id = p.target_id
       JOIN social_accounts sa ON sa.id = t.social_account_id
       JOIN campaigns c        ON c.id = p.campaign_id
       WHERE p.id = $1 AND c.user_id = $2`,
      [postId, userId],
    );
    if (!post) throw new NotFoundException('Không tìm thấy bài viết này');

    const timeline = await query(
      `SELECT id, attempt_number, status, error_code, error_message,
              http_status, duration_ms, worker_id,
              request_payload, response_body, created_at
       FROM post_logs
       WHERE post_id = $1 AND user_id = $2
       ORDER BY created_at ASC`,
      [postId, userId],
    );
    return { post, timeline };
  }

  // Summary cards cho đầu trang Post Logs.
  async summary(userId: string, from?: string) {
    const params: any[] = [userId];
    let timeClause = '';
    if (from) {
      params.push(from);
      timeClause = `AND created_at >= $2`;
    }
    const [row] = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status='success')::int  AS success,
         COUNT(*) FILTER (WHERE status='failed')::int   AS failed,
         COUNT(*) FILTER (WHERE status='retrying')::int AS retrying,
         COUNT(*) FILTER (WHERE status='skipped')::int  AS skipped,
         COUNT(*)::int AS total
       FROM post_logs
       WHERE user_id = $1 ${timeClause}`,
      params,
    );
    // Mẫu số chỉ gồm kết cục cuối (success + failed). 'retrying' là bước trung
    // gian và 'skipped' không phải lỗi hệ thống — tính vào sẽ làm tỷ lệ sai.
    const settled = (row.success || 0) + (row.failed || 0);
    const successRate = settled ? Math.round((row.success / settled) * 1000) / 10 : 0;
    return { ...row, success_rate: successRate };
  }
}
