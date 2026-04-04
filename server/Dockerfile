FROM node:22 AS builder
WORKDIR /app
ENV NODE_ENV=development
RUN corepack enable pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable pnpm
COPY pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]