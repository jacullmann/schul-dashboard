import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  Ip,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';
import {
  LoginDto,
  RegisterDto,
  VerifyMfaDto,
  ForgotPasswordDto,
  ResetPasswordVerifyDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto/auth.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { MfaPendingGuard } from '../common/guards/mfa-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    return this.authService.login(body.email, body.password, res, ip, req);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @UseGuards(MfaPendingGuard)
  @Post('mfa/verify')
  async verifyMfa(
    @Body() body: VerifyMfaDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const { sub, email } = req.mfaPending as { sub: string; email: string };
    return this.authService.verifyMfa(body.code, sub, email, res, ip, req);
  }

  @Public()
  @Post('mfa/cancel')
  cancelMfa(@Res({ passthrough: true }) res: Response) {
    return this.authService.cancelMfa(res);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(
      body.email,
      body.password,
      body.preferences,
    );
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: any) {
    const userId = (req as Record<string, any>).userId as string | undefined;
    const activeGroupId = (req as Record<string, any>).activeGroupId as
      | string
      | null
      | undefined;
    return this.authService.getMe(userId || '', activeGroupId || null);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(
    @CurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.deleteMe(userId, res);
  }

  @Public()
  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('forgot')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('reset/verify')
  async verifyResetToken(@Body() body: ResetPasswordVerifyDto) {
    return this.authService.verifyResetToken(body.email, body.code);
  }

  @Public()
  @Post('reset')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body.resetToken, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() body: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    return this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
      res,
      req,
      ip,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('groups')
  async getGroups(@CurrentUserId() userId: string) {
    return this.authService.getGroups(userId);
  }
}
