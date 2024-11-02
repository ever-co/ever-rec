ARG NEXT_PUBLIC_EXTENSION_NAME=Rec
ARG NEXT_PUBLIC_EXTENSION_ID=gneepehahiglangakfifnpdlppijdkck
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID
ARG NEXT_PUBLIC_EXTENTION_REDIRECT_URL
# ARG NEXT_PUBLIC_REBRANDLY_API_KEY

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_WEBSITE_URL
ARG NEXT_PUBLIC_STATIC_FILES_URL=${NEXT_PUBLIC_API_BASE_URL}
ARG NEXT_PUBLIC_SENTRY_DSN
ARG SENTRY_ORG=ever-co

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
RUN turbo prune --scope=ever-rec-portal --docker


#--
# Add lockfile and package.json's of isolated subworkspace
FROM base AS installer
USER root
WORKDIR /app

ENV NODE_ENV=build
ENV NEXT_BUILD_OUTPUT=standalone

# Install python3
RUN apk add --no-cache python3 pkgconfig build-base
RUN apk add --no-cache pixman-dev cairo-dev pango-dev jpeg-dev giflib-dev

# First install the dependencies (as they change less often)
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/.gitignore .gitignore

# Install deps
RUN cd apps/portal && pnpm install --frozen-lockfile

# Build the project
COPY --from=builder /app/out/full/ .
# Build the apps
RUN pnpm build --filter=ever-rec-portal...
# Prune dev deps
RUN cd apps/portal && (echo "Y" | pnpm prune --prod)

#--
# Build
FROM node:20-alpine

USER node
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_PUBLIC_EXTENSION_NAME=${NEXT_PUBLIC_EXTENSION_NAME}
ENV NEXT_PUBLIC_EXTENSION_ID=${NEXT_PUBLIC_EXTENSION_ID}
ENV NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}
ENV NEXT_PUBLIC_EXTENTION_REDIRECT_URL=${NEXT_PUBLIC_EXTENTION_REDIRECT_URL}
# ENV NEXT_PUBLIC_REBRANDLY_API_KEY=${NEXT_PUBLIC_REBRANDLY_API_KEY}

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
ENV NEXT_PUBLIC_WEBSITE_URL=${NEXT_PUBLIC_WEBSITE_URL}
ENV NEXT_PUBLIC_STATIC_FILES_URL=${NEXT_PUBLIC_STATIC_FILES_URL}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ENV SENTRY_ORG=${SENTRY_ORG}

COPY --from=installer --chown=node:node /app/apps/portal/.next/standalone ./
COPY --from=installer --chown=node:node /app/apps/portal/.next/static ./apps/portal/.next/static
COPY --from=installer --chown=node:node /app/apps/portal/public ./apps/portal/public

VOLUME /app/apps/portal/.next/cache

WORKDIR /app/apps/portal

ENV PORT=4200

EXPOSE 4200

CMD ["node", "server.js"]
