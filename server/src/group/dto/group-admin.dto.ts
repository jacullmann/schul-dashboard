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
