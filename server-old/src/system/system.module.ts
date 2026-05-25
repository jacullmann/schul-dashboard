import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { AppConfigModule } from '../config/env.config';

@Module({
  imports: [AppConfigModule],
  controllers: [SystemController],
})
export class SystemModule {}
