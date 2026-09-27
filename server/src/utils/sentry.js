import * as Sentry from "@sentry/node";

export const captureError = (error, tags) => {
  if (!Sentry.getClient()) return;

  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(tags ?? {})) {
      if (value === undefined || value === null) continue;
      scope.setTag(key, String(value));
    }
    Sentry.captureException(error);
  });
};

export const setSentryUser = (user) => {
  if (!Sentry.getClient() || !user) return;
  Sentry.setUser({ id: user.id, username: user.name ?? undefined });
};
