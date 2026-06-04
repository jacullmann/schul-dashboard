CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
               'cleanup-refresh-tokens',
               '0 */6 * * *',
               $$SELECT public.cleanup_expired_refresh_tokens()$$
       );

SELECT cron.schedule(
               'cleanup-mfa-pending',
               '15 */6 * * *',
               $$SELECT public.cleanup_expired_mfa_pending()$$
       );

SELECT cron.schedule(
               'cleanup-group-messages',
               '30 */6 * * *',
               $$SELECT public.cleanup_old_group_messages()$$
       );
