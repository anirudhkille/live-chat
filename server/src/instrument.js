import * as Sentry from "@sentry/node";
import { env } from "./config/env.config.js";

const IDENTITY_HEADERS = ["forwarded", "-ip", "remote-", "via", "-user"];

if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpBodies: [],
      databaseQueryData: false,
      stackFrameVariables: false,
      httpHeaders: {
        request: { deny: ["cookie", ...IDENTITY_HEADERS] },
        response: { deny: ["set-cookie", ...IDENTITY_HEADERS] },
      },
      urlQueryParams: { deny: ["code", "user"] },
    },
  });
}
