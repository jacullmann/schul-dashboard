import { Controller, Get, UseGuards, Optional } from '@nestjs/common';
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
}
