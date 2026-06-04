# Database: PostgreSQL 18 + pg_cron

This directory contains the custom Postgres image and the cleanup setup for the
application. Database maintenance (expired tokens, expired MFA pendings, old
group messages) runs via **pg_cron** *inside* the database — deliberately
decoupled from the application process.

**Why not in the app code?** The deploy pipeline (GitHub Actions -> Coolify
webhook) restarts the app container on every deploy, which resets in-memory
timers (`tokio::interval`). Cleanup jobs with multi-hour intervals would
therefore almost never fire. pg_cron runs in the DB container and is unaffected.

---

## Architecture

| Item            | Value                                                       |
|-----------------|-------------------------------------------------------------|
| Base image      | `postgres:18` + `postgresql-18-cron` (see `Dockerfile`)     |
| Registry        | `ghcr.io/jacullmann/schul-dashboard-database`               |
| Target database | `postgres` (the app uses the default DB, no separate one)   |
| DB user         | `postgres`                                                  |
| Schedule        | every 6h, staggered on minute 0 / 15 / 30                   |
| Retention       | tokens 7 days, messages 7 days                              |

### Files
- `Dockerfile` — Postgres 18 with pg_cron, built by GitHub Actions.
- `pg_cron_setup.sql` — one-time scheduling (`CREATE EXTENSION` + `cron.schedule`).
- The cleanup **functions** are created by the app migration
  `server/migrations/0006_consolidate_cleanup.sql`, not here.

---

## Bootstrap (setting up the environment from scratch)

These steps are **one-time per environment** and run manually. Reason: two of
them touch the persistent data volume / the Coolify UI and cannot be enforced
via the image or CI. Follow the order exactly.

### 1. Build the image
Commit and push `database/**` -> the `deploy-database.yaml` workflow builds the
image and pushes it to GHCR (tags `latest`, `18`, `sha-<commit>`). No manual
`docker build`.

### 2. Set the image in Coolify
In Coolify, on the DB resource (`db-prod`) -> **General** -> **Image**, set an
immutable tag:
```
ghcr.io/jacullmann/schul-dashboard-database:sha-<commit>
```
Then start/deploy. The data volume is preserved.

> **If a name conflict appears when swapping the image**
> (`Conflict. The container name "..." is already in use`): remove the stale
> container from the **server terminal** (not the DB terminal), then start again
> in Coolify:
> ```bash
> docker rm -f <container-id-or-name-from-the-error>
> ```

### 3. Enable pg_cron in `postgresql.conf`
Coolify's "Custom PostgreSQL Configuration" field has a bug in v4 (input
disappears / container becomes unhealthy). So write the config directly into the
real `postgresql.conf` in the data volume. **Do not guess the path** — on PG18
it is not under `/var/lib/postgresql/data`. Resolve it dynamically.

In the **DB container terminal**:
```bash
CF=$(psql -U postgres -tA -c "SHOW config_file;")
echo "Config: $CF"
echo "shared_preload_libraries = 'pg_cron'" >> "$CF"
echo "cron.database_name = 'postgres'"       >> "$CF"
tail -n 5 "$CF"   # verify
```
Leave the Coolify field **empty** — otherwise Coolify starts Postgres with
`-c config_file=...` pointing at a different file and ignores these lines.

### 4. Restart the DB
In Coolify, **Restart** the DB resource (not just reload —
`shared_preload_libraries` requires a full restart). Then check:
```bash
psql -U postgres -c "SHOW shared_preload_libraries;"   # must show pg_cron
```

### 5. Apply the migration (create functions) — BEFORE scheduling
The cleanup functions must exist before the cron jobs call them.
`sqlx::migrate!` embeds migrations at **compile time**, so rebuild and deploy
the `server` image (push to `server/**`). On startup the server applies
`0006_consolidate_cleanup.sql`, creating:
`cleanup_expired_refresh_tokens` (7 days), `cleanup_expired_mfa_pending`,
`cleanup_old_group_messages` (two-step, to survive `ON DELETE CASCADE`).

> If you schedule the jobs *before* the migration, they run into nothing and
> report `failed` until the functions exist.

### 6. Activate scheduling
In the **DB container terminal**, run the contents of `pg_cron_setup.sql`:
```bash
psql -U postgres -d postgres
```
Then paste the SQL (or pipe it in). The three jobs are created idempotently by
their `jobname` — re-running updates them instead of creating duplicates.

---

## Verification

```sql
-- Scheduled jobs (expect three cleanup-*, active = true)
SELECT jobid, schedule, command, database, active, jobname FROM cron.job;

-- Functions present? (all three cleanup_* must be listed)
\df cleanup_*

-- Run history (status should be 'succeeded', not 'failed')
SELECT jobname, status, return_message, start_time, end_time
FROM cron.job_run_details
ORDER BY start_time DESC LIMIT 20;
```

A single job can be triggered manually for testing:
```sql
SELECT public.cleanup_expired_refresh_tokens();
SELECT public.cleanup_expired_mfa_pending();
SELECT public.cleanup_old_group_messages();
```

---

## Maintenance

- **PG major upgrade (e.g. 18 -> 19):** in the `Dockerfile`, bump
  `FROM postgres:NN` and the `postgresql-NN-cron` package, and the
  `type=raw,value=NN` tag in the workflow. Then redo steps 1-2 (new image), and
  3-4 if the data volume was re-initialized.
- **Change retention/interval:** adjust the cron expressions in
  `pg_cron_setup.sql` and re-run (idempotent). The retention logic itself lives
  in the functions -> change it via a new migration.
- **Pause a job:** `SELECT cron.unschedule('cleanup-group-messages');`
