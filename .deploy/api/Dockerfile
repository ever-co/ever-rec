ARG FIREBASE_API_KEY
ARG FIREBASE_AUTH_DOMAIN
ARG FIREBASE_DATABASE_URL
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_STORAGE_BUCKET
ARG FIREBASE_MESSAGING_SENDER_ID
ARG FIREBASE_APP_ID
ARG FIREBASE_MASUREMENT_ID

# FIREBASE ADMIN
ARG FIREBASE_ADMIN_PRIVATE_KEY
ARG FIREBASE_ADMIN_CLIENT_EMAIL

#--
# NodeJS Base
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack use pnpm@latest
# Create and set permissions for PNPM_HOME
RUN mkdir -p "$PNPM_HOME" && \
    chown -R node:node "$PNPM_HOME"


#--
FROM base AS builder
USER node
WORKDIR /app
RUN pnpm add turbo --global
COPY . .
RUN turbo prune --scope=ever-rec-api --docker

#--
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
ENV NODE_ENV=build

USER node
WORKDIR /app

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/.gitignore .gitignore

# Install deps
RUN cd apps/api && pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
# Build the apps
RUN pnpm build --filter=ever-rec-api...
# Prune dev deps
RUN cd apps/api && (echo "Y" | pnpm prune --prod)
# clean up
RUN rm -rf apps/api/src
RUN rm -rf apps/api/.turbo
RUN rm -rf apps/api/tmp_videos
RUN rm -rf apps/api/tmp_videos_fixed

#--
# Build
FROM node:20-alpine

ENV NODE_ENV=production

USER node
WORKDIR /app

COPY --from=installer --chown=node:node /app/package.json ./
COPY --from=installer --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=installer --chown=node:node /app/apps /app/apps

WORKDIR /app/apps/api

CMD ["node", "dist/main"]
