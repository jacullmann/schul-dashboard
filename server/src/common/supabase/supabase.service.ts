import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfig } from '../../config/env.config';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient<any> | null = null;

  constructor(private readonly appConfig: AppConfig) {}

  getClient(): SupabaseClient<any> {
    if (this.clientInstance) {
      return this.clientInstance;
    }

    const supabaseUrl = this.appConfig.supabaseUrl;
    const supabaseKey = this.appConfig.supabaseServiceRoleKey;

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        'Supabase credentials not found in environment variables',
      );
      throw new Error('Supabase configuration missing.');
    }

    this.clientInstance = createClient<any>(supabaseUrl, supabaseKey);
    return this.clientInstance;
  }
}
