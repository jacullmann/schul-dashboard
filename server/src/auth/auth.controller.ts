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

  // 15 login attempts per minute per IP — tight enough to stop brute force,
  // loose enough for legitimate users on slow connections.
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Public()
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    return this.authService.login(body.email, body.password, res, ip);
  }

  // MFA code submission is similarly brute-force sensitive.
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
    return this.authService.verifyMfa(body.code, sub, email, res, ip);
  }

  @Public()
  @Post('mfa/cancel')
  cancelMfa(@Res({ passthrough: true }) res: Response) {
    return this.authService.cancelMfa(res);
  }

  // Registration: prevent account-creation spam.
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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Public()
  @UseGuards(JwtAuthGuard) // Used dynamically to gracefully populate user without failing if not logged in
  @Get('me')
  async getMe(@Req() req: any) {
    // If not authenticated, request.user is undefined
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

  // Forgot-password: prevent email enumeration amplification and spam.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post('forgot')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  // Reset-code verification: the 6-char hex code window needs throttling.
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
  ) {
    return this.authService.changePassword(
      userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('groups')
  async getGroups(@CurrentUserId() userId: string) {
    return this.authService.getGroups(userId);
  }
}
