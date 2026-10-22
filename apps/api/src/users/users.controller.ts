import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { AuthRequest } from '../auth/auth.types.js';
import { UsersService } from './users.service.js';
@Controller('users') @UseGuards(AuthGuard,AdminGuard)
export class UsersController {
 constructor(private readonly users:UsersService){}
 @Get() findAll(@Req() req:AuthRequest){return this.users.findAll(req.user);}
 @Post() create(@Req() req:AuthRequest,@Body() body:unknown){return this.users.save(req.user,body);}
 @Patch(':id') update(@Req() req:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.users.save(req.user,body,id);}
}
