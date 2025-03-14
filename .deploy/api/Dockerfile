ARG FIREBASE_API_KEY
ARG FIREBASE_AUTH_DOMAIN
ARG FIREBASE_DATABASE_URL
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_STORAGE_BUCKET
ARG FIREBASE_MESSAGING_SENDER_ID
ARG FIREBASE_APP_ID
ARG FIREBASE_MEASUREMENT_ID

# FIREBASE ADMIN
ARG FIREBASE_ADMIN_PRIVATE_KEY
ARG FIREBASE_ADMIN_CLIENT_EMAIL

#--
# NodeJS Base
FROM node:20-alpine AS base
# Update npm and configure corepack
RUN npm install -g npm@latest && \
    npm install -g corepack@latest && \
    npm install -g turbo@latest && \
    corepack disable && \
    corepack enable

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack use pnpm@9.9.0
# Create and set permissions for PNPM_HOME
RUN mkdir -p "$PNPM_HOME" && \
    chown -R node:node "$PNPM_HOME"


#--
FROM base AS builder
USER node
WORKDIR /app
COPY . .
RUN turbo prune --scope=ever-rec-api --docker

#--
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
USER node
WORKDIR /app

ENV NODE_ENV=build

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

USER node
WORKDIR /app

ENV NODE_ENV=production
ENV FIREBASE_API_KEY=${FIREBASE_API_KEY}
ENV FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}
ENV FIREBASE_DATABASE_URL=${FIREBASE_DATABASE_URL}
ENV FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
ENV FIREBASE_STORAGE_BUCKET=${FIREBASE_STORAGE_BUCKET}
ENV FIREBASE_MESSAGING_SENDER_ID=${FIREBASE_MESSAGING_SENDER_ID}
ENV FIREBASE_APP_ID=${FIREBASE_APP_ID}
ENV FIREBASE_MEASUREMENT_ID=${FIREBASE_MEASUREMENT_ID}
ENV FIREBASE_ADMIN_PRIVATE_KEY=${FIREBASE_ADMIN_PRIVATE_KEY}
ENV FIREBASE_ADMIN_CLIENT_EMAIL=${FIREBASE_ADMIN_CLIENT_EMAIL}

COPY --from=installer --chown=node:node /app/package.json ./
COPY --from=installer --chown=node:node /app/node_modules/ ./node_modules/
COPY --from=installer --chown=node:node /app/apps /app/apps

WORKDIR /app/apps/api

EXPOSE 3000

CMD ["node", "dist/main"]
