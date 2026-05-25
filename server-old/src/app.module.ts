import { APP_GUARD } from '@nestjs/core';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { TodosModule } from './todos/todos.module';
import { GroupModule } from './group/group.module';
import { ItemsModule } from './items/items.module';
import { ScheduleModule } from './schedule/schedule.module';
import { MessagesModule } from './messages/messages.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { MfaModule } from './mfa/mfa.module';
import { EmailModule } from './common/email/email.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { JwtModule } from './common/jwt/jwt.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { AppConfigModule, validate } from './config/env.config';
import { SystemModule } from './system/system.module';
import { OAuthModule } from './oauth/oauth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

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
        limit: 300,
      },
    ]),
    // AppConfigModule is @Global() — AppConfig is available in all modules.
    AppConfigModule,
    // JwtModule is imported globally so guards can inject JwtService.
    JwtModule,
    SystemModule,
    SupabaseModule,
    EmailModule,
    AuthModule,
    UserModule,
    TodosModule,
    GroupModule,
    ItemsModule,
    ScheduleModule,
    MessagesModule,
    SuperAdminModule,
    MfaModule,
    OAuthModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*path');
  }
}
