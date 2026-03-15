import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private clientInstance: SupabaseClient<any> | null = null;

  constructor(private readonly configService: ConfigService) {}

  getClient(): SupabaseClient<any> {
    if (this.clientInstance) {
      return this.clientInstance;
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error(
        'Supabase credentials not found in environment variables',
      );
      throw new Error('Supabase configuration missing');
    }

    this.clientInstance = createClient<any>(supabaseUrl, supabaseKey);
    return this.clientInstance;
  }
}
