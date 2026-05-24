import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OAuthService } from './oauth.service';
import { LinkGoogleAccountDto } from './dto/oauth.dto';
import { OAuthPendingGuard } from './guards/oauth-pending.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { Request, Response } from 'express';

@Controller('auth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  @Public()
  @Get('google')
  initiateGoogleOAuth(@Res() res: Response): void {
    const authUrl = this.oauthService.buildGoogleAuthUrl(res);
    res.redirect(authUrl);
  }

  @Public()
  @Get('google/callback')
  async handleGoogleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const redirectUrl = await this.oauthService.handleCallback(
      code,
      state,
      error,
      req,
      res,
    );
    res.redirect(redirectUrl);
  }

  @Public()
  @UseGuards(OAuthPendingGuard)
  @Post('google/link')
  async linkGoogleAccount(
    @Body() body: LinkGoogleAccountDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { googleId, googleEmail } = req.oauthPending as {
      googleId: string;
      googleEmail: string;
    };
    return this.oauthService.linkGoogleAccount(
      googleId,
      googleEmail,
      body.password,
      res,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('google/unlink')
  async unlinkGoogleAccount(@CurrentUserId() userId: string) {
    return this.oauthService.unlinkGoogleAccount(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('providers')
  async getLinkedProviders(@CurrentUserId() userId: string) {
    return this.oauthService.getLinkedProviders(userId);
  }
}
