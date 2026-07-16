import { query } from '../shared/db';

export interface LogEntry {
  postId: string;
  userId: string;
  platform: string;
  attempt: number;
  status: 'success' | 'failed' | 'retrying' | 'skipped';
  errorCode?: string;
  errorMessage?: string;
  httpStatus?: number;
  durationMs: number;
  workerId: string;
  requestPayload?: unknown;
  responseBody?: unknown;
}

// Ghi 1 dòng vào post_logs. Bọc try/catch để lỗi ghi log KHÔNG làm hỏng luồng đăng.
export async function writeLog(entry: LogEntry): Promise<void> {
  try {
    await query(
      `INSERT INTO post_logs
        (post_id, user_id, platform, attempt_number, status, error_code,
         error_message, http_status, duration_ms, worker_id,
         request_payload, response_body)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        entry.postId,
        entry.userId,
        entry.platform,
        entry.attempt,
        entry.status,
        entry.errorCode ?? null,
        entry.errorMessage ?? null,
        entry.httpStatus ?? null,
        entry.durationMs,
        entry.workerId,
        JSON.stringify(entry.requestPayload ?? {}),
        JSON.stringify(entry.responseBody ?? {}),
      ],
    );
    // TODO: emit WebSocket cho trang Post Logs cập nhật realtime.
  } catch (e) {
    console.error('[writeLog] không ghi được log:', (e as Error).message);
  }
}
