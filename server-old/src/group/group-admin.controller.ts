import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { GroupAdminService } from './group-admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantRoles } from '../common/decorators/roles.decorator';
import { GroupPermissionGuard } from '../common/guards/group-permission.guard';
import { GroupPermission } from '../common/decorators/group-permission.decorator';
import { ActiveTenantId, TenantRole } from '../common/decorators/tenant.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import {
  ChangeMemberRoleDto,
  RenameGroupDto,
  CreateScheduleSubDto,
  CreateAnnouncementDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  UpdateGroupPasswordDto,
  UpdateScheduleConfigDto,
  UpdateGroupPermissionsDto,
} from './dto/group-admin.dto';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('group-admin')
export class GroupAdminController {
  constructor(private readonly groupAdminService: GroupAdminService) {}

  @TenantRoles('admin', 'moderator', 'user')
  @Get('stats')
  getStats(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getStats(tenantId);
  }

  @TenantRoles('admin', 'moderator', 'user')
  @Get('members')
  getMembers(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getMembers(tenantId);
  }

  @TenantRoles('admin', 'moderator', 'user')
  @Get('banned-users')
  getBannedUsers(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getBannedUsers(tenantId);
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('moderate_members')
  @Delete('banned-users/:userId')
  revertBan(
    @ActiveTenantId() tenantId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() currentUserId: string,
  ) {
    return this.groupAdminService.revertBan(
      tenantId,
      currentUserId,
      targetUserId,
    );
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('moderate_members')
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
  @Post('transfer-ownership')
  transferOwnership(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() currentUserId: string,
    @Body('targetUserId') targetUserId: string,
  ) {
    return this.groupAdminService.transferOwnership(
      tenantId,
      currentUserId,
      targetUserId,
    );
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('moderate_members')
  @Delete('members/:userId')
  removeMember(
    @ActiveTenantId() tenantId: string,
    @Param('userId') targetUserId: string,
    @CurrentUserId() currentUserId: string,
    @Query('ban') ban?: string,
  ) {
    return this.groupAdminService.removeMember(
      tenantId,
      currentUserId,
      targetUserId,
      ban === 'true',
    );
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('edit_group_general')
  @Patch('settings')
  renameGroup(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: RenameGroupDto,
  ) {
    return this.groupAdminService.renameGroup(
      tenantId,
      userId,
      body.name,
      body.avatarUrl,
    );
  }

  @TenantRoles('admin', 'moderator', 'user')
  @Get('permissions')
  getPermissions(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getPermissions(tenantId);
  }

  @TenantRoles('admin')
  @Patch('permissions')
  updatePermissions(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: UpdateGroupPermissionsDto,
  ) {
    return this.groupAdminService.updatePermissions(
      tenantId,
      userId,
      body.permissions,
    );
  }

  @TenantRoles('admin')
  @Patch('password')
  updatePassword(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: UpdateGroupPasswordDto,
  ) {
    return this.groupAdminService.updatePassword(
      tenantId,
      userId,
      body.oldPassword,
      body.newPassword,
    );
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('edit_schedule')
  @Patch('schedule-config')
  updateScheduleConfig(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: UpdateScheduleConfigDto,
  ) {
    return this.groupAdminService.updateScheduleConfig(
      tenantId,
      userId,
      body.scheduleConfig,
    );
  }

  @TenantRoles('admin')
  @Delete('')
  deleteGroup(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.groupAdminService.deleteGroup(tenantId, userId);
  }

  @TenantRoles('admin', 'moderator')
  @Delete('cleanup/old-items')
  cleanupOldItems(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.groupAdminService.cleanupOldItems(tenantId, userId);
  }

  @TenantRoles('admin', 'moderator', 'user')
  @Get('subjects')
  getSubjects(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getSubjects(tenantId);
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('edit_subjects_courses')
  @Post('subjects')
  createSubject(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateSubjectDto,
  ) {
    return this.groupAdminService.createSubject(tenantId, userId, body.name);
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('edit_subjects_courses')
  @Patch('subjects/:id')
  updateSubject(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateSubjectDto,
  ) {
    return this.groupAdminService.updateSubject(tenantId, userId, id, {
      name: body.name,
      isActive: body.isActive,
    });
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('edit_subjects_courses')
  @Delete('subjects/:id')
  deleteSubject(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteSubject(tenantId, userId, id);
  }

  @TenantRoles('admin', 'moderator', 'user')
  @Get('schedule')
  getSchedule(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getSchedule(tenantId);
  }

  @TenantRoles('admin', 'moderator', 'user')
  @Get('schedule/subs')
  getScheduleSubs(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getScheduleSubs(tenantId);
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('manage_schedule_changes')
  @Post('schedule/subs')
  createScheduleSub(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateScheduleSubDto,
  ) {
    return this.groupAdminService.createScheduleSub(tenantId, userId, body);
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('manage_schedule_changes')
  @Delete('schedule/subs/:id')
  deleteScheduleSub(
    @ActiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteScheduleSub(tenantId, id);
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('manage_announcements')
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
    );
  }

  @UseGuards(GroupPermissionGuard)
  @GroupPermission('manage_announcements')
  @Delete('announcements/:id')
  deleteAnnouncement(
    @ActiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteAnnouncement(tenantId, id);
  }
}
