#!/usr/bin/env node

/**
 * Daily Dungeon - Agent Worktree Management CLI
 * Creates, lists, and tears down isolated Git worktrees for concurrent agents.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const worktreesParentDir = path.resolve(rootDir, '..', 'daily-dungeon-worktrees');

function runGit(args, cwd = rootDir) {
  return execSync(`git ${args}`, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function normalizeSlug(raw) {
  return raw
    .trim()
    .replace(/^(feat\/|fix\/|refactor\/)/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .toLowerCase();
}

const command = process.argv[2];
const targetName = process.argv[3];

function printHelp() {
  console.log(`
🛡️  DAILY DUNGEON — AGENT WORKTREE TOOL

Usage:
  npm run worktree:create <slug>   Create an isolated worktree for an agent
  npm run worktree:list            List all active worktrees
  npm run worktree:remove <slug>   Tear down an agent's worktree

Examples:
  npm run worktree:create flagsmith-integration
  npm run worktree:remove flagsmith-integration
  npm run worktree:list
`);
}

switch (command) {
  case 'create': {
    if (!targetName) {
      console.error('✖ Error: Feature slug required. Example: npm run worktree:create flagsmith-integration');
      process.exit(1);
    }

    const slug = normalizeSlug(targetName);
    const branch = `feat/${slug}`;
    const targetDir = path.join(worktreesParentDir, slug);

    if (fs.existsSync(targetDir)) {
      console.error(`✖ Error: Worktree directory already exists at: ${targetDir}`);
      process.exit(1);
    }

    if (!fs.existsSync(worktreesParentDir)) {
      fs.mkdirSync(worktreesParentDir, { recursive: true });
    }

    console.log(`🔄 Fetching latest origin/main...`);
    try {
      runGit('fetch origin main');
    } catch {
      console.warn('⚠️  Could not fetch origin main (offline or remote unavailable). Continuing with local base...');
    }

    // Check if branch already exists
    let branchExists = false;
    try {
      runGit(`rev-parse --verify ${branch}`);
      branchExists = true;
    } catch {
      branchExists = false;
    }

    console.log(`🌿 Creating worktree at: ${targetDir}`);
    if (branchExists) {
      console.log(`   Reusing existing branch ${branch}`);
      runGit(`worktree add "${targetDir}" ${branch}`);
    } else {
      console.log(`   Creating new branch ${branch} from origin/main`);
      try {
        runGit(`worktree add -b ${branch} "${targetDir}" origin/main`);
      } catch {
        // Fallback to local main if origin/main not resolved
        runGit(`worktree add -b ${branch} "${targetDir}" main`);
      }
    }

    // Copy .env if available
    const envSource = path.join(rootDir, '.env');
    const envTarget = path.join(targetDir, '.env');
    if (fs.existsSync(envSource)) {
      fs.copyFileSync(envSource, envTarget);
      console.log(`📋 Copied .env configuration to worktree.`);
    }

    // Link or setup node_modules for instant readiness
    const nmSource = path.join(rootDir, 'node_modules');
    const nmTarget = path.join(targetDir, 'node_modules');
    if (fs.existsSync(nmSource) && !fs.existsSync(nmTarget)) {
      try {
        fs.symlinkSync(nmSource, nmTarget, 'junction');
        console.log(`⚡ Linked root node_modules via NTFS junction (instant readiness).`);
      } catch (err) {
        console.warn(`⚠️  Could not create node_modules junction (${err.message}). Run 'npm install' in worktree.`);
      }
    }

    // Link infra node_modules if present
    const infraNmSource = path.join(rootDir, 'infra', 'node_modules');
    const infraNmTarget = path.join(targetDir, 'infra', 'node_modules');
    if (fs.existsSync(infraNmSource) && !fs.existsSync(infraNmTarget)) {
      try {
        fs.symlinkSync(infraNmSource, infraNmTarget, 'junction');
        console.log(`⚡ Linked infra/node_modules via NTFS junction.`);
      } catch (err) {
        console.warn(`⚠️  Could not create infra node_modules junction (${err.message}).`);
      }
    }

    console.log(`\n=======================================================`);
    console.log(`✅ AGENT WORKTREE READY:`);
    console.log(`   Directory: ${targetDir}`);
    console.log(`   Branch:    ${branch}`);
    console.log(`=======================================================`);
    console.log(`\nLaunch your agent or open your editor at:`);
    console.log(`   ${targetDir}\n`);
    break;
  }

  case 'list': {
    console.log(`\nActive Git Worktrees:`);
    console.log(runGit('worktree list'));
    console.log();
    break;
  }

  case 'remove': {
    if (!targetName) {
      console.error('✖ Error: Feature slug required. Example: npm run worktree:remove flagsmith-integration');
      process.exit(1);
    }

    const slug = normalizeSlug(targetName);
    const targetDir = path.join(worktreesParentDir, slug);

    console.log(`🗑️  Removing worktree at: ${targetDir}`);
    try {
      runGit(`worktree remove "${targetDir}" --force`);
      console.log(`✔ Git worktree removed.`);
    } catch (err) {
      console.warn(`⚠️  git worktree remove notice: ${err.message}`);
    }

    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
      console.log(`✔ Directory cleaned up.`);
    }

    console.log(`✅ Agent worktree '${slug}' teardown complete.\n`);
    break;
  }

  default:
    printHelp();
    break;
}
