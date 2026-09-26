# schul-dashboard

Web platform for schools and student groups.

## Stack

- Vue 3
- TypeScript
- Rust
- PostgreSQL
- Docker

## Setup

```bash
git clone https://github.com/jacullmann/schul-dashboard.git
cd schul-dashboard
```

## Services

- app/
- server/
- homepage/
- geoip-service/

## Local database

`compose.yaml` runs the same Postgres image as production (`database/Dockerfile`,
Postgres 18 + pg_cron), bound to `127.0.0.1` only. Use it for running the server
locally and for regenerating the sqlx query cache.

```bash
docker compose up -d --wait db
```

Copy `server/.env.example` to `server/.env`; its `DATABASE_URL` already points at
this database. Set `POSTGRES_PORT` if port 5432 is taken, and adjust the URL to match.

Reset the database (for example after editing an already-applied migration):

```bash
docker compose down -v
```

## sqlx query cache

`server/.cargo/config.toml` sets `SQLX_OFFLINE=true`, so `cargo build` and the
Docker build check queries against `server/.sqlx` and never need a database.
After changing a query or adding a migration, regenerate the cache and commit
`server/.sqlx` together with the change:

```bash
cargo install sqlx-cli --version 0.9.0 --locked --no-default-features --features postgres,rustls
```

From `server/`:

```bash
cargo sqlx migrate run
```

```bash
cargo sqlx prepare
```

The `Server CI` workflow runs `cargo sqlx prepare --check` against a fresh
database on every pull request and fails when the committed cache is stale.