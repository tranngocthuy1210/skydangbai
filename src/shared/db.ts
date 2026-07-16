import { Pool, PoolClient } from 'pg';
import { env } from './env';

// Pool dùng chung cho cả API, worker và feeder.
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
});

// Helper query trả về mảng rows cho gọn.
export async function query<T = any>(
  text: string,
  params: any[] = [],
): Promise<T[]> {
  const res = await pool.query(text, params);
  return res.rows as T[];
}

// Chạy 1 hàm trong transaction (commit/rollback tự động).
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
