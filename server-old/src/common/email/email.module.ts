import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { AppConfigModule } from '../../config/env.config';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
