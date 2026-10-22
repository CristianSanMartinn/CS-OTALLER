import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { DatabaseController } from './database.controller.js';

@Module({
  providers: [DatabaseService],
  controllers: [DatabaseController],
  exports: [DatabaseService],
})
export class DatabaseModule {}