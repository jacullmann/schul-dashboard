FROM lukemathwalker/cargo-chef:latest-rust-1.95-slim-bookworm AS chef
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
        pkg-config \
        libssl-dev \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json
RUN cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN cargo build --release --bin geoip-service

FROM debian:bookworm-slim AS runtime
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --no-create-home app

COPY --from=builder /app/target/release/geoip-service /app/geoip-service

RUN mkdir -p /app/data && chown app:app /app/data

USER app

ENV PORT=8080
ENV GEOIP_DATABASE_PATH=/app/data/GeoLite2-City.mmdb

EXPOSE 8080

ENTRYPOINT ["/app/geoip-service"]
