import { WorkshopRegistrationService } from "./workshop-registration.service.js";
import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service.js";
import { AuthGuard } from "./auth.guard.js";
import { AuthRequest } from "./auth.types.js";
@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly registration: WorkshopRegistrationService,
  ) {}
  @Post("register") @Throttle({ default: { limit: 3, ttl: 60000 } }) register(
    @Body() body: unknown,
  ) {
    return this.registration.register(body);
  }
  @Post("login") @Throttle({ default: { limit: 5, ttl: 60000 } }) login(
    @Body() body: unknown,
  ) {
    return this.auth.login(body);
  }
  @Get("me") @UseGuards(AuthGuard) me(@Req() req: AuthRequest) {
    return this.auth.me(req.user);
  }
  @Patch("profile") @UseGuards(AuthGuard) profile(
    @Req() req: AuthRequest,
    @Body() body: unknown,
  ) {
    return this.auth.updateProfile(req.user, body);
  }
  @Patch("preferences") @UseGuards(AuthGuard) preferences(@Req() req:AuthRequest,@Body() body:unknown) {
    return this.auth.preferences(req.user,body);
  }
  @Get("setup") setupStatus() {
    return this.auth.setupStatus();
  }
  @Post("setup") @Throttle({ default: { limit: 3, ttl: 60000 } }) setup(
    @Body() body: unknown,
  ) {
    return this.auth.setup(body);
  }
}
