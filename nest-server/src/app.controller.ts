import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { generateCsrfToken } from './common/middleware/csrf.middleware';

@Controller('system')
export class AppController {

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

  @Get('serverstatus')
  getServerStatus() {
    return { status: 'good' };
  }
}
