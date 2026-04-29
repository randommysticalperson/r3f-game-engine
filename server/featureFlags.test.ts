/**
 * Feature Flags — unit tests
 * Tests the feature flag registry definitions and store integration.
 */
import { describe, it, expect } from 'vitest';
import {
  FEATURE_FLAG_DEFS,
  buildDefaultFeatureFlags,
  groupFlagsByCategory,
  type FeatureFlagKey,
} from '../client/src/engine/featureFlags';

const DEFAULT_FEATURE_FLAGS = buildDefaultFeatureFlags();

describe('FEATURE_FLAG_DEFS', () => {
  it('should have at least 10 feature flags defined', () => {
    expect(FEATURE_FLAG_DEFS.length).toBeGreaterThanOrEqual(10);
  });

  it('every flag should have a non-empty key, label, description, and category', () => {
    for (const def of FEATURE_FLAG_DEFS) {
      expect(def.key).toBeTruthy();
      expect(def.label).toBeTruthy();
      expect(def.description).toBeTruthy();
      expect(def.category).toBeTruthy();
    }
  });

  it('all keys should be unique', () => {
    const keys = FEATURE_FLAG_DEFS.map(d => d.key);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('every flag should have a boolean defaultValue', () => {
    for (const def of FEATURE_FLAG_DEFS) {
      expect(typeof def.defaultValue).toBe('boolean');
    }
  });
});

describe('DEFAULT_FEATURE_FLAGS', () => {
  it('should contain an entry for every defined flag key', () => {
    for (const def of FEATURE_FLAG_DEFS) {
      expect(DEFAULT_FEATURE_FLAGS).toHaveProperty(def.key);
    }
  });

  it('default values should match the flag definition defaultValue', () => {
    for (const def of FEATURE_FLAG_DEFS) {
      expect(DEFAULT_FEATURE_FLAGS[def.key as FeatureFlagKey]).toBe(def.defaultValue);
    }
  });

  it('should include physicsEnabled as true by default', () => {
    expect(DEFAULT_FEATURE_FLAGS.physicsEnabled).toBe(true);
  });

  it('should include cauchyStressEnabled as true by default', () => {
    expect(DEFAULT_FEATURE_FLAGS.cauchyStressEnabled).toBe(true);
  });

  it('should include shadowsEnabled as true by default', () => {
    expect(DEFAULT_FEATURE_FLAGS.shadowsEnabled).toBe(true);
  });

  it('should include wireframeMode as false by default', () => {
    expect(DEFAULT_FEATURE_FLAGS.wireframeMode).toBe(false);
  });
});

describe('groupFlagsByCategory', () => {
  it('should group all flags by their category', () => {
    const grouped = groupFlagsByCategory(FEATURE_FLAG_DEFS);
    let totalGrouped = 0;
    for (const cat of Object.keys(grouped)) {
      totalGrouped += grouped[cat].length;
    }
    expect(totalGrouped).toBe(FEATURE_FLAG_DEFS.length);
  });

  it('every flag should appear in exactly one category group', () => {
    const grouped = groupFlagsByCategory(FEATURE_FLAG_DEFS);
    const allKeys: string[] = [];
    for (const cat of Object.keys(grouped)) {
      for (const def of grouped[cat]) {
        allKeys.push(def.key);
      }
    }
    const unique = new Set(allKeys);
    expect(unique.size).toBe(allKeys.length);
  });

  it('Rendering category should contain gridEnabled', () => {
    const grouped = groupFlagsByCategory(FEATURE_FLAG_DEFS);
    const renderingKeys = (grouped['Rendering'] ?? []).map(d => d.key);
    expect(renderingKeys).toContain('gridEnabled');
  });

  it('Physics category should contain physicsEnabled', () => {
    const grouped = groupFlagsByCategory(FEATURE_FLAG_DEFS);
    const physicsKeys = (grouped['Physics'] ?? []).map(d => d.key);
    expect(physicsKeys).toContain('physicsEnabled');
  });

  it('Cauchy Stress category should contain cauchyStressEnabled', () => {
    const grouped = groupFlagsByCategory(FEATURE_FLAG_DEFS);
    const stressKeys = (grouped['Cauchy Stress'] ?? []).map(d => d.key);
    expect(stressKeys).toContain('cauchyStressEnabled');
  });
});
