import { Module } from '@nestjs/common';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { GroupAdminController } from './group-admin.controller';
import { GroupAdminService } from './group-admin.service';
import { AppConfigModule } from '../config/env.config';
import { JwtModule } from '../common/jwt/jwt.module';

@Module({
  imports: [AppConfigModule, JwtModule],
  controllers: [GroupController, GroupAdminController],
  providers: [GroupService, GroupAdminService],
  exports: [GroupAdminService],
})
export class GroupModule {}
