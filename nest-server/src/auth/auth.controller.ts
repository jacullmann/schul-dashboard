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
import { CurrentUserId, ActiveGroupId } from '../common/decorators/current-user.decorator';
import { MfaPendingGuard } from '../common/guards/mfa-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    return this.authService.login(body.email, body.password, res, ip);
  }

  @Public()
  @UseGuards(MfaPendingGuard)
  @Post('mfa/verify')
  async verifyMfa(
    @Body() body: VerifyMfaDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
  ) {
    const { sub, email } = req.mfaPending;
    return this.authService.verifyMfa(body.code, sub, email, res, ip);
  }

  @Public()
  @Post('mfa/cancel')
  cancelMfa(@Res({ passthrough: true }) res: Response) {
    return this.authService.cancelMfa(res);
  }

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Public()
  @UseGuards(JwtAuthGuard) // Used dynamically to gracefully populate user without failing if not logged in
  @Get('me')
  async getMe(@Req() req: any) {
    // If not authenticated, request.user is undefined
    const userId = req.userId;
    const activeGroupId = req.activeGroupId;
    return this.authService.getMe(userId, activeGroupId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteMe(@CurrentUserId() userId: string, @Res({ passthrough: true }) res: Response) {
    return this.authService.deleteMe(userId, res);
  }

  @Public()
  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

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
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('groups')
  async getGroups(@CurrentUserId() userId: string) {
    return this.authService.getGroups(userId);
  }
}
