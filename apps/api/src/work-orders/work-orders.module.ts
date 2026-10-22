import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { WorkOrdersController } from "./work-orders.controller.js";
import { WorkOrdersService } from "./work-orders.service.js";
import { CancellationService } from "../common/cancellation.service.js";
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, CancellationService],
})
export class WorkOrdersModule {}
