import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { Public } from '../common/decorators/public.decorator';
import { AppConfig } from '../config/env.config';
import { CsrfMiddleware } from '../common/middleware/csrf.middleware';

@Controller('system')
export class SystemController {
  constructor(private readonly appConfig: AppConfig) {}

  /**
   * Initialises the CSRF cookie on first page load.
   * This endpoint is intentionally public — the browser calls it before
   * authenticating to obtain a CSRF token for subsequent mutations.
   */
  @Public()
  @ApiOperation({ summary: 'Initialises CSRF protection cookie.' })
  @Get('csrf/init')
  initCsrf(@Res({ passthrough: true }) res: Response) {
    const token = crypto.randomBytes(32).toString('hex');
    CsrfMiddleware.setCsrfCookie(res, token, this.appConfig);
    return { ok: true };
  }

  @Public()
  @ApiOperation({
    summary: 'Health-check — verifies the backend is reachable.',
  })
  @Get('serverstatus')
  getServerStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      env: this.appConfig.nodeEnv,
    };
  }
}
