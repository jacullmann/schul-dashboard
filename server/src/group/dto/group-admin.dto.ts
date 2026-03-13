import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

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

export class CreateTimetableSubDto {
  @IsUUID()
  lessonId: string;

  @IsOptional()
  @IsString()
  day?: string;

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
  @Length(2)
  content: string;

  @IsOptional()
  @IsIn(['info', 'warn', 'danger'])
  color?: string;

  @IsOptional()
  @IsBoolean()
  showAsPopup?: boolean;
}
