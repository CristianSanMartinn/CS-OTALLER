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
import { AppointmentsService } from "./appointments.service.js";
import { CancellationService } from "../common/cancellation.service.js";
@Controller("appointments")
@UseGuards(AuthGuard)
export class AppointmentsController {
  constructor(
    private readonly service: AppointmentsService,
    private readonly cancellation: CancellationService,
  ) {}
  @Post(":id/cancel") @UseGuards(AdminGuard) cancel(
    @Req() r: AuthRequest,
    @Body() b: unknown,
    @Param("id") id: string,
  ) {
    return this.cancellation.cancel(r.user, "appointment", id, b);
  }
  @Get() list(@Req() r: AuthRequest) {
    return this.service.findAll(r.user);
  }
  @Post() @UseGuards(AdminGuard) create(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.save(r.user, b);
  }
  @Patch(":id") @UseGuards(AdminGuard) edit(
    @Req() r: AuthRequest,
    @Body() b: unknown,
    @Param("id") id: string,
  ) {
    return this.service.save(r.user, b, id);
  }
}
