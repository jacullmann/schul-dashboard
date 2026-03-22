import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Optional,
} from '@nestjs/common';
import { TimetableService } from './timetable.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { ActiveTenantId } from '../common/decorators/tenant.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('timetable')
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Get()
  getTimetable(
    @ActiveTenantId() tenantId: string,
    @Optional() @CurrentUserId() userId?: string,
  ) {
    return this.timetableService.getTimetable(tenantId, userId);
  }

  @Get('subs')
  getSubs(@ActiveTenantId() tenantId: string) {
    return this.timetableService.getSubs(tenantId);
  }

  @Get('subjects')
  getSubjects(@ActiveTenantId() tenantId: string) {
    return this.timetableService.getSubjects(tenantId);
  }

  @Get('persons')
  getPersons(@ActiveTenantId() tenantId: string) {
    return this.timetableService.getPersons(tenantId);
  }

  @Get('dalton-schedule')
  getDaltonSchedule(@ActiveTenantId() tenantId: string) {
    return this.timetableService.getDaltonSchedule(tenantId);
  }

  @Get('announcements')
  getAnnouncements(@ActiveTenantId() tenantId: string) {
    return this.timetableService.getAnnouncements(tenantId);
  }

  /** Returns the list of announcement IDs the current user has already seen as popups. */
  @Get('announcements/read-status')
  getAnnouncementReadStatus(
    @CurrentUserId() userId: string,
    @ActiveTenantId() tenantId: string,
  ) {
    return this.timetableService.getAnnouncementReadStatus(userId, tenantId);
  }

  /** Marks a specific announcement popup as seen for the current user. */
  @Post('announcements/:id/read')
  markAnnouncementRead(
    @CurrentUserId() userId: string,
    @Param('id') announcementId: string,
  ) {
    return this.timetableService.markAnnouncementRead(userId, announcementId);
  }
}
