import { Controller, Get } from '@nestjs/common';
import { query } from '../shared/db';

@Controller('health')
export class HealthController {
  @Get()
  async check() {
    const [row] = await query('SELECT now() AS time');
    return { status: 'ok', db_time: row.time };
  }
}
