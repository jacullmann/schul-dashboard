import { Module } from '@nestjs/common';
import { DocController } from './doc.controller';
import { DocService } from './doc.service';
import { DocGateway } from './doc.gateway';
import { AppConfigModule } from '../config/env.config';
import { JwtModule } from '../common/jwt/jwt.module';

@Module({
  imports: [AppConfigModule, JwtModule],
  controllers: [DocController],
  providers: [DocService, DocGateway],
})
export class DocModule {}
