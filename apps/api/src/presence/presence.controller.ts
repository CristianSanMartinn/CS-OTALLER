import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthRequest } from '../auth/auth.types.js';
import { PresenceService } from './presence.service.js';

@Controller('presence')
@UseGuards(AuthGuard)
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}
  @Get() snapshot(@Req() req: AuthRequest) { return this.presence.snapshot(req.user); }
  @Post('heartbeat') heartbeat(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.presence.heartbeat(req.user, body);
  }
  @Post('disconnect') disconnect(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.presence.disconnect(req.user, body);
  }
}
