# The Firebase Emulator Suite (Authentication, Realtime Database, Storage) for the API's
# integration tests and the egress audit. Nothing here talks to a real Firebase project: the
# project id starts with "demo-", which the emulators keep fully local.
FROM node:22-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openjdk-17-jre-headless \
	&& rm -rf /var/lib/apt/lists/*

# firebase-tools 13 is the last line that runs on Java 17.
RUN npm install -g --ignore-scripts firebase-tools@13.35.1 \
	&& mkdir -p /emulators \
	&& chown node:node /emulators

# The emulators run as the image's unprivileged user; their binaries are fetched into its home
# at build time, so nothing is downloaded when they start.
USER node
RUN firebase setup:emulators:database \
	&& firebase setup:emulators:storage

WORKDIR /emulators
COPY --chown=node:node tools/egress-audit/emulators.firebase.json firebase.json
COPY --chown=node:node database.rules.json storage.rules ./

ENV FIREBASE_CLI_DISABLE_UPDATE_CHECK=true
EXPOSE 9099 9000 9199
CMD ["firebase", "emulators:start", "--only", "auth,database,storage", "--project", "demo-ever-rec"]
