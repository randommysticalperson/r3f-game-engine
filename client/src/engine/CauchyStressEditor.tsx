/**
 * CauchyStressEditor -- Inspector panel component for the Cauchy Stress Tensor
 *
 * Displays and edits the full 3x3 symmetric stress tensor:
 *
 *   | sxx  txy  txz |
 *   | txy  syy  tyz |
 *   | txz  tyz  szz |
 *
 * Also shows live-computed principal stresses, von Mises, and Mohr's circle params.
 */
import React, { useMemo, useState } from 'react';
import { useEngineStore, CauchyStressComponent } from './store';
import {
  computePrincipalStresses,
  computeInvariants,
  computeMohrsCircle,
  computeYieldRatio,
  vonMisesColor,
} from './cauchyStress';

interface Props {
  objectId: string;
  comp: CauchyStressComponent;
}

// Format a stress value in MPa with 2 decimal places
function fmtMPa(v: number) {
  return (v / 1e6).toFixed(2);
}

// A single stress input field (value in Pa, displayed in MPa)
function StressInput({
  label,
  value,
  onChange,
  color = '#00e5ff',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const [raw, setRaw] = useState(() => fmtMPa(value));
  const [focused, setFocused] = useState(false);

  const handleBlur = () => {
    setFocused(false);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed * 1e6); // convert MPa -> Pa
    } else {
      setRaw(fmtMPa(value));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, color: '#888', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase' }}>
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <input
          type="text"
          value={focused ? raw : fmtMPa(value)}
          onChange={e => setRaw(e.target.value)}
          onFocus={() => { setFocused(true); setRaw(fmtMPa(value)); }}
          onBlur={handleBlur}
          style={{
            width: '100%',
            background: '#0d0d14',
            border: `1px solid ${color}44`,
            borderRadius: 2,
            color,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 11,
            padding: '2px 5px',
            outline: 'none',
          }}
        />
        <span style={{ fontSize: 9, color: '#555', whiteSpace: 'nowrap' }}>MPa</span>
      </div>
    </div>
  );
}

// Toggle checkbox row
function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: '#aaa', fontFamily: 'JetBrains Mono, monospace' }}>
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: '#00e5ff', width: 12, height: 12 }}
      />
      {label}
    </label>
  );
}

