import { spawnSync } from 'node:child_process';

type TargetEnvironment = 'production' | 'preview' | 'both';
type EASEnvironment = Exclude<TargetEnvironment, 'both'>;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

function printUsage(): void {
  console.log([
    'Usage: npx tsx scripts/setup-eas-hosting-env.ts [production|preview|both]',
    '',
    'Examples:',
    '  npx tsx scripts/setup-eas-hosting-env.ts production',
    '  npx tsx scripts/setup-eas-hosting-env.ts preview',
    '  npx tsx scripts/setup-eas-hosting-env.ts both',
  ].join('\n'));
}

function runEasCommand(args: string[]): void {
  const result = spawnSync('eas', args, { stdio: 'inherit' });

  if (result.error) {
    console.error('Failed to run the eas CLI. Install it with: npm install -g eas-cli');
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function createVars(environment: EASEnvironment): void {
  console.log(`Creating EAS env vars for ${environment}...`);

  runEasCommand([
    'env:create',
    '--name',
    'EXPO_PUBLIC_SUPABASE_URL',
    '--value',
    SUPABASE_URL,
    '--environment',
    environment,
    '--visibility',
    'plaintext',
    '--non-interactive',
  ]);

  runEasCommand([
    'env:create',
    '--name',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    '--value',
    SUPABASE_PUBLISHABLE_KEY,
    '--environment',
    environment,
    '--visibility',
    'plaintext',
    '--non-interactive',
  ]);

  console.log(`Created vars for ${environment}.`);
  runEasCommand(['env:list', '--environment', environment]);
}

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set in environment');
  process.exit(1);
}

const rawTargetEnvironment = process.argv[2] ?? 'production';

if (rawTargetEnvironment === 'help' || rawTargetEnvironment === '--help' || rawTargetEnvironment === '-h') {
  printUsage();
  process.exit(0);
}

if (!['production', 'preview', 'both'].includes(rawTargetEnvironment)) {
  printUsage();
  process.exit(1);
}

const targetEnvironment = rawTargetEnvironment as TargetEnvironment;

if (targetEnvironment === 'both') {
  createVars('production');
  createVars('preview');
} else {
  createVars(targetEnvironment);
}
