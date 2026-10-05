import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { PortalService } from "./portal.service.js";
import { PortalController } from "./portal.controller.js";
@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [PortalService],
  controllers: [PortalController],
})
export class PortalModule {}
