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
import { WorkOrdersService } from "./work-orders.service.js";
import { CancellationService } from "../common/cancellation.service.js";
@Controller("work-orders")
@UseGuards(AuthGuard)
export class WorkOrdersController {
  constructor(
    private readonly service: WorkOrdersService,
    private readonly cancellation: CancellationService,
  ) {}
  @Post(":id/cancel") @UseGuards(AdminGuard) cancel(
    @Req() r: AuthRequest,
    @Body() b: unknown,
    @Param("id") id: string,
  ) {
    return this.cancellation.cancel(r.user, "order", id, b);
  }
  @Get() list(@Req() r: AuthRequest) {
    return this.service.findAll(r.user);
  }
  @Post() create(@Req() r: AuthRequest, @Body() b: unknown) {
    return this.service.save(r.user, b);
  }
  @Patch(":id") edit(
    @Req() r: AuthRequest,
    @Body() b: unknown,
    @Param("id") id: string,
  ) {
    return this.service.save(r.user, b, id);
  }
}
