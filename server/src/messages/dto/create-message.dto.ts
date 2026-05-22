import { IsString, Length, IsOptional, IsUUID } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @Length(1, 1000)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
