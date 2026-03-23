import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { ActiveTenantId } from '../common/decorators/tenant.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import { GroupAdminService } from '../group/group-admin.service';
import {
  UpdateUserRoleDto,
  ProcessReportDto,
  CreateSubjectDto,
  AdminCreateTimetableSubDto,
} from './dto/super-admin.dto';

// Global super-admin routes: user management, reports, global stats
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly groupAdminService: GroupAdminService,
  ) {}

  @UseGuards(TenantGuard)
  @Get('stats')
  getStats(@ActiveTenantId() tenantId: string) {
    return this.superAdminService.getStats(tenantId);
  }

  @UseGuards(TenantGuard)
  @Delete('cleanup/old-items')
  cleanupOldItems(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.superAdminService.cleanupOldItems(tenantId, currentUserId);
  }

  @Get('groups')
  getGroups() {
    return this.superAdminService.getGroups();
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id') groupId: string) {
    return this.superAdminService.deleteGroup(groupId);
  }

  @Get('all-users')
  getAllUsers() {
    return this.superAdminService.getAllUsers();
  }

  @Get('users/:id/activity')
  getUserActivity(@Param('id') id: string) {
    return this.superAdminService.getUserActivity(id);
  }

  @Post('users/:id/ban')
  banUser(
    @Param('id') targetUserId: string,
    @CurrentUserId() adminUserId: string,
  ) {
    return this.superAdminService.banUser(targetUserId, adminUserId);
  }

  @Delete('users/:id/ban')
  unbanUser(
    @Param('id') targetUserId: string,
    @CurrentUserId() adminUserId: string,
  ) {
    return this.superAdminService.unbanUser(targetUserId, adminUserId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') targetUserId: string) {
    return this.superAdminService.deleteUser(targetUserId);
  }

  @Patch('users/:id')
  updateUserRole(
    @Param('id') targetUserId: string,
    @Body() body: UpdateUserRoleDto,
    @CurrentUserId() adminUserId: string,
  ) {
    return this.superAdminService.updateUserRole(
      targetUserId,
      body.role,
      adminUserId,
    );
  }

  @Delete('users/:id/activity/prune')
  pruneActivity(
    @Param('id') targetUserId: string,
    @CurrentUserId() adminUserId: string,
  ) {
    return this.superAdminService.pruneActivity(targetUserId, adminUserId);
  }

  @Get('reports')
  getReports() {
    return this.superAdminService.getReports();
  }

  @Patch('reports/:id/processed')
  processReport(
    @Param('id') reportId: string,
    @CurrentUserId() adminUserId: string,
    @Body() body: ProcessReportDto,
  ) {
    return this.superAdminService.processReport(
      reportId,
      adminUserId,
      body.processed,
    );
  }

  @Delete('reports/:id')
  deleteReport(
    @Param('id') reportId: string,
    @CurrentUserId() adminUserId: string,
  ) {
    return this.superAdminService.deleteReport(reportId, adminUserId);
  }

  @UseGuards(TenantGuard)
  @Post('subjects')
  upsertSubject(
    @ActiveTenantId() tenantId: string,
    @Body() body: CreateSubjectDto,
  ) {
    return this.superAdminService.upsertSubject(tenantId, body.name);
  }

  @UseGuards(TenantGuard)
  @Delete('subjects/:name')
  deleteSubject(
    @ActiveTenantId() tenantId: string,
    @Param('name') name: string,
  ) {
    return this.superAdminService.deleteSubject(tenantId, name);
  }

  @UseGuards(TenantGuard)
  @Get('timetable/subs')
  getTimetableSubs(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getTimetableSubs(tenantId);
  }

  @UseGuards(TenantGuard)
  @Post('timetable/subs')
  createTimetableSub(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: AdminCreateTimetableSubDto,
  ) {
    return this.groupAdminService.createTimetableSub(tenantId, userId, body);
  }

  @UseGuards(TenantGuard)
  @Delete('timetable/subs/:id')
  deleteTimetableSub(
    @ActiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteTimetableSub(tenantId, id);
  }
}
