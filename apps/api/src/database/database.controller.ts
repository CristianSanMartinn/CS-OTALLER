import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Controller('database')
export class DatabaseController {
  constructor(private readonly database: DatabaseService) {}

  @Get('health')
  checkConnection() {
    return this.database.checkConnection();
  }
}