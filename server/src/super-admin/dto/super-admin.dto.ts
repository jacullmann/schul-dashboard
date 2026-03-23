import {
  IsString,
  IsBoolean,
  IsOptional,
  IsInt,
  IsIn,
  IsUUID,
  Length,
} from 'class-validator';

/** Only 'superadmin' (promote/demote globally) and 'user' (revoke) are
 *  valid targets for the super-admin role-update endpoint. */
export class UpdateUserRoleDto {
  @IsString()
  @IsIn(['superadmin', 'user'])
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
