# Sentry Monitoring Setup

`ps_app` uses `@sentry/react-native` with the Expo config plugin and Sentry Metro config.

## Runtime behavior

- Sentry initializes from `lib/sentry.ts`.
- Production and preview builds enable performance tracing with conservative sampling.
- Development builds keep logs and full tracing enabled for debugging.
- Release metadata is derived from Expo config and Expo Updates:
  - `release`: `<bundle-id>@<expo.version>+<nativeBuildVersion>`
  - `dist`: `<nativeBuildVersion>`
  - tags/context: Expo channel, runtime version, update id

## EAS Build sourcemaps

- The Expo plugin is configured in `app.config.js`.
- Metro uses `getSentryExpoConfig` in `metro.config.js`.
- EAS Build must have `SENTRY_AUTH_TOKEN` available as a secret env var.
- Do not set `SENTRY_DISABLE_AUTO_UPLOAD=true` for production builds, or source map upload is skipped.

## Alert rules

The current auth token in this repo does not have permission to manage Sentry project rules through the API, so these need to be created in the Sentry UI for `big-zk / ps_app`:

1. Issue alert: `level:error` or `level:fatal`, environment `production`, count above 5 in 10 minutes.
2. Issue alert: any new `fatal` event in production, notify immediately.
3. Metric alert: crash-free session rate below `99.5%` in production over 30 minutes.
4. Metric alert: crash-free user rate below `99.0%` in production over 30 minutes.

Prefer routing these alerts to the on-call or engineering notification channel rather than email-only delivery.
