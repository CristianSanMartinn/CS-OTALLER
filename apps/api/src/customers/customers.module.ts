import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
@Module({imports:[DatabaseModule,AuthModule],controllers:[CustomersController],providers:[CustomersService]})
export class CustomersModule {}
