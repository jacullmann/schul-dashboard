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

  /**
   * Initiates the Google OAuth flow.
   * Generates state + nonce, stores them in a cookie, then redirects the
   * browser directly to Google's authorization endpoint.
   */
  @Public()
  @Get('google')
  initiateGoogleOAuth(@Res() res: Response): void {
    const authUrl = this.oauthService.buildGoogleAuthUrl(res);
    res.redirect(authUrl);
  }

  /**
   * Handles Google's redirect back after the user consents (or denies).
   * Performs full token verification and account resolution, then redirects
   * the browser back to the frontend with the outcome encoded as a query param.
   */
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

  /**
   * Links a Google identity to an existing email/password account.
   * Requires a valid pending_oauth_token cookie (set during the callback
   * when an email conflict was detected) and the account's password.
   */
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

  /**
   * Unlinks the Google OAuth provider from the authenticated user's account.
   * Blocked if the user has no password set (prevents account lockout).
   */
  @UseGuards(JwtAuthGuard)
  @Delete('google/unlink')
  async unlinkGoogleAccount(@CurrentUserId() userId: string) {
    return this.oauthService.unlinkGoogleAccount(userId);
  }

  /**
   * Returns the list of OAuth providers linked to the authenticated user.
   */
  @UseGuards(JwtAuthGuard)
  @Get('providers')
  async getLinkedProviders(@CurrentUserId() userId: string) {
    return this.oauthService.getLinkedProviders(userId);
  }
}
