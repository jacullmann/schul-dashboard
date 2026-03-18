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
import { GroupAdminService } from './group-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantRoles } from '../common/decorators/roles.decorator';
import { ActiveTenantId } from '../common/decorators/tenant.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import {
  ChangeMemberRoleDto,
  RenameGroupDto,
  CreateTimetableSubDto,
  CreateAnnouncementDto,
} from './dto/group-admin.dto';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('group-admin')
export class GroupAdminController {
  constructor(private readonly groupAdminService: GroupAdminService) {}

  @TenantRoles('admin', 'moderator')
  @Get('stats')
  getStats(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getStats(tenantId);
  }

  @TenantRoles('admin', 'moderator')
  @Get('members')
  getMembers(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getMembers(tenantId);
  }

  @TenantRoles('admin')
  @Patch('members/:userId/role')
  changeMemberRole(
    @ActiveTenantId() tenantId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() currentUserId: string,
    @Body() body: ChangeMemberRoleDto,
  ) {
    return this.groupAdminService.changeMemberRole(
      tenantId,
      currentUserId,
      targetUserId,
      body.role,
    );
  }

  @TenantRoles('admin')
  @Delete('members/:userId')
  removeMember(
    @ActiveTenantId() tenantId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.groupAdminService.removeMember(
      tenantId,
      currentUserId,
      targetUserId,
    );
  }

  @TenantRoles('admin')
  @Patch('settings')
  renameGroup(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: RenameGroupDto,
  ) {
    return this.groupAdminService.renameGroup(tenantId, userId, body.name);
  }

  @TenantRoles('admin', 'moderator')
  @Delete('cleanup/old-items')
  cleanupOldItems(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.groupAdminService.cleanupOldItems(tenantId, userId);
  }

  @TenantRoles('admin', 'moderator')
  @Get('timetable')
  getTimetable(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getTimetable(tenantId);
  }

  @TenantRoles('admin', 'moderator')
  @Get('timetable/subs')
  getTimetableSubs(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getTimetableSubs(tenantId);
  }

  @TenantRoles('admin', 'moderator')
  @Post('timetable/subs')
  createTimetableSub(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateTimetableSubDto,
  ) {
    return this.groupAdminService.createTimetableSub(tenantId, userId, body);
  }

  @TenantRoles('admin', 'moderator')
  @Delete('timetable/subs/:id')
  deleteTimetableSub(
    @ActiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteTimetableSub(tenantId, id);
  }

  @TenantRoles('admin', 'moderator')
  @Post('announcements')
  createAnnouncement(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateAnnouncementDto,
  ) {
    return this.groupAdminService.createAnnouncement(
      tenantId,
      userId,
      body.content,
      body.color,
      body.showAsPopup,
    );
  }

  @TenantRoles('admin', 'moderator')
  @Delete('announcements/:id')
  deleteAnnouncement(
    @ActiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteAnnouncement(tenantId, id);
  }
}
