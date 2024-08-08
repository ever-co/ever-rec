// Check https://docs.sentry.io/platforms/javascript/configuration/webworkers/
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://5afbf303d711453cb6fd6b08951d5c70@o998199.ingest.sentry.io/6604566",  tracesSampleRate: 1.0,
});
