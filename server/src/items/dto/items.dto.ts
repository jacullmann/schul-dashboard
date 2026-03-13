import {
  IsIn,
  IsString,
  IsOptional,
  Length,
  IsArray,
  IsISO8601,
  ValidateNested,
  ArrayMaxSize,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

class ImageMetadata {
  @IsString()
  publicId: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class CreateItemDto {
  @IsIn(['homework', 'dalton', 'exam'])
  type: string;

  @IsString()
  @Length(1, 60)
  title: string;

  @IsString()
  @Length(1, 100)
  subject: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => ImageMetadata)
  images?: ImageMetadata[];

  @IsISO8601()
  dueDate: string;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  subject?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ImageMetadata)
  images?: (ImageMetadata & { createdBy?: string })[];

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}

export class CustomItemImageDto {
  @IsString()
  publicId: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

export class AddImageToItemDto {
  @ValidateNested()
  @Type(() => CustomItemImageDto)
  image: CustomItemImageDto;
}

export class UpdateEditorNoteDto {
  @IsString()
  @Length(0, 2000)
  editorNote: string;
}

export class ReportItemDto {
  @IsUUID()
  itemId: string;

  @IsString()
  @Length(1, 200)
  itemTitle: string;

  @IsIn(['illegal', 'falschinfo'])
  category: string;

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  reason?: string;
}
