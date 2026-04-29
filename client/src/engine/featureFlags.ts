/**
 * R3F Game Engine — Feature Flags
 *
 * A typed registry of every toggleable engine feature.
 * Flags are stored in Zustand (persisted to localStorage) and read at
 * render time to conditionally enable/disable functionality.
 *
 * Adding a new flag:
 *   1. Add an entry to FEATURE_FLAG_DEFS below.
 *   2. Read `featureFlags.myFlag` from `useEngineStore()` wherever needed.
 */

export type FeatureFlagKey =
  // --- Rendering ---
  | 'shadowsEnabled'
  | 'gridEnabled'
  | 'gizmosEnabled'
  | 'statsOverlay'
  | 'wireframeMode'
  // --- Physics ---
  | 'physicsEnabled'
  | 'physicsDebugColliders'
  // --- Cauchy Stress ---
  | 'cauchyStressEnabled'
  | 'principalStressArrows'
  | 'vonMisesColorMap'
  | 'mohrsCircleHUD'
  | 'stressWavePropagation'
  | 'stressCoupling'
  // --- Editor ---
  | 'transformGizmo'
  | 'snapToGrid'
  | 'autoSave';

export interface FeatureFlagDef {
  key: FeatureFlagKey;
  label: string;
  description: string;
  category: 'Rendering' | 'Physics' | 'Cauchy Stress' | 'Editor';
  defaultValue: boolean;
  /** If true, this flag is only meaningful in play mode */
  playModeOnly?: boolean;
}

export const FEATURE_FLAG_DEFS: FeatureFlagDef[] = [
  // ── Rendering ──────────────────────────────────────────────────────────
  {
    key: 'shadowsEnabled',
    label: 'Shadows',
    description: 'Cast and receive shadows on all meshes. Disabling improves performance.',
    category: 'Rendering',
    defaultValue: true,
  },
  {
    key: 'gridEnabled',
    label: 'Ground Grid',
    description: 'Show the infinite ground grid in the viewport.',
    category: 'Rendering',
    defaultValue: true,
  },
  {
    key: 'gizmosEnabled',
    label: 'Transform Gizmos',
    description: 'Show the 3D translate/rotate/scale gizmo on selected objects.',
    category: 'Rendering',
    defaultValue: true,
  },
  {
    key: 'statsOverlay',
    label: 'Performance Stats',
    description: 'Show FPS, memory, and draw-call overlay (r3f Stats component).',
    category: 'Rendering',
    defaultValue: false,
  },
  {
    key: 'wireframeMode',
    label: 'Wireframe Mode',
    description: 'Render all meshes as wireframes.',
    category: 'Rendering',
    defaultValue: false,
  },
  // ── Physics ────────────────────────────────────────────────────────────
  {
    key: 'physicsEnabled',
    label: 'Physics Simulation',
    description: 'Enable Rapier physics in play mode. Disable to freeze all rigid bodies.',
    category: 'Physics',
    defaultValue: true,
    playModeOnly: true,
  },
  {
    key: 'physicsDebugColliders',
    label: 'Collider Wireframes',
    description: 'Overlay Rapier collider shapes as debug wireframes.',
    category: 'Physics',
    defaultValue: false,
  },
  // ── Cauchy Stress ──────────────────────────────────────────────────────
  {
    key: 'cauchyStressEnabled',
    label: 'Cauchy Stress Deformation',
    description: 'Apply tensor-driven position/rotation/scale deformation to objects with a CauchyStress component.',
    category: 'Cauchy Stress',
    defaultValue: true,
    playModeOnly: true,
  },
  {
    key: 'principalStressArrows',
    label: 'Principal Stress Arrows',
    description: 'Draw the three principal stress eigenvectors as coloured arrows.',
    category: 'Cauchy Stress',
    defaultValue: true,
  },
  {
    key: 'vonMisesColorMap',
    label: 'Von Mises Colour Map',
    description: 'Tint mesh colour by von Mises stress ratio (green → yellow → red).',
    category: 'Cauchy Stress',
    defaultValue: true,
  },
  {
    key: 'mohrsCircleHUD',
    label: "Mohr's Circle HUD",
    description: "Show the Mohr's circle stress diagram as a 2D HUD overlay.",
    category: 'Cauchy Stress',
    defaultValue: true,
  },
  {
    key: 'stressWavePropagation',
    label: 'Stress Wave Propagation',
    description: 'Modulate tensor components with a P-wave (c = √(E/ρ)) in play mode.',
    category: 'Cauchy Stress',
    defaultValue: true,
    playModeOnly: true,
  },
  {
    key: 'stressCoupling',
    label: 'Multi-Object Stress Coupling',
    description: 'Apply traction impulses (t = σ·n̂) between colliding objects that have CauchyStress components.',
    category: 'Cauchy Stress',
    defaultValue: true,
    playModeOnly: true,
  },
  // ── Editor ─────────────────────────────────────────────────────────────
  {
    key: 'transformGizmo',
    label: 'Transform Gizmo Controls',
    description: 'Enable the interactive 3D transform gizmo for moving/rotating/scaling objects.',
    category: 'Editor',
    defaultValue: true,
  },
  {
    key: 'snapToGrid',
    label: 'Snap to Grid',
    description: 'Snap transform operations to the configured grid increment.',
    category: 'Editor',
    defaultValue: false,
  },
  {
    key: 'autoSave',
    label: 'Auto-Save',
    description: 'Automatically save the scene to the database every 60 seconds.',
    category: 'Editor',
    defaultValue: false,
  },
];

/** Build the default flags map from the registry */
export function buildDefaultFeatureFlags(): Record<FeatureFlagKey, boolean> {
  return Object.fromEntries(
    FEATURE_FLAG_DEFS.map(d => [d.key, d.defaultValue])
  ) as Record<FeatureFlagKey, boolean>;
}

/** Load persisted flags from localStorage, falling back to defaults */
export function loadPersistedFeatureFlags(): Record<FeatureFlagKey, boolean> {
  const defaults = buildDefaultFeatureFlags();
  try {
    const raw = localStorage.getItem('r3f-engine-feature-flags');
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<Record<FeatureFlagKey, boolean>>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

/** Persist flags to localStorage */
export function persistFeatureFlags(flags: Record<FeatureFlagKey, boolean>): void {
  try {
    localStorage.setItem('r3f-engine-feature-flags', JSON.stringify(flags));
  } catch {
    // ignore quota errors
  }
}

/** Group flag defs by category */
export function groupFlagsByCategory(defs: FeatureFlagDef[]): Record<string, FeatureFlagDef[]> {
  const groups: Record<string, FeatureFlagDef[]> = {};
  for (const def of defs) {
    if (!groups[def.category]) groups[def.category] = [];
    groups[def.category].push(def);
  }
  return groups;
}
