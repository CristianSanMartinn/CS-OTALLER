import { Module } from '@nestjs/common';import { DatabaseModule } from '../database/database.module.js';import { AuthModule } from '../auth/auth.module.js';import { VehiclesController } from './vehicles.controller.js';import { VehiclesService } from './vehicles.service.js';
@Module({imports:[DatabaseModule,AuthModule],controllers:[VehiclesController],providers:[VehiclesService]})
export class VehiclesModule {}
