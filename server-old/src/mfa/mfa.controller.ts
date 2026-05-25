import { Controller, Get, Post, Body, Ip, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { MfaCodeDto } from './dto/mfa.dto';

@UseGuards(JwtAuthGuard)
@Controller('mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Get('status')
  getStatus(@CurrentUserId() userId: string) {
    return this.mfaService.getStatus(userId);
  }

  @Post('setup')
  setup(@CurrentUserId() userId: string) {
    return this.mfaService.setup(userId);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('activate')
  activate(@CurrentUserId() userId: string, @Body() body: MfaCodeDto) {
    return this.mfaService.activate(userId, body.code);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('deactivate')
  deactivate(
    @CurrentUserId() userId: string,
    @Body() body: MfaCodeDto,
    @Ip() ip: string,
  ) {
    return this.mfaService.deactivate(userId, body.code, ip);
  }
}
