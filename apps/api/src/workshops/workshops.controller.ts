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
import { WorkshopsService } from "./workshops.service.js";
@Controller("workshop")
@UseGuards(AuthGuard)
export class WorkshopsController {
  constructor(private readonly service: WorkshopsService) {}
  @Patch() @UseGuards(AdminGuard) edit(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.service.update(r.user, b);
  }
  @Get("activity") activity(@Req() r: AuthRequest) {
    return this.service.activity(r.user);
  }
  @Get("related-customers") customers(@Req() r: AuthRequest) {
    return this.service.customers(r.user);
  }
}
