import { Flagsmith, DefaultFlag } from '@flagsmith/nodejs';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FEATURE_FLAGS,
  FeatureFlagKey,
} from '@daily-dungeon/shared';
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
      defaultFlagHandler: (featureName: string) => {
        const fallback = DEFAULT_FEATURE_FLAG_VALUES[featureName] || {
          enabled: false,
          value: null,
        };
        return new DefaultFlag(fallback.value, fallback.enabled);
      },
    })
  : null;

/**
 * Check if a specific feature flag is enabled in Flagsmith.
 */
export async function isFeatureEnabled(
  featureName: FeatureFlagKey | string,
  identity?: string
): Promise<boolean> {
  if (!flagsmith) {
    return DEFAULT_FEATURE_FLAG_VALUES[featureName]?.enabled ?? false;
  }
  try {
    const flags = identity
      ? await flagsmith.getIdentityFlags(identity)
      : await flagsmith.getEnvironmentFlags();
    return flags.isFeatureEnabled(featureName);
  } catch (err) {
    console.warn(`[Flagsmith] Warn checking flag "${featureName}":`, err);
    return DEFAULT_FEATURE_FLAG_VALUES[featureName]?.enabled ?? false;
  }
}

/**
 * Get the evaluated value of a feature flag.
 */
export async function getFeatureValue<T = any>(
  featureName: FeatureFlagKey | string,
  identity?: string
): Promise<T> {
  if (!flagsmith) {
    return (DEFAULT_FEATURE_FLAG_VALUES[featureName]?.value as T) ?? (null as unknown as T);
  }
  try {
    const flags = identity
      ? await flagsmith.getIdentityFlags(identity)
      : await flagsmith.getEnvironmentFlags();
    return flags.getFeatureValue(featureName) as T;
  } catch (err) {
    console.warn(`[Flagsmith] Warn getting value for flag "${featureName}":`, err);
    return (DEFAULT_FEATURE_FLAG_VALUES[featureName]?.value as T) ?? (null as unknown as T);
  }
}

/**
 * Retrieve all feature flags as a dictionary of { enabled, value }.
 */
export async function getAllFeatureFlags(identity?: string): Promise<
  Record<string, { enabled: boolean; value: any }>
> {
  if (!flagsmith) {
    return DEFAULT_FEATURE_FLAG_VALUES;
  }
  try {
    const flags = identity
      ? await flagsmith.getIdentityFlags(identity)
      : await flagsmith.getEnvironmentFlags();
    const all = flags.allFlags();
    const result: Record<string, { enabled: boolean; value: any }> = {};

    for (const flag of all) {
      result[flag.featureName] = {
        enabled: flag.enabled,
        value: flag.value,
      };
    }
    return result;
  } catch (err) {
    console.warn('[Flagsmith] Warn retrieving all feature flags:', err);
    return DEFAULT_FEATURE_FLAG_VALUES;
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
