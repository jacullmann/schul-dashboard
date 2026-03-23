import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { AppConfigModule } from '../../config/env.config';

@Global()
@Module({
  imports: [AppConfigModule],
  providers: [SupabaseService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
