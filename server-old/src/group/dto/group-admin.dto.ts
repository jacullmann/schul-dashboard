import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChangeMemberRoleDto {
  @IsIn(['user', 'moderator', 'admin'])
  role: string;
}

export class RenameGroupDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class ScheduleConfigDto {
  @IsOptional()
  @IsObject()
  breaks?: Record<number, number>;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsInt()
  totalSlots?: number;

  @IsOptional()
  @IsInt()
  lessonDurationMins?: number;
}

export class UpdateScheduleConfigDto {
  @ValidateNested()
  @Type(() => ScheduleConfigDto)
  scheduleConfig: ScheduleConfigDto;
}

export class UpdateGroupPasswordDto {
  @IsString()
  @Length(1, 100)
  oldPassword: string;

  @IsString()
  @Length(1, 100)
  newPassword: string;
}

export class CreateScheduleSubDto {
  @IsUUID()
  lessonId: string;

  @IsOptional()
  @IsInt()
  day?: number;

  @IsOptional()
  @IsInt()
  slot?: number;

  @IsOptional()
  @IsInt()
  duration?: number;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  teacher?: string;

  @IsOptional()
  @IsString()
  room?: string;

  @IsOptional()
  @IsBoolean()
  cancelled?: boolean;

  @IsOptional()
  @IsBoolean()
  hide?: boolean;
}

export class CreateAnnouncementDto {
  @IsString()
  @Length(1)
  content: string;

  @IsOptional()
  @IsIn(['info', 'warn', 'danger'])
  color?: string;
}

export class CreateSubjectDto {
  @IsString()
  @Length(1, 100)
  name: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class GroupPermissionsDto {
  @IsOptional()
  @IsIn(['user', 'moderator', 'admin'])
  edit_group_general?: string;

  @IsOptional()
  @IsIn(['moderator', 'admin'])
  edit_subjects_courses?: string;

  @IsOptional()
  @IsIn(['moderator', 'admin'])
  edit_schedule?: string;

  @IsOptional()
  @IsIn(['user', 'moderator', 'admin'])
  create_items?: string;

  @IsOptional()
  @IsIn(['user', 'moderator', 'admin'])
  upload_images?: string;

  @IsOptional()
  @IsIn(['user', 'moderator', 'admin'])
  manage_notes?: string;

  @IsOptional()
  @IsIn(['user', 'moderator', 'admin'])
  send_messages?: string;

  @IsOptional()
  @IsIn(['user', 'moderator', 'admin'])
  manage_schedule_changes?: string;

  @IsOptional()
  @IsIn(['moderator', 'admin'])
  manage_announcements?: string;

  @IsOptional()
  @IsIn(['moderator', 'admin'])
  moderate_members?: string;

  @IsOptional()
  @IsIn(['moderator', 'admin'])
  delete_other_content?: string;
}

export class UpdateGroupPermissionsDto {
  @ValidateNested()
  @Type(() => GroupPermissionsDto)
  permissions: GroupPermissionsDto;
}

