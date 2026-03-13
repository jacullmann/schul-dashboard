import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateUserRoleDto {
  @IsString()
  role: string;
}

export class ProcessReportDto {
  @IsBoolean()
  processed: boolean;
}

export class CreateSubjectDto {
  @IsString()
  @Length(2, 50)
  name: string;
}

export class AdminCreateTimetableSubDto {
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
