FROM rust:1.95-slim-bookworm AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN cargo new --bin geoip-service
WORKDIR /app/geoip-service

COPY Cargo.toml ./

RUN cargo build --release

RUN rm src/*.rs

COPY src ./src

RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/geoip-service/target/release/geoip-service /app/geoip-service

RUN mkdir -p /app/data
ENV PORT=8080
ENV GEOIP_DATABASE_PATH=/app/data/GeoLite2-City.mmdb

EXPOSE 8080

CMD ["/app/geoip-service"]
