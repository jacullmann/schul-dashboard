import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { AppConfigModule } from '../config/env.config';

@Module({
  imports: [AppConfigModule],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
