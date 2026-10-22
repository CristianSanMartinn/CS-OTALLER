import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AuthRequest } from '../auth/auth.types.js';
import { NotificationsService } from './notifications.service.js';
@Controller('notifications') @UseGuards(AuthGuard)
export class NotificationsController {
 constructor(private readonly notifications:NotificationsService) {}
 @Get() inbox(@Req() req:AuthRequest){return this.notifications.inbox(req.user);}
 @Post('read-all') readAll(@Req() req:AuthRequest){return this.notifications.read(req.user);}
 @Post(':id/read') read(@Req() req:AuthRequest,@Param('id') id:string){return this.notifications.read(req.user,id);}
}
