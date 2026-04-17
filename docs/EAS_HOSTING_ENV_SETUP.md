# EAS Hosting Environment Variables

## Goal

Configure the Supabase environment variables that Expo API routes use when deployed to EAS Hosting.

## Required Variables

| Name | Value |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | `[REDACTED_SUPABASE_URL]/` |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `[REDACTED_PUBLISHABLE_KEY]` |

These values currently match the values already present in `eas.json`, but EAS Hosting API routes should also have them configured in EAS environment variables.

## One-Time Prerequisites

```bash
npx eas-cli@latest login
```

## Exact Commands

### Production

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "[REDACTED_SUPABASE_URL]/" --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "[REDACTED_PUBLISHABLE_KEY]" --environment production
```

### Preview (optional)

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "[REDACTED_SUPABASE_URL]/" --environment preview
eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "[REDACTED_PUBLISHABLE_KEY]" --environment preview
```

## Recommended Non-Interactive Version

For scripts and CI-friendly setup, make the variables explicit `plaintext` values so the command does not prompt for visibility.

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "[REDACTED_SUPABASE_URL]/" --environment production --visibility plaintext --non-interactive
eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "[REDACTED_PUBLISHABLE_KEY]" --environment production --visibility plaintext --non-interactive
```

Optional preview setup:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "[REDACTED_SUPABASE_URL]/" --environment preview --visibility plaintext --non-interactive
eas env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value "[REDACTED_PUBLISHABLE_KEY]" --environment preview --visibility plaintext --non-interactive
```

## Helper Script

This repo includes a helper script that creates the variables and then lists the configured values for the selected environment:

```bash
npx tsx scripts/setup-eas-hosting-env.ts production
npx tsx scripts/setup-eas-hosting-env.ts preview
npx tsx scripts/setup-eas-hosting-env.ts both
```

## Check Current Variables

```bash
eas env:list
eas env:list --environment production
eas env:list --environment preview
```

## Deploy Notes

- `EXPO_PUBLIC_*` variables are safe to keep as `plaintext` because they are public client-facing values.
- For EAS Hosting and API routes, do not rely only on `eas.json` build profile `env` values.
- After creating the environment variables, deploy with the matching environment:

```bash
eas deploy --environment production
```

Or for preview:

```bash
eas deploy --environment preview
```
