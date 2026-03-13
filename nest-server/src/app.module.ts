import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CsrfMiddleware).forRoutes('*');
  }
}
