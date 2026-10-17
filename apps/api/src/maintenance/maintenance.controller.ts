import { engineOils } from "./engine-oils.js";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { AdminGuard } from "../auth/admin.guard.js";
import { AuthRequest } from "../auth/auth.types.js";
import { MaintenanceService } from "./maintenance.service.js";
@Controller("maintenance")
@UseGuards(AuthGuard)
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}
  @Get() list(@Req() r: AuthRequest) {
    return this.service.findAll(r.user);
  }
  @Get("oils") oils() {
    return engineOils;
  }
  @Post() create(@Req() r: AuthRequest, @Body() b: unknown) {
    return this.service.create(r.user, b);
  }
}
