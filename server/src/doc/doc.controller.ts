import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DocService } from './doc.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('doc')
export class DocController {
  constructor(private readonly docService: DocService) {}

  @Get()
  getDoc() {
    return this.docService.getDocState();
  }

  @Post('save')
  async saveDoc() {
    await this.docService.persistToDb();
    const state = this.docService.getDocState();
    return { ok: true, version: state.version };
  }

  @Get('history')
  getHistory() {
    return this.docService.getHistory();
  }
}
