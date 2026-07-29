import * as Sentry from "https://esm.sh/@sentry/deno@8.51.0";

const sentryDsn = Deno.env.get("SENTRY_DSN") || "";
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    tracesSampleRate: 1.0,
  });
}

export { Sentry };
