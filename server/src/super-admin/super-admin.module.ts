import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { GroupModule } from '../group/group.module';
import { JwtModule } from '../common/jwt/jwt.module';

@Module({
  imports: [GroupModule, JwtModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService],
})
export class SuperAdminModule {}
