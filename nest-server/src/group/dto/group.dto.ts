import { IsString, Length, IsUUID } from 'class-validator';

export class JoinGroupDto {
  @IsString()
  @Length(1, 100)
  groupName: string;

  @IsString()
  @Length(1)
  password: string;
}

export class CreateGroupDto {
  @IsString()
  @Length(1, 100)
  groupName: string;

  @IsString()
  @Length(1)
  password: string;
}

export class SwitchGroupDto {
  @IsUUID()
  groupId: string;
}
