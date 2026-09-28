import { Flagsmith, DefaultFlag } from '@flagsmith/nodejs';
import { FeatureFlagDictionary, FeatureFlagValue } from '@daily-dungeon/shared';
import dotenv from 'dotenv';

dotenv.config();

const serverKey = process.env.FLAGSMITH_SERVER_KEY;

if (!serverKey) {
  console.warn(
    '[Flagsmith] NOTICE: FLAGSMITH_SERVER_KEY is not set. Operating in offline mode with fallback default feature flags.'
  );
}

export const flagsmith = serverKey
  ? new Flagsmith({
      environmentKey: serverKey,
      defaultFlagHandler: () => {
        return new DefaultFlag(null, false);
      },
    })
  : null;

/**
 * Check if a specific feature flag is enabled in Flagsmith.
 */
export async function isFeatureEnabled(
  featureName: string,
  identity?: string
): Promise<boolean> {
  if (!flagsmith) {
    return false;
  }
  try {
    const flags = identity
      ? await flagsmith.getIdentityFlags(identity)
      : await flagsmith.getEnvironmentFlags();
    return flags.isFeatureEnabled(featureName);
  } catch (err) {
    console.warn(`[Flagsmith] Warn checking flag "${featureName}":`, err);
    return false;
  }
}

/**
 * Get the evaluated value of a feature flag.
 */
export async function getFeatureValue<T = FeatureFlagValue>(
  featureName: string,
  identity?: string
): Promise<T | null> {
  if (!flagsmith) {
    return null;
  }
  try {
    const flags = identity
      ? await flagsmith.getIdentityFlags(identity)
      : await flagsmith.getEnvironmentFlags();
    return (flags.getFeatureValue(featureName) as T) ?? null;
  } catch (err) {
    console.warn(`[Flagsmith] Warn getting value for flag "${featureName}":`, err);
    return null;
  }
}

/**
 * Retrieve all feature flags as a dictionary of { enabled, value }.
 */
export async function getAllFeatureFlags(identity?: string): Promise<FeatureFlagDictionary> {
  if (!flagsmith) {
    return {};
  }
  try {
    const flags = identity
      ? await flagsmith.getIdentityFlags(identity)
      : await flagsmith.getEnvironmentFlags();
    const all = flags.allFlags();
    const result: FeatureFlagDictionary = {};

    for (const flag of all) {
      result[flag.featureName] = {
        enabled: flag.enabled,
        value: flag.value as FeatureFlagValue,
      };
    }
    return result;
  } catch (err) {
    console.warn('[Flagsmith] Warn retrieving all feature flags:', err);
    return {};
  }
}

/**
 * Check connectivity and responsiveness of Flagsmith SDK.
 */
export async function checkFlagsmithHealth(): Promise<boolean> {
  if (!flagsmith) return false;
  try {
    const flags = await flagsmith.getEnvironmentFlags();
    return flags.allFlags().length > 0;
  } catch {
    return false;
  }
}
