import { IsString, Length } from 'class-validator';

export class LinkGoogleAccountDto {
  @IsString()
  @Length(8, 255, { message: 'Invalid credentials.' })
  password: string;
}
