import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupAdminController } from './group-admin.controller';
import { GroupAdminService } from './group-admin.service';

import { ItemsModule } from '../items/items.module';

@Module({
  imports: [ItemsModule],
  controllers: [GroupController, GroupAdminController],
  providers: [GroupService, GroupAdminService],
  exports: [GroupAdminService],
})
export class GroupModule {}
