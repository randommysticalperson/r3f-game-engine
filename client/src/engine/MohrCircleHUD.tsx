/**
 * MohrCircleHUD -- Cauchy Stress Tensor visualization overlay
 * Shows: Mohr's Circle (2D projection), principal stresses, von Mises stress,
 * stress invariants, and a color-coded stress state indicator.
 */
import React, { useRef, useEffect } from 'react';
import type { CauchyStressComponent } from './store';
import {
  computePrincipalStresses,
  computeInvariants,
  computeMohrsCircle,
} from './cauchyStress';

interface Props {
  comp: CauchyStressComponent;
  objectName: string;
}

// Draw Mohr's Circle on a canvas
function drawMohrsCircle(
  canvas: HTMLCanvasElement,
  s1: number,
  s2: number,
  s3: number
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, W, H);

  // Determine scale
  const maxS = Math.max(Math.abs(s1), Math.abs(s3), 1);
  const maxTau = (s1 - s3) / 2;
  const range = Math.max(Math.abs(s1), Math.abs(s3), Math.abs(maxTau), 1) * 1.3;

  const cx = W / 2;
  const cy = H / 2;
  const scale = (Math.min(W, H) / 2 - 16) / range;

  // Grid lines
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    const x = cx + (i * range * scale) / 4;
    const y = cy + (i * range * scale) / 4;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Axes
  ctx.strokeStyle = '#2a2a48';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#4a4a6a';
  ctx.font = '9px JetBrains Mono, monospace';
  ctx.fillText('sigma', W - 36, cy - 4);
  ctx.fillText('tau', cx + 4, 12);

  // Draw the 3 Mohr's circles (sigma1-sigma2, sigma2-sigma3, sigma1-sigma3)
  const circles = [
    { sA: s1, sB: s2, color: '#00e5ff44', borderColor: '#00e5ff' },
    { sA: s2, sB: s3, color: '#7bc67e44', borderColor: '#7bc67e' },
    { sA: s1, sB: s3, color: '#ff6b3544', borderColor: '#ff6b35' }, // outer (largest)
  ];

  for (const { sA, sB, color, borderColor } of circles) {
    const center = (sA + sB) / 2;
    const radius = Math.abs(sA - sB) / 2;
    if (radius < 0.001) continue;
    const cx2 = cx + center * scale;
    const r2 = radius * scale;
    ctx.beginPath();
    ctx.arc(cx2, cy, r2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Principal stress points on sigma axis
  const stresses = [
    { s: s1, color: '#ff6b35', label: 'sigma1' },
    { s: s2, color: '#00e5ff', label: 'sigma2' },
    { s: s3, color: '#7bc67e', label: 'sigma3' },
  ];
  for (const { s, color, label } of stresses) {
    const x = cx + s * scale;
    ctx.beginPath();
    ctx.arc(x, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = '8px JetBrains Mono, monospace';
    ctx.fillText(label, x - 12, cy + 14);
  }

  // Max shear stress point (top of outer circle)
  const outerCenter = (s1 + s3) / 2;
  const outerRadius = Math.abs(s1 - s3) / 2;
  ctx.beginPath();
  ctx.arc(cx + outerCenter * scale, cy - outerRadius * scale, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd700';
  ctx.fill();
  ctx.fillStyle = '#ffd700';
  ctx.font = '8px JetBrains Mono, monospace';
  ctx.fillText('tau_max', cx + outerCenter * scale - 20, cy - outerRadius * scale - 6);
}

export default function MohrCircleHUD({ comp, objectName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tensor = {
    sxx: comp.sxx, syy: comp.syy, szz: comp.szz,
    txy: comp.txy, txz: comp.txz, tyz: comp.tyz,
  };

  const ps = computePrincipalStresses(tensor);
  const inv = computeInvariants(tensor);
  const mohr = computeMohrsCircle(tensor);
  const vm = inv.vonMises;
  const hydro = inv.hydrostatic;
  const tauMax = mohr.tMax;

  // Stress state classification
  const stressState = vm < 1 ? 'Negligible'
    : ps.s1 > 0 && ps.s3 > 0 ? 'Triaxial Tension'
    : ps.s1 < 0 && ps.s3 < 0 ? 'Triaxial Compression'
    : 'Mixed (Tension+Compression)';

  const stressColor = vm < 1 ? '#7bc67e'
    : vm < 50 ? '#ffd700'
    : vm < 200 ? '#ff9944'
    : '#ff4444';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawMohrsCircle(canvas, ps.s1, ps.s2, ps.s3);
  }, [ps.s1, ps.s2, ps.s3]);

  const fmt = (n: number) => {
    if (Math.abs(n) >= 1000) return n.toExponential(2);
    return n.toFixed(3);
  };

  return (
    <div
      className="absolute bottom-8 left-2 z-30 pointer-events-none select-none"
      style={{
        background: 'rgba(10,10,18,0.92)',
        border: '1px solid #2a2a48',
        borderRadius: 4,
        width: 280,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 10,
      }}
    >
      {/* Header */}
      <div
        className="px-2 py-1 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1a1a2e', background: 'rgba(255,107,53,0.08)' }}
      >
        <span style={{ color: '#ff6b35', fontWeight: 'bold', fontSize: 9 }}>
          CAUCHY STRESS TENSOR -- {objectName.toUpperCase()}
        </span>
        <span style={{ color: stressColor, fontSize: 9 }}>{stressState}</span>
      </div>

      {/* Mohr's Circle canvas */}
      <div className="px-2 pt-2 pb-1">
        <div style={{ color: '#4a4a6a', fontSize: 8, marginBottom: 2 }}>
          MOHR'S CIRCLE (sigma1-sigma2-sigma3 planes)
        </div>
        <canvas
          ref={canvasRef}
          width={260}
          height={130}
          style={{ display: 'block', borderRadius: 2 }}
        />
      </div>

      {/* Principal stresses */}
      <div className="px-2 pb-1" style={{ borderBottom: '1px solid #1a1a2e' }}>
        <div style={{ color: '#4a4a6a', fontSize: 8, marginBottom: 2 }}>PRINCIPAL STRESSES (MPa)</div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { label: 'sigma_1', val: ps.s1, color: '#ff6b35' },
            { label: 'sigma_2', val: ps.s2, color: '#00e5ff' },
            { label: 'sigma_3', val: ps.s3, color: '#7bc67e' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <div style={{ color, fontSize: 8 }}>{label}</div>
              <div style={{ color: '#c8d0e0', fontSize: 10 }}>{fmt(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Derived quantities */}
      <div className="px-2 py-1">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          {[
            { label: 'von Mises', val: vm, color: stressColor },
            { label: 'tau_max', val: tauMax, color: '#ffd700' },
            { label: 'Hydrostatic', val: hydro, color: '#aa88ff' },
            { label: 'I1 (trace)', val: inv.I1, color: '#88aaff' },
            { label: 'I2', val: inv.I2, color: '#88aaff' },
            { label: 'I3 (det)', val: inv.I3, color: '#88aaff' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span style={{ color: '#5a5a7a', fontSize: 9 }}>{label}</span>
              <span style={{ color, fontSize: 9 }}>{fmt(val)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stress tensor matrix display */}
      <div className="px-2 pb-1.5" style={{ borderTop: '1px solid #1a1a2e' }}>
        <div style={{ color: '#4a4a6a', fontSize: 8, marginTop: 4, marginBottom: 2 }}>
          STRESS TENSOR [sigma_ij] (MPa)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, fontSize: 9 }}>
          {[
            [comp.sxx, comp.txy, comp.txz],
            [comp.txy, comp.syy, comp.tyz],
            [comp.txz, comp.tyz, comp.szz],
          ].map((row, ri) =>
            row.map((val, ci) => (
              <div
                key={`${ri}-${ci}`}
                className="text-center py-0.5 rounded"
                style={{
                  background: ri === ci ? 'rgba(0,229,255,0.06)' : 'rgba(255,107,53,0.04)',
                  color: ri === ci ? '#00e5ff' : '#ff8866',
                  fontSize: 9,
                }}
              >
                {fmt(val)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
