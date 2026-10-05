import { Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { AdminGuard } from "../auth/admin.guard.js";
import { AuthRequest } from "../auth/auth.types.js";
import { PortalService } from "./portal.service.js";
@Controller()
export class PortalController {
  constructor(private readonly service: PortalService) {}
  @Post("customers/:id/portal") @UseGuards(AuthGuard, AdminGuard) ensure(
    @Req() r: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.service.ensure(r.user.workshopId, id);
  }
  @Get("portal/:token") vehicles(@Param("token") token: string) {
    return this.service.vehicles(token);
  }
  @Get("portal/:token/vehicles/:id") vehicle(
    @Param("token") token: string,
    @Param("id") id: string,
  ) {
    return this.service.vehicle(token, id);
  }
}
