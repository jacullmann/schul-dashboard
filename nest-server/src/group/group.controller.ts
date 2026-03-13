import { Controller, Post, Get, Body, Req, Res, Ip, Headers, UseGuards } from '@nestjs/common';
import { GroupService } from './group.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { JoinGroupDto, CreateGroupDto, SwitchGroupDto } from './dto/group.dto';
import { Public } from '../common/decorators/public.decorator';
import type { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/decorators/current-user.decorator';
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post('join')
  joinGroup(
    @CurrentUser() user: AuthUser,
    @Body() body: JoinGroupDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.groupService.joinGroup(user.sub, user.email, user.globalRole, body.groupName, body.password, res, ip, ua || 'unknown');
  }

  @Post('create')
  createGroup(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateGroupDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.groupService.createGroup(user.sub, user.email, user.globalRole, body.groupName, body.password, res, ip, ua || 'unknown');
  }

  @Public() // Accessible to non-authenticated (checked gracefully via req param)
  @UseGuards(JwtAuthGuard)
  @Get('status')
  getStatus(@Req() req: any) {
    return this.groupService.getStatus(req.userId, req.activeGroupId || null);
  }

  @Post('switch')
  switchGroup(
    @CurrentUser() user: AuthUser,
    @Body() body: SwitchGroupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.groupService.switchGroup(user.sub, user.email, user.globalRole, body.groupId, res);
  }

  @Post('logout')
  logout(
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Headers('user-agent') ua: string,
  ) {
    return this.groupService.logout(res, ip, ua || 'unknown');
  }
}
