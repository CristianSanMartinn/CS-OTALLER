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
import { CustomersService } from "./customers.service.js";
import { AuthGuard } from "../auth/auth.guard.js";
import { AdminGuard } from "../auth/admin.guard.js";
import { AuthRequest } from "../auth/auth.types.js";
@Controller("customers")
@UseGuards(AuthGuard, AdminGuard)
export class CustomersController {
  constructor(private readonly service: CustomersService) {}
  @Post(":id/archive") archive(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.service.setActive(req.user.workshopId, id, req.user.id, false);
  }
  @Post(":id/restore") restore(
    @Req() req: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.service.setActive(req.user.workshopId, id, req.user.id, true);
  }
  @Get() findAll(@Req() req: AuthRequest) {
    return this.service.findAll(req.user.workshopId);
  }
  @Post() create(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.service.save(req.user.workshopId, body, undefined, req.user.id);
  }
  @Patch(":id") update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.save(req.user.workshopId, body, id, req.user.id);
  }
}
