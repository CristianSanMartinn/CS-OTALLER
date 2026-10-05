import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { MaintenanceController } from "./maintenance.controller.js";
import { MaintenanceService } from "./maintenance.service.js";
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
