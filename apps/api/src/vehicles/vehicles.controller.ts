import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Req,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard.js";
import { AdminGuard } from "../auth/admin.guard.js";
import { AuthRequest } from "../auth/auth.types.js";
import { VehiclesService } from "./vehicles.service.js";
@Controller("vehicles")
@UseGuards(AuthGuard)
export class VehiclesController {
  constructor(private readonly service: VehiclesService) {}
  @Get("plate-check") @UseGuards(AdminGuard) @Header("Cache-Control", "no-store")
  checkPlate(@Req() req: AuthRequest, @Query("plate") plate: unknown) {
    return this.service.checkPlate(req.user, plate);
  }
  @Get() findAll(@Req() req: AuthRequest) {
    return this.service.findAll(req.user);
  }
  @Post() @UseGuards(AdminGuard) create(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.service.save(req.user.workshopId, body, undefined, req.user.id);
  }
  @Patch(":id") @UseGuards(AdminGuard) update(
    @Req() req: AuthRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.service.save(req.user.workshopId, body, id, req.user.id);
  }
}
