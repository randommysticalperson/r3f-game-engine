/**
 * R3F Game Engine — Feature Flags Panel
 *
 * A floating panel that lists every engine feature flag grouped by category.
 * Each row has a toggle switch, a label, and a description tooltip.
 * Opened via the toolbar flag button (or keyboard shortcut Ctrl+Shift+F).
 */
import { useRef, useEffect, useCallback } from 'react';
import { X, RotateCcw, Flag } from 'lucide-react';
import { useEngineStore } from './store';
import {
  FEATURE_FLAG_DEFS,
  groupFlagsByCategory,
  type FeatureFlagKey,
} from './featureFlags';

const CATEGORY_ORDER = ['Rendering', 'Physics', 'Cauchy Stress', 'Editor'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  Rendering: '#00e5ff',
  Physics: '#ff9800',
  'Cauchy Stress': '#e040fb',
  Editor: '#69ff47',
};

interface FeatureFlagsPanelProps {
  onClose: () => void;
}

export default function FeatureFlagsPanel({ onClose }: FeatureFlagsPanelProps) {
  const { featureFlags, toggleFeatureFlag, resetFeatureFlags } = useEngineStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const grouped = groupFlagsByCategory(FEATURE_FLAG_DEFS);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Close on click-outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose]
  );

  const enabledCount = Object.values(featureFlags).filter(Boolean).length;
  const totalCount = FEATURE_FLAG_DEFS.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="flex flex-col rounded-lg overflow-hidden"
        style={{
          width: 480,
          maxHeight: '80vh',
          background: '#0d0d1a',
          border: '1px solid #00e5ff33',
          boxShadow: '0 0 40px #00e5ff18, 0 8px 32px rgba(0,0,0,0.8)',
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid #00e5ff22', background: '#0a0a16' }}
        >
          <div className="flex items-center gap-2">
            <Flag size={14} style={{ color: '#00e5ff' }} />
            <span style={{ color: '#c8d0e0', fontSize: 13, fontWeight: 600 }}>
              Feature Flags
            </span>
            <span
              style={{
                fontSize: 10,
                color: '#00e5ff99',
                background: '#00e5ff11',
                border: '1px solid #00e5ff33',
                borderRadius: 4,
                padding: '1px 6px',
              }}
            >
              {enabledCount}/{totalCount} enabled
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFeatureFlags}
              title="Reset all flags to defaults"
              style={{
                background: 'transparent',
                border: '1px solid #ffffff22',
                borderRadius: 4,
                color: '#8899aa',
                cursor: 'pointer',
                padding: '2px 8px',
                fontSize: 11,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#ff9800aa';
                (e.currentTarget as HTMLButtonElement).style.color = '#ff9800';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#ffffff22';
                (e.currentTarget as HTMLButtonElement).style.color = '#8899aa';
              }}
            >
              <RotateCcw size={10} />
              Reset
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8899aa',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#ff4444')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#8899aa')}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Shortcut hint */}
        <div
          style={{
            fontSize: 10,
            color: '#8899aa',
            padding: '4px 16px',
            background: '#0a0a16',
            borderBottom: '1px solid #00e5ff11',
          }}
        >
          Press{' '}
          <kbd
            style={{
              background: '#1a1a2e',
              border: '1px solid #00e5ff33',
              borderRadius: 3,
              padding: '0 4px',
              fontSize: 10,
              color: '#00e5ff',
            }}
          >
            Ctrl+Shift+F
          </kbd>{' '}
          to toggle this panel &nbsp;·&nbsp;{' '}
          <kbd
            style={{
              background: '#1a1a2e',
              border: '1px solid #00e5ff33',
              borderRadius: 3,
              padding: '0 4px',
              fontSize: 10,
              color: '#00e5ff',
            }}
          >
            Esc
          </kbd>{' '}
          to close
        </div>

        {/* Scrollable flag list */}
        <div
          className="overflow-y-auto custom-scrollbar"
          style={{ flex: '1 1 0', minHeight: 0 }}
        >
          {CATEGORY_ORDER.map(cat => {
            const defs = grouped[cat];
            if (!defs?.length) return null;
            const accent = CATEGORY_COLORS[cat] ?? '#00e5ff';
            return (
              <div key={cat}>
                {/* Category header */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: accent,
                    padding: '10px 16px 4px',
                    background: '#0a0a16',
                    borderBottom: `1px solid ${accent}22`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                  }}
                >
                  {cat}
                </div>

                {/* Flag rows */}
                {defs.map(def => {
                  const enabled = featureFlags[def.key as FeatureFlagKey];
                  return (
                    <FlagRow
                      key={def.key}
                      label={def.label}
                      description={def.description}
                      enabled={enabled}
                      playModeOnly={def.playModeOnly}
                      accent={accent}
                      onToggle={() => toggleFeatureFlag(def.key as FeatureFlagKey)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Individual flag row ──────────────────────────────────────────────────────
interface FlagRowProps {
  label: string;
  description: string;
  enabled: boolean;
  playModeOnly?: boolean;
  accent: string;
  onToggle: () => void;
}

function FlagRow({ label, description, enabled, playModeOnly, accent, onToggle }: FlagRowProps) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid #ffffff08',
        transition: 'background 0.12s',
        background: 'transparent',
      }}
      onMouseEnter={e =>
        ((e.currentTarget as HTMLDivElement).style.background = '#ffffff06')
      }
      onMouseLeave={e =>
        ((e.currentTarget as HTMLDivElement).style.background = 'transparent')
      }
    >
      {/* Toggle switch */}
      <div
        style={{
          width: 32,
          height: 18,
          borderRadius: 9,
          background: enabled ? accent : '#2a2a3e',
          border: `1px solid ${enabled ? accent : '#ffffff22'}`,
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.15s, border-color 0.15s',
          boxShadow: enabled ? `0 0 8px ${accent}55` : 'none',
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: enabled ? '#0d0d1a' : '#8899aa',
            position: 'absolute',
            top: 2,
            left: enabled ? 16 : 2,
            transition: 'left 0.15s, background 0.15s',
          }}
        />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: enabled ? '#c8d0e0' : '#5a6a7a',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </span>
          {playModeOnly && (
            <span
              style={{
                fontSize: 9,
                color: '#ff9800aa',
                background: '#ff980011',
                border: '1px solid #ff980033',
                borderRadius: 3,
                padding: '0 4px',
              }}
            >
              play mode
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 10,
            color: '#5a6a7a',
            marginTop: 1,
            lineHeight: 1.4,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {description}
        </div>
      </div>

      {/* Status badge */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: enabled ? accent : '#3a4a5a',
          flexShrink: 0,
          transition: 'color 0.15s',
        }}
      >
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}
