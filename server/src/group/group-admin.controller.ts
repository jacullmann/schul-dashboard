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
import { ActiveTenantId } from '../common/decorators/tenant.decorator';
import { CurrentUserId } from '../common/decorators/current-user.decorator';
import {
  ChangeMemberRoleDto,
  RenameGroupDto,
  CreateScheduleSubDto,
  CreateAnnouncementDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  UpdateGroupPasswordDto,
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

  @TenantRoles('admin')
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

  @TenantRoles('admin')
  @Patch('settings')
  renameGroup(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: RenameGroupDto,
  ) {
    return this.groupAdminService.renameGroup(tenantId, userId, body.name);
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

  // --- Subjects ---

  @TenantRoles('admin', 'moderator')
  @Get('subjects')
  getSubjects(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getSubjects(tenantId);
  }

  @TenantRoles('admin')
  @Post('subjects')
  createSubject(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateSubjectDto,
  ) {
    return this.groupAdminService.createSubject(tenantId, userId, body.name);
  }

  @TenantRoles('admin')
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

  @TenantRoles('admin')
  @Delete('subjects/:id')
  deleteSubject(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteSubject(tenantId, userId, id);
  }

  @TenantRoles('admin', 'moderator')
  @Get('schedule')
  getSchedule(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getSchedule(tenantId);
  }

  @TenantRoles('admin', 'moderator')
  @Get('schedule/subs')
  getScheduleSubs(@ActiveTenantId() tenantId: string) {
    return this.groupAdminService.getScheduleSubs(tenantId);
  }

  @TenantRoles('admin', 'moderator')
  @Post('schedule/subs')
  createScheduleSub(
    @ActiveTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Body() body: CreateScheduleSubDto,
  ) {
    return this.groupAdminService.createScheduleSub(tenantId, userId, body);
  }

  @TenantRoles('admin', 'moderator')
  @Delete('schedule/subs/:id')
  deleteScheduleSub(
    @ActiveTenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.groupAdminService.deleteScheduleSub(tenantId, id);
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
