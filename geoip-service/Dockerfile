# Stage 1: Build dependencies and compile release binary
FROM rust:1.86-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a dummy cargo project to cache dependencies
RUN cargo new --bin geoip-service
WORKDIR /app/geoip-service

COPY Cargo.toml ./

# Compile dependencies to cache them in the Docker layer
RUN cargo build --release

# Delete dummy source files
RUN rm src/*.rs

# Copy real source code
COPY src ./src

# Rebuild with real source code (using standard Cargo mechanisms)
RUN touch src/main.rs && cargo build --release

# Stage 2: Create minimal runner container
FROM debian:bookworm-slim

WORKDIR /app

# Install CA certificates for TLS downloads and curl for health-checks
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary from builder stage
COPY --from=builder /app/geoip-service/target/release/geoip-service /app/geoip-service

# Setup default directories and environment variables
RUN mkdir -p /app/data
ENV PORT=8080
ENV GEOIP_DATABASE_PATH=/app/data/GeoLite2-City.mmdb

# Expose internal port
EXPOSE 8080

# Command to run the microservice
CMD ["/app/geoip-service"]
