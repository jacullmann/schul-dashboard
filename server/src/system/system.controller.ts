import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { generateCsrfToken } from '../common/middleware/csrf.middleware';

@ApiTags('System')
@Controller('system')
export class SystemController {
  @ApiOperation({ summary: 'Initialisiert CSRF-Schutz und setzt Cookie' })
  @Get('csrf/init')
  initCsrf(@Res() res: Response) {
    const token = generateCsrfToken();
    res.cookie('csrf_token', token, {
      httpOnly: false,
      secure: true,
      path: '/',
      sameSite: 'none',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ ok: true, csrfToken: token });
  }

  @ApiOperation({ summary: 'Prüft ob das Backend erreichbar ist' })
  @Get('serverstatus')
  getServerStatus() {
    return {
      status: 'good',
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV,
    };
  }
}
