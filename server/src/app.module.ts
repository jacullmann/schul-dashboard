import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TodosModule } from './todos/todos.module';
import { GroupModule } from './group/group.module';
import { ItemsModule } from './items/items.module';
import { TimetableModule } from './timetable/timetable.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { MfaModule } from './mfa/mfa.module';
import { DocModule } from './doc/doc.module';
import { EmailModule } from './common/email/email.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { validate } from './config/env.config';
import { SystemModule } from './system/system.module';
import { OAuthModule } from './oauth/oauth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validate: validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 400,
      },
    ]),
    SystemModule,
    SupabaseModule,
    EmailModule,
    AuthModule,
    UserModule,
    TodosModule,
    GroupModule,
    ItemsModule,
    TimetableModule,
    SuperAdminModule,
    MfaModule,
    DocModule,
    OAuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*path');
  }
}
