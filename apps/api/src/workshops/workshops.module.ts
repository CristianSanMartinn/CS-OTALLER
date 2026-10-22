import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { WorkshopsController } from "./workshops.controller.js";
import { WorkshopsService } from "./workshops.service.js";
@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [WorkshopsController],
  providers: [WorkshopsService],
})
export class WorkshopsModule {}