export default function CauchyStressEditor({ objectId, comp }: Props) {
  const updateComponent = useEngineStore(s => s.updateComponent);

  const upd = (patch: Partial<CauchyStressComponent>) =>
    updateComponent<CauchyStressComponent>(objectId, 'cauchyStress', patch);

  // Live-computed derived quantities
  const tensor = { sxx: comp.sxx, syy: comp.syy, szz: comp.szz, txy: comp.txy, txz: comp.txz, tyz: comp.tyz };
  const principal = useMemo(() => computePrincipalStresses(tensor), [comp.sxx, comp.syy, comp.szz, comp.txy, comp.txz, comp.tyz]);
  const inv = useMemo(() => computeInvariants(tensor), [comp.sxx, comp.syy, comp.szz, comp.txy, comp.txz, comp.tyz]);
  const mohr = useMemo(() => computeMohrsCircle(tensor), [comp.sxx, comp.syy, comp.txy]);

  // Yield criterion-specific ratio
  const criterion = comp.yieldCriterion ?? 'vonMises';
  const yieldResult = useMemo(() => computeYieldRatio(tensor, comp.yieldStress, criterion), [comp.sxx, comp.syy, comp.szz, comp.txy, comp.txz, comp.tyz, comp.yieldStress, criterion]);
  const [vmR, vmG, vmB] = vonMisesColor(yieldResult.effectiveStress, comp.yieldStress);
  const vmColor = `rgb(${Math.round(vmR * 255)},${Math.round(vmG * 255)},${Math.round(vmB * 255)})`;
  const vmRatio = Math.min(yieldResult.ratio, 1.0);

  const sectionStyle: React.CSSProperties = {
    background: '#0a0a12',
    border: '1px solid #1a1a2e',
    borderRadius: 3,
    padding: '8px 10px',
    marginBottom: 6,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 9,
    color: '#555',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  };

  const valueStyle: React.CSSProperties = {
    fontFamily: 'JetBrains Mono, monospace',
    fontSize: 11,
    color: '#00e5ff',
  };

  return (
    <div style={{ fontFamily: 'JetBrains Mono, monospace' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, color: '#ff6b35', letterSpacing: 2, textTransform: 'uppercase' }}>
            CAUCHY STRESS TENSOR
          </span>
          <span style={{ fontSize: 8, color: '#555' }}>sigma (3x3)</span>
        </div>
        <Toggle label="Enabled" value={comp.enabled} onChange={v => upd({ enabled: v })} />
      </div>

      {/* Tensor matrix visual */}
      <div style={{ ...sectionStyle, borderColor: '#ff6b3533' }}>
        <div style={labelStyle}>Stress Tensor [sigma] -- MPa</div>

        {/* Matrix display: 3 rows x 3 cols */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
          {/* Row 1: sxx, txy, txz */}
          <StressInput label="sxx (normal X)" value={comp.sxx} onChange={v => upd({ sxx: v })} color="#ff6b35" />
          <StressInput label="txy (shear XY)" value={comp.txy} onChange={v => upd({ txy: v })} color="#00e5ff" />
          <StressInput label="txz (shear XZ)" value={comp.txz} onChange={v => upd({ txz: v })} color="#00e5ff" />
          {/* Row 2: txy, syy, tyz (txy is symmetric) */}
          <StressInput label="txy (sym)" value={comp.txy} onChange={v => upd({ txy: v })} color="#00e5ff" />
          <StressInput label="syy (normal Y)" value={comp.syy} onChange={v => upd({ syy: v })} color="#ff6b35" />
          <StressInput label="tyz (shear YZ)" value={comp.tyz} onChange={v => upd({ tyz: v })} color="#00e5ff" />
          {/* Row 3: txz, tyz, szz (symmetric) */}
          <StressInput label="txz (sym)" value={comp.txz} onChange={v => upd({ txz: v })} color="#00e5ff" />
          <StressInput label="tyz (sym)" value={comp.tyz} onChange={v => upd({ tyz: v })} color="#00e5ff" />
          <StressInput label="szz (normal Z)" value={comp.szz} onChange={v => upd({ szz: v })} color="#ff6b35" />
        </div>

        {/* Tensor equation reminder */}
        <div style={{ fontSize: 9, color: '#333', textAlign: 'center', fontStyle: 'italic' }}>
          Symmetry: tij = tji (Cauchy's theorem)
        </div>
      </div>

      {/* Principal Stresses (eigenvalues) */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Principal Stresses (eigenvalues)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>sigma_1 (max)</div>
            <div style={{ ...valueStyle, color: principal.s1 > 0 ? '#ff6b35' : '#7bc67e' }}>
              {fmtMPa(principal.s1)} MPa
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>sigma_2 (mid)</div>
            <div style={valueStyle}>{fmtMPa(principal.s2)} MPa</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>sigma_3 (min)</div>
            <div style={{ ...valueStyle, color: principal.s3 < 0 ? '#7bc67e' : '#ff6b35' }}>
              {fmtMPa(principal.s3)} MPa
            </div>
          </div>
        </div>

        {/* Principal directions */}
        <div style={{ marginTop: 6, fontSize: 9, color: '#444' }}>
          <div>v1: [{principal.v1.map(v => v.toFixed(3)).join(', ')}]</div>
          <div>v2: [{principal.v2.map(v => v.toFixed(3)).join(', ')}]</div>
          <div>v3: [{principal.v3.map(v => v.toFixed(3)).join(', ')}]</div>
        </div>
      </div>

      {/* Von Mises & Invariants */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Stress Invariants & Yield</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Von Mises (sigma_vm)</div>
            <div style={{ ...valueStyle, color: vmColor }}>{fmtMPa(inv.vonMises)} MPa</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Tresca (max shear)</div>
            <div style={valueStyle}>{fmtMPa(inv.tresca)} MPa</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Hydrostatic (p)</div>
            <div style={valueStyle}>{fmtMPa(inv.hydrostatic)} MPa</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>I1 (trace)</div>
            <div style={valueStyle}>{fmtMPa(inv.I1)} MPa</div>
          </div>
        </div>

        {/* Yield criterion selector */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: '#888', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Yield Criterion</div>
          <select
            value={criterion}
            onChange={e => upd({ yieldCriterion: e.target.value as any })}
            style={{
              width: '100%', fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
              background: '#0d0d14', border: '1px solid #2a2a3a',
              color: '#ccc', borderRadius: 2, padding: '3px 6px', outline: 'none', cursor: 'pointer',
            }}
          >
            <option value="vonMises">von Mises -- ductile metals (sqrt(3*J2))</option>
            <option value="tresca">Tresca -- pressure vessels ((s1-s3)/2)</option>
            <option value="mohrCoulomb">Mohr-Coulomb -- soils/concrete (c + sigma*tan(phi))</option>
          </select>
          <div style={{ fontSize: 8, color: '#444', marginTop: 2, fontStyle: 'italic' }}>{yieldResult.formula}</div>
        </div>

        {/* Effective stress for chosen criterion */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 9, color: '#888' }}>{yieldResult.label} stress</div>
          <div style={{ fontSize: 11, color: vmColor, fontFamily: 'JetBrains Mono, monospace' }}>
            {fmtMPa(yieldResult.effectiveStress)} MPa
          </div>
        </div>

        {/* Yield bar */}
        <div style={{ fontSize: 9, color: '#888', marginBottom: 3 }}>
          Yield ratio: {(yieldResult.ratio * 100).toFixed(1)}%
          <span style={{ marginLeft: 6, color: yieldResult.ratio > 0.9 ? '#ff4444' : yieldResult.ratio > 0.7 ? '#ff6b35' : '#7bc67e' }}>
            {yieldResult.ratio > 1 ? 'YIELDED' : yieldResult.ratio > 0.9 ? 'NEAR YIELD' : yieldResult.ratio > 0.7 ? 'WARNING' : 'SAFE'}
          </span>
        </div>
        <div style={{ height: 6, background: '#111', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(yieldResult.ratio * 100, 100)}%`,
            background: vmColor,
            transition: 'width 0.2s, background 0.2s',
            borderRadius: 3,
          }} />
        </div>

        {/* Yield stress input */}
        <div style={{ marginTop: 8 }}>
          <StressInput label="Yield Stress (MPa)" value={comp.yieldStress} onChange={v => upd({ yieldStress: v })} color="#888" />
        </div>
      </div>

      {/* Mohr's Circle */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Mohr's Circle (XY plane)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Center</div>
            <div style={valueStyle}>{fmtMPa(mohr.center)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Radius</div>
            <div style={valueStyle}>{fmtMPa(mohr.radius)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>tau_max</div>
            <div style={{ ...valueStyle, color: '#ff6b35' }}>{fmtMPa(mohr.tMax)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>sigma_max</div>
            <div style={valueStyle}>{fmtMPa(mohr.sMax)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>sigma_min</div>
            <div style={valueStyle}>{fmtMPa(mohr.sMin)}</div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>2theta</div>
            <div style={valueStyle}>{(mohr.angle2theta * 180 / Math.PI).toFixed(1)}&deg;</div>
          </div>
        </div>

        {/* Inline SVG Mohr's Circle diagram */}
        <MohrsCircleSVG mohr={mohr} />
      </div>

      {/* Material Properties */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Material (Hooke's Law)</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Young's Modulus (GPa)</div>
            <input
              type="number"
              value={(comp.youngsModulus / 1e9).toFixed(1)}
              onChange={e => upd({ youngsModulus: parseFloat(e.target.value) * 1e9 || 200e9 })}
              style={{ width: '100%', background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 2, color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 5px' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Poisson's Ratio</div>
            <input
              type="number"
              step="0.01"
              min="0"
              max="0.499"
              value={comp.poissonsRatio.toFixed(3)}
              onChange={e => upd({ poissonsRatio: Math.min(0.499, Math.max(0, parseFloat(e.target.value) || 0.3)) })}
              style={{ width: '100%', background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 2, color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 5px' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Density (kg/m3)</div>
            <input
              type="number"
              value={comp.density}
              onChange={e => upd({ density: parseFloat(e.target.value) || 7850 })}
              style={{ width: '100%', background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 2, color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 5px' }}
            />
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#888' }}>Strain Amplitude</div>
            <input
              type="number"
              value={comp.strainAmplitude}
              onChange={e => upd({ strainAmplitude: parseFloat(e.target.value) || 500 })}
              style={{ width: '100%', background: '#0d0d14', border: '1px solid #1a1a2e', borderRadius: 2, color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, padding: '2px 5px' }}
            />
          </div>
        </div>
      </div>

      {/* Apply to Transform */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Apply Deformation To</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Toggle label="Position (body force)" value={comp.applyToPosition} onChange={v => upd({ applyToPosition: v })} />
          <Toggle label="Rotation (principal directions)" value={comp.applyToRotation} onChange={v => upd({ applyToRotation: v })} />
          <Toggle label="Scale (principal strains)" value={comp.applyToScale} onChange={v => upd({ applyToScale: v })} />
        </div>
      </div>

      {/* Visualization */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Visualisation</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Toggle label="Principal stress arrows" value={comp.showPrincipalArrows} onChange={v => upd({ showPrincipalArrows: v })} />
          <Toggle label="Von Mises color map" value={comp.showVonMisesColor} onChange={v => upd({ showVonMisesColor: v })} />
          <Toggle label="Mohr's circle HUD" value={comp.showMohrsCircle} onChange={v => upd({ showMohrsCircle: v })} />
        </div>
      </div>

    </div>
  );
}

// -----------------------------------------------------------------------
// Inline SVG Mohr's Circle diagram
// -----------------------------------------------------------------------
function MohrsCircleSVG({ mohr }: { mohr: ReturnType<typeof computeMohrsCircle> }) {
  const W = 200, H = 120;
  const cx = W / 2, cy = H / 2;

  // Map stress values to SVG coordinates
  const range = Math.max(mohr.radius * 2.5, 10e6);
  const scale = (W * 0.4) / range;

  const toX = (s: number) => cx + (s - mohr.center) * scale;
  const toY = (t: number) => cy - t * scale;

  const r = mohr.radius * scale;

  // Point on circle at angle 2*theta
  const px = cx + Math.cos(mohr.angle2theta) * r;
  const py = cy - Math.sin(mohr.angle2theta) * r;

  return (
    <svg width={W} height={H} style={{ display: 'block', margin: '0 auto', background: '#050508', borderRadius: 3, border: '1px solid #1a1a2e' }}>
      {/* Axes */}
      <line x1={0} y1={cy} x2={W} y2={cy} stroke="#222" strokeWidth={1} />
      <line x1={cx} y1={0} x2={cx} y2={H} stroke="#222" strokeWidth={1} />

      {/* Axis labels */}
      <text x={W - 4} y={cy - 4} fontSize={8} fill="#444" textAnchor="end">sigma</text>
      <text x={cx + 3} y={8} fontSize={8} fill="#444">tau</text>

      {/* Circle */}
      <circle cx={cx} cy={cy} r={Math.max(r, 1)} fill="none" stroke="#00e5ff44" strokeWidth={1.5} />

      {/* Center point */}
      <circle cx={cx} cy={cy} r={2} fill="#00e5ff" />

      {/* Stress point (sxx, txy) */}
      <circle cx={toX(mohr.sMax)} cy={cy} r={3} fill="#ff6b35" />
      <circle cx={toX(mohr.sMin)} cy={cy} r={3} fill="#7bc67e" />

      {/* Current stress state point */}
      <circle cx={px} cy={py} r={3} fill="#fff" />
      <line x1={cx} y1={cy} x2={px} y2={py} stroke="#ffffff44" strokeWidth={1} strokeDasharray="2,2" />

      {/* Labels */}
      <text x={toX(mohr.sMax) + 4} y={cy - 4} fontSize={7} fill="#ff6b35">s_max</text>
      <text x={toX(mohr.sMin) - 4} y={cy - 4} fontSize={7} fill="#7bc67e" textAnchor="end">s_min</text>
      <text x={cx + 4} y={cy - r - 3} fontSize={7} fill="#00e5ff">tau_max</text>
    </svg>
  );
}
