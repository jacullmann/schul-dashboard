import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Req,
  Res,
  Ip,
  UseGuards,
  UnauthorizedException,
  HttpCode,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { TokenService } from './token.service';
import {
  REFRESH_COOKIE,
  clearAuthCookies,
  setAccessCookie,
  setRefreshCookie,
} from './auth.cookies';
import { AppConfig } from '../config/env.config';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class RefreshController {
  constructor(
    private readonly tokenService: TokenService,
    private readonly appConfig: AppConfig,
  ) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ): Promise<{ ok: true }> {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (typeof presented !== 'string' || presented.length === 0) {
      clearAuthCookies(res, this.appConfig);
      throw new UnauthorizedException({
        error: 'No refresh token.',
        requiresAuth: true,
      });
    }

    const issued = await this.tokenService.rotate(presented, {
      userAgent: req.headers['user-agent'],
      ipAddress: ip,
    });

    if (!issued) {
      clearAuthCookies(res, this.appConfig);
      throw new UnauthorizedException({
        error: 'Refresh token invalid.',
        requiresAuth: true,
      });
    }

    setAccessCookie(res, issued.accessToken, this.appConfig);
    setRefreshCookie(res, issued.refreshToken, this.appConfig);
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (typeof presented === 'string' && presented.length > 0) {
      await this.tokenService.revokeByToken(presented, 'logout');
    }
    clearAuthCookies(res, this.appConfig);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(200)
  async logoutAll(
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    await this.tokenService.revokeAllForUser(userId, 'logout_all');
    clearAuthCookies(res, this.appConfig);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async listSessions(@CurrentUserId() userId: string) {
    const sessions = await this.tokenService.listActiveSessions(userId);
    return { sessions };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:familyId')
  @HttpCode(200)
  async revokeSession(
    @CurrentUserId() userId: string,
    @Param('familyId') familyId: string,
  ): Promise<{ ok: true }> {
    const mine = await this.tokenService.listActiveSessions(userId);
    if (!mine.some((s) => s.familyId === familyId)) {
      throw new UnauthorizedException({ error: 'Session not found.' });
    }
    await this.tokenService.revokeFamily(familyId, 'admin_revoke');
    return { ok: true };
  }
}
