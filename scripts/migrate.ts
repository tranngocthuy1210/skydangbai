import * as fs from 'fs';
import * as path from 'path';
import { pool } from '../src/shared/db';

async function migrate() {
  const dir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`[migrate] chạy ${file}...`);
    await pool.query(sql);
  }
  console.log('[migrate] xong.');
  await pool.end();
}

migrate().catch((e) => {
  console.error('[migrate] lỗi:', e);
  process.exit(1);
});
