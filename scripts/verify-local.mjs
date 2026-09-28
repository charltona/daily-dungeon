#!/usr/bin/env node

/**
 * Daily Dungeon - Autonomous Local Verification Harness
 * Verifies unit tests, monorepo build, PostgreSQL migrations, Docker config, and CDK synthesis.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const dockerCmd = isWindows ? 'docker.exe' : 'docker';

function runStep(name, cmd, args, cwd = rootDir) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    console.log(`\n========================================`);
    console.log(`▶ [STEP] ${name}`);
    console.log(`  Running: ${cmd} ${args.join(' ')} (in ${cwd})`);
    console.log(`========================================`);

    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env },
    });

    child.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(2);
      if (code === 0) {
        console.log(`✔ [PASS] ${name} completed in ${duration}s\n`);
        resolve();
      } else {
        console.error(`✖ [FAIL] ${name} failed with exit code ${code} (${duration}s)\n`);
        reject(new Error(`Step failed: ${name}`));
      }
    });

    child.on('error', (err) => {
      console.error(`✖ [ERROR] ${name} failed to start:`, err.message);
      reject(err);
    });
  });
}

async function runAutonomousVerification() {
  const suiteStart = Date.now();
  console.log(`\n🛡️  DAILY DUNGEON — AUTONOMOUS LOCAL VERIFICATION SUITE`);
  console.log(`   Time: ${new Date().toISOString()}`);

  try {
    // 1. Shared Unit Tests
    await runStep(
      'Unit Tests (@daily-dungeon/shared)',
      npmCmd,
      ['test', '--workspace=@daily-dungeon/shared']
    );

    // 2. Monorepo Build (shared, server, client)
    await runStep(
      'Monorepo Build (TypeScript & Vite)',
      npmCmd,
      ['run', 'build']
    );

    // 2b. Server Unit Tests (Flagsmith & services)
    await runStep(
      'Server Unit Tests (@daily-dungeon/server)',
      npmCmd,
      ['test', '--workspace=@daily-dungeon/server']
    );

    // 3. Database Check & Migrations
    await runStep(
      'PostgreSQL Database Connectivity',
      npmCmd,
      ['run', 'db:check', '--workspace=@daily-dungeon/server']
    );

    await runStep(
      'Database Migrations (Drizzle ORM)',
      npmCmd,
      ['run', 'db:migrate', '--workspace=@daily-dungeon/server']
    );

    // 4. AWS CDK Infrastructure Unit Tests & Synthesis Gate
    await runStep(
      'AWS CDK Infrastructure Unit Tests',
      npmCmd,
      ['test'],
      path.join(rootDir, 'infra')
    );

    await runStep(
      'AWS CDK Infrastructure Synthesis (ECS & Aurora Stack)',
      npxCmd,
      ['cdk', 'synth'],
      path.join(rootDir, 'infra')
    );

    // 5. Docker Compose Parity Validation
    await runStep(
      'Docker Compose Configuration & Service Parity',
      dockerCmd,
      ['compose', 'config']
    );

    const totalDuration = ((Date.now() - suiteStart) / 1000).toFixed(2);
    console.log(`=======================================================`);
    console.log(`🎉 ALL VERIFICATION CHECKS PASSED in ${totalDuration}s`);
    console.log(`   Stack is 100% verified and ready for git commit / deploy.`);
    console.log(`=======================================================\n`);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ VERIFICATION SUITE FAILED`);
    process.exit(1);
  }
}

runAutonomousVerification();
