import { Module } from '@nestjs/common';
import { DocController } from './doc.controller';
import { DocService } from './doc.service';
import { DocGateway } from './doc.gateway';

@Module({
  controllers: [DocController],
  providers: [DocService, DocGateway],
})
export class DocModule {}
