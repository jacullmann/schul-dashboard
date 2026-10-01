FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_CLOUDINARY_CLOUD_NAME
ARG VITE_HOMEPAGE_URL

ENV NODE_ENV=production
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLOUDINARY_CLOUD_NAME=$VITE_CLOUDINARY_CLOUD_NAME
ENV VITE_HOMEPAGE_URL=$VITE_HOMEPAGE_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM nginx:alpine AS runner

ARG VITE_API_URL

COPY nginx/render-security-headers.sh nginx/security-headers.conf.template /tmp/nginx/
RUN mkdir -p /etc/nginx/snippets \
    && /tmp/nginx/render-security-headers.sh \
        /tmp/nginx/security-headers.conf.template /etc/nginx/snippets/security-headers.conf \
    && rm -r /tmp/nginx

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80