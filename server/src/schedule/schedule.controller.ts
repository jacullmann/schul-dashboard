import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActiveTenantId } from '../common/decorators/tenant.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  getSchedule(
    @ActiveTenantId() tenantId: string,
    @Optional() @CurrentUserId() userId?: string,
  ) {
    return this.scheduleService.getSchedule(tenantId, userId);
  }

  @Get('subs')
  getSubs(@ActiveTenantId() tenantId: string) {
    return this.scheduleService.getSubs(tenantId);
  }

  @Get('subjects')
  getSubjects(@ActiveTenantId() tenantId: string) {
    return this.scheduleService.getSubjects(tenantId);
  }

  @Get('persons')
  getPersons(@ActiveTenantId() tenantId: string) {
    return this.scheduleService.getPersons(tenantId);
  }

  @Get('dalton-schedule')
  getDaltonSchedule(@ActiveTenantId() tenantId: string) {
    return this.scheduleService.getDaltonSchedule(tenantId);
  }

  @Get('announcements')
  getAnnouncements(@ActiveTenantId() tenantId: string) {
    return this.scheduleService.getAnnouncements(tenantId);
  }

  /** Returns the list of announcement IDs the current user has already seen as popups. */
  @Get('announcements/read-status')
  getAnnouncementReadStatus(
    @CurrentUserId() userId: string,
    @ActiveTenantId() tenantId: string,
  ) {
    return this.scheduleService.getAnnouncementReadStatus(userId, tenantId);
  }

  /** Marks a specific announcement popup as seen for the current user. */
  @Post('announcements/:id/read')
  markAnnouncementRead(
    @CurrentUserId() userId: string,
    @Param('id') announcementId: string,
  ) {
    return this.scheduleService.markAnnouncementRead(userId, announcementId);
  }
}
