import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdatePersonalizationDto {
  @IsBoolean()
  personalized: boolean;
}

export class UpdateSetupDto {
  @IsOptional()
  @IsUUID('all', { message: 'ungültiges Format' })
  enrKurs?: string;

  @IsOptional()
  @IsUUID('all', { message: 'ungültiges Format' })
  wpuKurs1?: string;

  @IsOptional()
  @IsUUID('all', { message: 'ungültiges Format' })
  wpuKurs2?: string;

  @IsInt({ message: 'Theater ist erforderlich' })
  @Min(0)
  theater: number;
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
}
