import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkFlagsmithHealth,
  getAllFeatureFlags,
  getFeatureValue,
  isFeatureEnabled,
} from './flagsmith.js';
import { FEATURE_FLAGS } from '@daily-dungeon/shared';

test('Flagsmith Server SDK - Connectivity & Health Check', async () => {
  const isHealthy = await checkFlagsmithHealth();
  // Either true if live key configured in local .env, or false if running in clean CI/offline mode
  assert.equal(typeof isHealthy, 'boolean');
});

test('Flagsmith Server SDK - Evaluate Environment Feature Flags', async () => {
  const isChristmasLogo = await isFeatureEnabled(FEATURE_FLAGS.CHRISTMAS_LOGO);
  assert.equal(typeof isChristmasLogo, 'boolean');

  const isCommunityStats = await isFeatureEnabled(FEATURE_FLAGS.COMMUNITY_STATS);
  assert.equal(isCommunityStats, true, 'community_stats should be enabled');

  const infoValue = await getFeatureValue(FEATURE_FLAGS.INFO_MESSAGE);
  assert.equal(infoValue, '🏆 Achievements are here');

  const isAchievements = await isFeatureEnabled(FEATURE_FLAGS.ENABLE_ACHIEVEMENTS);
  assert.equal(isAchievements, true, 'enable_achievements should be enabled');
});

test('Flagsmith Server SDK - Retrieve All Evaluated Flags Map', async () => {
  const flags = await getAllFeatureFlags();
  assert.ok(flags[FEATURE_FLAGS.COMMUNITY_STATS], 'Flags map should contain community_stats');
  assert.equal(flags[FEATURE_FLAGS.COMMUNITY_STATS].enabled, true);
  assert.ok(flags[FEATURE_FLAGS.ENABLE_ACHIEVEMENTS], 'Flags map should contain enable_achievements');
});

test('Flagsmith Server SDK - Fallback Gracefully for Unknown Flags', async () => {
  const unknownFlag = await isFeatureEnabled('non_existent_flag_xyz');
  assert.equal(unknownFlag, false, 'Unknown flag should safely fallback to false');
});
