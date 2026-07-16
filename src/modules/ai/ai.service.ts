import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../shared/env';
import { query } from '../../shared/db';

interface OptimalTimeRec {
  platform: string;
  hours: number[];
  rationale: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: Anthropic | null;
  readonly enabled: boolean;

  constructor() {
    this.enabled = !!env.anthropicApiKey;
    this.client = this.enabled
      ? new Anthropic({ apiKey: env.anthropicApiKey })
      : null;
    if (!this.enabled) {
      this.logger.warn(
        'ANTHROPIC_API_KEY chưa cấu hình — tính năng AI chạy chế độ fallback.',
      );
    }
  }

  // Gọi Claude Messages API, trả về text đã ghép.
  // Cast `as any` cho các field mới (thinking adaptive) để tương thích nhiều phiên bản SDK.
  private async complete(opts: {
    model: string;
    system: string;
    user: string;
    maxTokens?: number;
    thinking?: boolean;
  }): Promise<string> {
    const params: any = {
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    };
    // Opus 4.8 hỗ trợ adaptive thinking cho tác vụ suy luận (phân tích giờ vàng).
    if (opts.thinking) params.thinking = { type: 'adaptive' };

    const res: any = await this.client!.messages.create(params);
    return (res.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();
  }

  // Bóc JSON từ output của model (chịu được trường hợp bọc ```json ... ```).
  // Production: nên dùng structured outputs (output_config.format) để bỏ bước này.
  private parseJson<T>(raw: string, fallback: T): T {
    try {
      const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const start = cleaned.search(/[[{]/);
      const end = Math.max(cleaned.lastIndexOf(']'), cleaned.lastIndexOf('}'));
      if (start === -1 || end === -1) return fallback;
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return fallback;
    }
  }

  // ============================================================
  // 1. Spin nội dung chống spam: 1 bài gốc → N biến thể khác câu chữ, giữ CTA.
  // ============================================================
  async spinContent(
    base: string,
    count: number,
    platform?: string,
  ): Promise<string[]> {
    if (!this.enabled || count <= 0) {
      return Array(Math.max(count, 0)).fill(base);
    }
    const system =
      'Bạn là chuyên gia content marketing mạng xã hội tiếng Việt. Viết lại một bài đăng thành nhiều biến thể khác nhau về câu chữ nhưng GIỮ NGUYÊN thông điệp chính, thông tin và lời kêu gọi hành động (CTA). Mục tiêu là tránh bị nền tảng đánh dấu nội dung trùng lặp/spam. KHÔNG thêm hashtag.';
    const user = `Nền tảng: ${platform ?? 'chung'}
Số biến thể cần tạo: ${count}
Bài gốc:
"""${base}"""

Trả về DUY NHẤT JSON dạng {"variants": ["...", "..."]} với đúng ${count} phần tử.`;

    try {
      const text = await this.complete({ model: env.aiSpinModel, system, user });
      const parsed = this.parseJson<{ variants: string[] }>(text, { variants: [] });
      const variants = (parsed.variants ?? []).filter(
        (v) => typeof v === 'string' && v.trim(),
      );
      // Chuẩn hóa đúng `count`: thiếu thì bù bằng bài gốc.
      return Array.from({ length: count }, (_, i) => variants[i] ?? base);
    } catch (e) {
      this.logger.error(`spinContent lỗi: ${(e as Error).message}`);
      return Array(count).fill(base);
    }
  }

  // ============================================================
  // 2. Gợi ý hashtag theo ngữ cảnh + nền tảng.
  // ============================================================
  async suggestHashtags(
    content: string,
    platform?: string,
    max = 8,
  ): Promise<string[]> {
    if (!this.enabled) return [];
    const system =
      'Bạn là chuyên gia SEO & mạng xã hội. Gợi ý hashtag phù hợp ngữ cảnh và nền tảng.';
    const user = `Nền tảng: ${platform ?? 'chung'}
Nội dung:
"""${content}"""

Gợi ý tối đa ${max} hashtag liên quan. Trả về DUY NHẤT JSON {"hashtags": ["tu1","tu2"]} — KHÔNG kèm dấu #.`;

    try {
      const text = await this.complete({
        model: env.aiSpinModel,
        system,
        user,
        maxTokens: 500,
      });
      const parsed = this.parseJson<{ hashtags: string[] }>(text, { hashtags: [] });
      return (parsed.hashtags ?? [])
        .map((h) => String(h).replace(/^#/, '').trim())
        .filter(Boolean)
        .slice(0, max);
    } catch (e) {
      this.logger.error(`suggestHashtags lỗi: ${(e as Error).message}`);
      return [];
    }
  }

  // ============================================================
  // 3. Phân tích "giờ vàng" dựa trên post_logs lịch sử của chính user.
  //    Có API key → nhờ Claude luận giải; không có → heuristic thuần SQL.
  // ============================================================
  async analyzeOptimalTimes(userId: string) {
    const stats = await query(
      `SELECT platform, EXTRACT(HOUR FROM created_at)::int AS hour,
              COUNT(*) FILTER (WHERE status='success')::int AS successes,
              COUNT(*)::int AS attempts
       FROM post_logs
       WHERE user_id = $1
       GROUP BY platform, hour
       ORDER BY platform, hour`,
      [userId],
    );

    const heuristic = this.heuristicTopHours(stats);

    if (!this.enabled || stats.length === 0) {
      return { source: 'heuristic', recommendations: heuristic, stats };
    }

    const system =
      'Bạn là chuyên gia phân tích dữ liệu marketing. Dựa trên số liệu lịch sử đăng bài, đề xuất khung giờ vàng để đăng cho từng nền tảng.';
    const user = `Dữ liệu (mỗi dòng: nền tảng, giờ trong ngày 0-23, số bài thành công, tổng số lần thử):
${JSON.stringify(stats)}

Đề xuất tối đa 3 khung giờ tốt nhất cho MỖI nền tảng kèm lý do ngắn gọn.
Trả về DUY NHẤT JSON {"recommendations":[{"platform":"...","hours":[8,12,20],"rationale":"..."}]}`;

    try {
      const text = await this.complete({
        model: env.aiAnalysisModel,
        system,
        user,
        thinking: true,
      });
      const parsed = this.parseJson<{ recommendations: OptimalTimeRec[] }>(text, {
        recommendations: heuristic,
      });
      return {
        source: 'ai',
        recommendations: parsed.recommendations ?? heuristic,
        stats,
      };
    } catch (e) {
      this.logger.error(`analyzeOptimalTimes lỗi: ${(e as Error).message}`);
      return { source: 'heuristic', recommendations: heuristic, stats };
    }
  }

  private heuristicTopHours(stats: any[]): OptimalTimeRec[] {
    const byPlatform: Record<string, { hour: number; successes: number }[]> = {};
    for (const r of stats) {
      (byPlatform[r.platform] ??= []).push({ hour: r.hour, successes: r.successes });
    }
    return Object.entries(byPlatform).map(([platform, rows]) => ({
      platform,
      hours: rows
        .sort((a, b) => b.successes - a.successes)
        .slice(0, 3)
        .map((r) => r.hour)
        .sort((a, b) => a - b),
      rationale: 'Dựa trên số bài đăng thành công nhiều nhất theo giờ (heuristic).',
    }));
  }
}
