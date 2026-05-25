import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { AppConfigModule } from '../config/env.config';
import { JwtModule } from '../common/jwt/jwt.module';

@Module({
  imports: [AppConfigModule, JwtModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
