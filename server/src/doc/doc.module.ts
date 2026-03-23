import { Module } from '@nestjs/common';
import { DocController } from './doc.controller';
import { DocService } from './doc.service';
import { DocGateway } from './doc.gateway';
import { AppConfigModule } from '../config/env.config';

@Module({
  imports: [AppConfigModule],
  controllers: [DocController],
  providers: [DocService, DocGateway],
})
export class DocModule {}
