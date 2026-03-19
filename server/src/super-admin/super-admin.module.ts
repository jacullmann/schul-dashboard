import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { GroupModule } from '../group/group.module';
import { ItemsModule } from '../items/items.module';

@Module({
  imports: [GroupModule, ItemsModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
