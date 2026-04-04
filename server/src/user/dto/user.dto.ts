import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePersonalizationDto {
  @IsBoolean()
  personalized: boolean;
}

export class CourseSelectionDto {
  @IsUUID('all', { message: 'Invalid format for subject ID.' })
  subjectId: string;

  @IsUUID('all', { message: 'Invalid format for course ID.' })
  courseId: string;
}

export class UpdateSetupDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseSelectionDto)
  courses: CourseSelectionDto[];
}

export class VisibilityStatusDto {
  @IsIn(['archived', 'kept'])
  status: string;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsIn(['system', 'light', 'dark'])
  theme?: string;

  @IsOptional()
  @IsIn(['de', 'en'])
  language?: string;

  @IsOptional()
  personalized?: string | boolean;

  @IsOptional()
  @IsUUID('all', { message: 'Invalid format for default group ID.' })
  defaultGroupId?: string;
}
