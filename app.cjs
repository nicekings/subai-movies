// CommonJS entry point for cPanel / CloudLinux Node.js Selector.
const { existsSync } = require('node:fs');
const { join } = require('node:path');

process.chdir(__dirname);
const envFile = join(__dirname, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

import('./public.ts').catch((error) => {
  console.error('SubAI Movies startup failed:', error);
  process.exitCode = 1;
});
