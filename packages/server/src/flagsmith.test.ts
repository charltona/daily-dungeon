import test from 'node:test';
import assert from 'node:assert/strict';
import {
  checkFlagsmithHealth,
  getAllFeatureFlags,
  getFeatureValue,
  isFeatureEnabled,
} from './flagsmith.js';

test('Flagsmith Server SDK - Connectivity & Health Check', async () => {
  const isHealthy = await checkFlagsmithHealth();
  assert.equal(typeof isHealthy, 'boolean');
});

test('Flagsmith Server SDK - Evaluate Flags Safely', async () => {
  const isEnabled = await isFeatureEnabled('any_feature_key');
  assert.equal(typeof isEnabled, 'boolean');

  const val = await getFeatureValue('any_feature_key');
  assert.ok(val === null || typeof val === 'string' || typeof val === 'boolean' || typeof val === 'number');
});

test('Flagsmith Server SDK - Retrieve All Evaluated Flags Map', async () => {
  const flags = await getAllFeatureFlags();
  assert.ok(typeof flags === 'object' && flags !== null);
});

test('Flagsmith Server SDK - Fallback Gracefully for Unknown Flags', async () => {
  const unknownFlag = await isFeatureEnabled('non_existent_flag_xyz');
  assert.equal(unknownFlag, false, 'Unknown flag should safely fallback to false');
});
