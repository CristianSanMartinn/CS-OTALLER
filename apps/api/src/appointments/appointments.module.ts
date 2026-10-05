import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { AppointmentsController } from "./appointments.controller.js";
import { AppointmentsService } from "./appointments.service.js";
import { CancellationService } from "../common/cancellation.service.js";
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, CancellationService],
})
export class AppointmentsModule {}
