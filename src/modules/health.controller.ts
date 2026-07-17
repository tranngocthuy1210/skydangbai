import { Controller, Get } from '@nestjs/common';
import { query } from '../shared/db';
import { Public } from '../common/auth';

@Controller('health')
export class HealthController {
  // Mở: để kiểm tra API + DB còn sống mà không cần đăng nhập.
  // An toàn vì không trả về dữ liệu nào của người dùng.
  @Public()
  @Get()
  async check() {
    const [row] = await query('SELECT now() AS time');
    return { status: 'ok', db_time: row.time };
  }
}
