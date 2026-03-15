import { IsOptional, IsString, Length } from 'class-validator';

export class CreateTodoDto {
  @IsString()
  @Length(1, 100)
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}

export class UpdateTodoDto {
  @IsString()
  @Length(1, 100)
  title: string;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}

export class ReorderTodoDto {
  @IsOptional()
  @IsString()
  prevPosition?: string | null;

  @IsOptional()
  @IsString()
  nextPosition?: string | null;
}
