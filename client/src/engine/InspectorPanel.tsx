import React from 'react';
/**
 * R3F Game Engine -- Inspector Panel
 * Design: Obsidian Terminal -- component-based property editor
 * Physics: Rapier WASM via @react-three/rapier
 */

import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Trash2, Plus, Move3D, Box, Sun, Camera, Code2, Zap, Shield, Eye, EyeOff, Lock, Unlock, Tag,
} from 'lucide-react';
import { useEngineStore } from './store';
import type { TransformComponent, MeshComponent, LightComponent, CameraComponent, ScriptComponent, RigidbodyComponent, ColliderComponent, CauchyStressComponent, Component } from './store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { makeDefaultMesh, makeDefaultLight, makeDefaultRigidbody, makeDefaultCollider, makeDefaultCauchyStress } from './store';
import CauchyStressEditor from './CauchyStressEditor';

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="text-xs font-mono text-gray-500 shrink-0" style={{ width: 72 }}>{label}</span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NumberInput({ value, onChange, step = 0.1, label }: { value: number; onChange: (v: number) => void; step?: number; label?: string }) {
  return (
    <input type="number"
      className="w-full text-xs font-mono bg-transparent border-b outline-none text-gray-200 text-right px-1 py-0.5 hover:border-cyan-700 focus:border-cyan-500 transition-colors"
      style={{ borderColor: '#2a2a38' }}
      value={Number(value.toFixed(4))} step={step}
      onChange={e => onChange(parseFloat(e.target.value) || 0)} title={label}
    />
  );
}

function Vec3Input({ value, onChange, step = 0.1 }: { value: [number,number,number]; onChange: (v: [number,number,number]) => void; step?: number }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {(['X','Y','Z'] as const).map((axis, i) => (
        <div key={axis} className="flex items-center gap-0.5">
          <span className="text-xs font-mono shrink-0" style={{ color: i===0?'#ff6666':i===1?'#66ff66':'#6688ff', fontSize: 9 }}>{axis}</span>
          <NumberInput value={value[i]} onChange={v => { const n=[...value] as [number,number,number]; n[i]=v; onChange(n); }} step={step} />
        </div>
      ))}
    </div>
  );
}

function Vec3Field({ label, value, onChange, step = 0.1 }: { label: string; value: [number,number,number]; onChange: (v: [number,number,number]) => void; step?: number }) {
  return <FieldRow label={label}><Vec3Input value={value} onChange={onChange} step={step} /></FieldRow>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <input type="color" className="w-6 h-5 rounded cursor-pointer border-0 p-0" style={{ background: 'none' }} value={value} onChange={e => onChange(e.target.value)} />
        <span className="text-xs font-mono text-gray-400">{value.toUpperCase()}</span>
      </div>
    </FieldRow>
  );
}

function SliderField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <input type="range" className="flex-1 h-1 accent-cyan-500" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
        <span className="text-xs font-mono text-gray-400 w-10 text-right">{value.toFixed(2)}</span>
      </div>
    </FieldRow>
  );
}

function CheckboxField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return <FieldRow label={label}><input type="checkbox" className="accent-cyan-500 cursor-pointer" checked={value} onChange={e => onChange(e.target.checked)} /></FieldRow>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <FieldRow label={label}>
      <select className="w-full text-xs font-mono bg-transparent border-b outline-none text-gray-200 py-0.5 cursor-pointer" style={{ borderColor: '#2a2a38', background: '#111116' }} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: '#111116' }}>{o.label}</option>)}
      </select>
    </FieldRow>
  );
}

function ComponentSection({ title, icon, children, onRemove, removable = true, accentColor = '#00e5ff' }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; onRemove?: () => void; removable?: boolean; accentColor?: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1" style={{ borderBottom: '1px solid #1a1a28' }}>
      <div className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-white/3 transition-colors" onClick={() => setOpen(v => !v)} style={{ borderLeft: `2px solid ${accentColor}` }}>
        {open ? <ChevronDown size={10} className="text-gray-500" /> : <ChevronRight size={10} className="text-gray-500" />}
        <span style={{ color: accentColor }}>{icon}</span>
        <span className="text-xs font-mono font-bold text-gray-200 flex-1">{title}</span>
        {removable && onRemove && (
          <button className="p-0.5 hover:text-red-400 text-gray-600 transition-colors" onClick={e => { e.stopPropagation(); onRemove(); }} title="Remove component"><Trash2 size={10} /></button>
        )}
      </div>
      {open && <div className="px-3 py-2 space-y-0.5">{children}</div>}
    </div>
  );
}

function TransformEditor({ id, comp, cauchyStress }: { id: string; comp: TransformComponent; cauchyStress?: CauchyStressComponent }) {
  const { updateComponent } = useEngineStore();
  const upd = (patch: Partial<TransformComponent>) => updateComponent<TransformComponent>(id, 'transform', patch);
  const updStress = (patch: Partial<CauchyStressComponent>) => updateComponent<CauchyStressComponent>(id, 'cauchyStress', patch);

  // Compute live stress readout when cauchyStress is present
  const stressReadout = React.useMemo(() => {
    if (!cauchyStress) return null;
    try {
      const { computePrincipalStresses, computeInvariants, computeYieldRatio } = require('./cauchyStress') as typeof import('./cauchyStress');
      const tensor = { sxx: cauchyStress.sxx, syy: cauchyStress.syy, szz: cauchyStress.szz, txy: cauchyStress.txy, txz: cauchyStress.txz, tyz: cauchyStress.tyz };
      const ps = computePrincipalStresses(tensor);
      const inv = computeInvariants(tensor);
      const criterion = cauchyStress.yieldCriterion ?? 'vonMises';
      const yieldResult = computeYieldRatio(tensor, cauchyStress.yieldStress, criterion);
      const yieldRatio = yieldResult.ratio;
      return { ps, inv, yieldRatio, yieldResult };
    } catch { return null; }
  }, [cauchyStress]);

  const fmt = (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1e6) return (v/1e6).toFixed(2) + 'M';
    if (abs >= 1e3) return (v/1e3).toFixed(2) + 'k';
    return v.toFixed(2);
  };

  const yieldColor = !stressReadout ? '#4488ff' :
    stressReadout.yieldRatio > 0.9 ? '#ff3333' :
    stressReadout.yieldRatio > 0.7 ? '#ff8800' :
    stressReadout.yieldRatio > 0.5 ? '#ffcc00' : '#44cc88';

  return (
    <ComponentSection title="Transform" icon={<Move3D size={11} />} removable={false} accentColor="#4488ff">
      <Vec3Field label="Position" value={comp.position} onChange={v => upd({ position: v })} step={0.1} />
      <Vec3Field label="Rotation" value={comp.rotation} onChange={v => upd({ rotation: v })} step={1} />
      <Vec3Field label="Scale" value={comp.scale} onChange={v => upd({ scale: v })} step={0.05} />
      {cauchyStress && (
        <div style={{ marginTop: 8, borderTop: '1px solid #ff6b3530', paddingTop: 6 }}>
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <span style={{ fontSize: 13, fontFamily: 'serif', fontStyle: 'italic', color: '#ff6b35', lineHeight: 1 }}>&#963;</span>
            <span style={{ fontSize: 9, color: '#ff6b35', fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Cauchy Stress</span>
            {stressReadout && stressReadout.yieldResult && (
              <span style={{ marginLeft: 'auto', fontSize: 9, color: yieldColor, fontFamily: 'monospace' }} title={stressReadout.yieldResult.formula}>
                {stressReadout.yieldResult.label}: {fmt(stressReadout.yieldResult.effectiveStress)} Pa
              </span>
            )}
          </div>
          {/* 3x3 Tensor Matrix */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginBottom: 6 }}>
            {/* Row 1: sxx, sxy, sxz */}
            {[
              { key: 'sxx', label: '&#963;xx', val: cauchyStress.sxx },
              { key: 'txy', label: '&#964;xy', val: cauchyStress.txy },
              { key: 'txz', label: '&#964;xz', val: cauchyStress.txz },
              { key: 'txy', label: '&#964;xy', val: cauchyStress.txy, readOnly: true },
              { key: 'syy', label: '&#963;yy', val: cauchyStress.syy },
              { key: 'tyz', label: '&#964;yz', val: cauchyStress.tyz },
              { key: 'txz', label: '&#964;xz', val: cauchyStress.txz, readOnly: true },
              { key: 'tyz', label: '&#964;yz', val: cauchyStress.tyz, readOnly: true },
              { key: 'szz', label: '&#963;zz', val: cauchyStress.szz },
            ].map((cell, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <div style={{
                  fontSize: 7, color: '#ff6b3580', fontFamily: 'monospace',
                  position: 'absolute', top: 1, left: 3, pointerEvents: 'none', zIndex: 1,
                  lineHeight: 1,
                }} dangerouslySetInnerHTML={{ __html: cell.label }} />
                <input
                  type="number"
                  readOnly={cell.readOnly}
                  value={cell.val}
                  onChange={e => !cell.readOnly && updStress({ [cell.key]: parseFloat(e.target.value) || 0 })}
                  style={{
                    width: '100%', fontSize: 9, fontFamily: 'monospace',
                    background: cell.readOnly ? '#0a0a1280' : '#0e0e1e',
                    border: `1px solid ${cell.readOnly ? '#1a1a2a' : '#ff6b3540'}`,
                    color: cell.readOnly ? '#666' : '#ffaa77',
                    borderRadius: 2, padding: '10px 3px 2px 3px',
                    outline: 'none', textAlign: 'right',
                    opacity: cell.readOnly ? 0.6 : 1,
                  }}
                />
              </div>
            ))}
          </div>
          {/* Live Principal Stresses */}
          {stressReadout && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, marginBottom: 5 }}>
              {[
                { label: '&#963;1', val: stressReadout.ps.s1, color: '#ff6b35' },
                { label: '&#963;2', val: stressReadout.ps.s2, color: '#ffaa55' },
                { label: '&#963;3', val: stressReadout.ps.s3, color: '#ffdd88' },
              ].map((p, i) => (
                <div key={i} style={{
                  background: '#0a0a12', border: '1px solid #1e1e2e', borderRadius: 2,
                  padding: '3px 4px', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 7, color: p.color, fontFamily: 'monospace', marginBottom: 1 }}
                    dangerouslySetInnerHTML={{ __html: p.label }} />
                  <div style={{ fontSize: 8, color: '#ccc', fontFamily: 'monospace' }}>{fmt(p.val)}</div>
                </div>
              ))}
            </div>
          )}
          {/* Yield bar */}
          {stressReadout && cauchyStress.yieldStress > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div className="flex justify-between" style={{ marginBottom: 2 }}>
                <span style={{ fontSize: 8, color: '#888', fontFamily: 'monospace' }}>Yield ratio</span>
                <span style={{ fontSize: 8, color: yieldColor, fontFamily: 'monospace' }}>
                  {(stressReadout.yieldRatio * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 4, background: '#1a1a2a', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(stressReadout.yieldRatio * 100, 100)}%`,
                  background: yieldColor, borderRadius: 2,
                  transition: 'width 0.15s ease, background 0.15s ease',
                }} />
              </div>
            </div>
          )}
          {/* Yield criterion selector */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 8, color: '#888', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>Yield criterion</span>
            <select
              value={cauchyStress.yieldCriterion ?? 'vonMises'}
              onChange={e => updStress({ yieldCriterion: e.target.value as any })}
              style={{
                flex: 1, fontSize: 8, fontFamily: 'monospace',
                background: '#0e0e1e', border: '1px solid #2a2a3a',
                color: '#ccc', borderRadius: 2, padding: '1px 3px', outline: 'none',
              }}
            >
              <option value="vonMises">von Mises</option>
              <option value="tresca">Tresca</option>
              <option value="mohrCoulomb">Mohr-Coulomb</option>
            </select>
          </div>
        </div>
      )}
    </ComponentSection>
  );
}

function MeshEditor({ id, comp }: { id: string; comp: MeshComponent }) {
  const { updateComponent, removeComponent } = useEngineStore();
  const upd = (patch: Partial<MeshComponent>) => updateComponent<MeshComponent>(id, 'mesh', patch);
  return (
    <ComponentSection title="Mesh Renderer" icon={<Box size={11} />} onRemove={() => removeComponent(id, 'mesh')} accentColor="#00e5ff">
      <SelectField label="Geometry" value={comp.geometry} options={[
        { value: 'box', label: 'Box' }, { value: 'sphere', label: 'Sphere' }, { value: 'cylinder', label: 'Cylinder' },
        { value: 'cone', label: 'Cone' }, { value: 'torus', label: 'Torus' }, { value: 'plane', label: 'Plane' },
        { value: 'capsule', label: 'Capsule' }, { value: 'icosahedron', label: 'Icosahedron' },
      ]} onChange={v => upd({ geometry: v as any })} />
      <ColorField label="Color" value={comp.color} onChange={v => upd({ color: v })} />
      <SliderField label="Metalness" value={comp.metalness} min={0} max={1} step={0.01} onChange={v => upd({ metalness: v })} />
      <SliderField label="Roughness" value={comp.roughness} min={0} max={1} step={0.01} onChange={v => upd({ roughness: v })} />
      <SliderField label="Opacity" value={comp.opacity} min={0} max={1} step={0.01} onChange={v => upd({ opacity: v, transparent: v < 1 })} />
      <CheckboxField label="Wireframe" value={comp.wireframe} onChange={v => upd({ wireframe: v })} />
      <CheckboxField label="Cast Shadow" value={comp.castShadow} onChange={v => upd({ castShadow: v })} />
      <CheckboxField label="Recv Shadow" value={comp.receiveShadow} onChange={v => upd({ receiveShadow: v })} />
    </ComponentSection>
  );
}

function LightEditor({ id, comp }: { id: string; comp: LightComponent }) {
  const { updateComponent, removeComponent } = useEngineStore();
  const upd = (patch: Partial<LightComponent>) => updateComponent<LightComponent>(id, 'light', patch);
  return (
    <ComponentSection title="Light" icon={<Sun size={11} />} onRemove={() => removeComponent(id, 'light')} accentColor="#ffee44">
      <SelectField label="Type" value={comp.lightType} options={[
        { value: 'ambient', label: 'Ambient' }, { value: 'directional', label: 'Directional' },
        { value: 'point', label: 'Point' }, { value: 'spot', label: 'Spot' },
      ]} onChange={v => upd({ lightType: v as any })} />
      <ColorField label="Color" value={comp.color} onChange={v => upd({ color: v })} />
      <SliderField label="Intensity" value={comp.intensity} min={0} max={10} step={0.1} onChange={v => upd({ intensity: v })} />
      <CheckboxField label="Cast Shadow" value={comp.castShadow} onChange={v => upd({ castShadow: v })} />
      {(comp.lightType === 'point' || comp.lightType === 'spot') && (
        <SliderField label="Distance" value={comp.distance ?? 20} min={0} max={100} step={0.5} onChange={v => upd({ distance: v })} />
      )}
      {comp.lightType === 'spot' && (
        <>
          <SliderField label="Angle" value={comp.angle ?? Math.PI/4} min={0} max={Math.PI/2} step={0.01} onChange={v => upd({ angle: v })} />
          <SliderField label="Penumbra" value={comp.penumbra ?? 0.1} min={0} max={1} step={0.01} onChange={v => upd({ penumbra: v })} />
        </>
      )}
    </ComponentSection>
  );
}

function CameraEditor({ id, comp }: { id: string; comp: CameraComponent }) {
  const { updateComponent, removeComponent } = useEngineStore();
  const upd = (patch: Partial<CameraComponent>) => updateComponent<CameraComponent>(id, 'camera', patch);
  return (
    <ComponentSection title="Camera" icon={<Camera size={11} />} onRemove={() => removeComponent(id, 'camera')} accentColor="#aa88ff">
      <SliderField label="FOV" value={comp.fov} min={10} max={170} step={1} onChange={v => upd({ fov: v })} />
      <FieldRow label="Near"><NumberInput value={comp.near} onChange={v => upd({ near: v })} step={0.01} /></FieldRow>
      <FieldRow label="Far"><NumberInput value={comp.far} onChange={v => upd({ far: v })} step={10} /></FieldRow>
      <CheckboxField label="Is Main" value={comp.isMain} onChange={v => upd({ isMain: v })} />
    </ComponentSection>
  );
}

function ScriptEditor({ id, comp }: { id: string; comp: ScriptComponent }) {
  const { updateComponent, removeComponent } = useEngineStore();
  const upd = (patch: Partial<ScriptComponent>) => updateComponent<ScriptComponent>(id, 'script', patch);
  return (
    <ComponentSection title="Script" icon={<Code2 size={11} />} onRemove={() => removeComponent(id, 'script')} accentColor="#ff88cc">
      <CheckboxField label="Enabled" value={comp.enabled} onChange={v => upd({ enabled: v })} />
      <div className="mt-1">
        <textarea
          className="w-full text-xs font-mono rounded p-2 outline-none resize-y"
          style={{ background: '#0a0a12', border: '1px solid #2a2a38', color: '#c8d0e0', minHeight: 80, maxHeight: 200 }}
          value={comp.code} onChange={e => upd({ code: e.target.value })}
          placeholder="// onUpdate(delta) { ... }" spellCheck={false}
        />
      </div>
    </ComponentSection>
  );
}

function RigidbodyEditor({ id, comp }: { id: string; comp: RigidbodyComponent }) {
  const { updateComponent, removeComponent } = useEngineStore();
  const upd = (patch: Partial<RigidbodyComponent>) => updateComponent<RigidbodyComponent>(id, 'rigidbody', patch);
  const bodyTypes = ['dynamic', 'fixed', 'kinematicPosition', 'kinematicVelocity'] as const;
  return (
    <ComponentSection title="Rigidbody (Rapier)" icon={<Zap size={11} />} onRemove={() => removeComponent(id, 'rigidbody')} accentColor="#ff6b35">
      <FieldRow label="Body Type">
        <select value={comp.bodyType} onChange={e => upd({ bodyType: e.target.value as typeof comp.bodyType })}
          className="w-full text-xs font-mono rounded px-1.5 py-0.5 outline-none"
          style={{ background: '#1a1a26', border: '1px solid #2a2a38', color: '#c8d0e0' }}>
          {bodyTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </FieldRow>
      <SliderField label="Gravity Scale" value={comp.gravityScale} min={-2} max={4} step={0.1} onChange={v => upd({ gravityScale: v })} />
      <SliderField label="Lin Damping" value={comp.linearDamping} min={0} max={10} step={0.01} onChange={v => upd({ linearDamping: v })} />
      <SliderField label="Ang Damping" value={comp.angularDamping} min={0} max={10} step={0.01} onChange={v => upd({ angularDamping: v })} />
      <FieldRow label="Init Vel"><Vec3Input value={comp.initialLinearVelocity} onChange={v => upd({ initialLinearVelocity: v })} step={0.1} /></FieldRow>
      <FieldRow label="Init AngVel"><Vec3Input value={comp.initialAngularVelocity} onChange={v => upd({ initialAngularVelocity: v })} step={0.1} /></FieldRow>
      <CheckboxField label="Lock Translate" value={comp.lockTranslations} onChange={v => upd({ lockTranslations: v })} />
      <CheckboxField label="Lock Rotate" value={comp.lockRotations} onChange={v => upd({ lockRotations: v })} />
      <CheckboxField label="CCD" value={comp.ccd} onChange={v => upd({ ccd: v })} />
      <CheckboxField label="Can Sleep" value={comp.canSleep} onChange={v => upd({ canSleep: v })} />
    </ComponentSection>
  );
}

function ColliderEditor({ id, comp }: { id: string; comp: ColliderComponent }) {
  const { updateComponent, removeComponent } = useEngineStore();
  const upd = (patch: Partial<ColliderComponent>) => updateComponent<ColliderComponent>(id, 'collider', patch);
  const shapes = ['cuboid', 'ball', 'capsule', 'cylinder', 'cone'] as const;
  return (
    <ComponentSection title="Collider (Rapier)" icon={<Shield size={11} />} onRemove={() => removeComponent(id, 'collider')} accentColor="#44ff88">
      <FieldRow label="Shape">
        <select value={comp.shape} onChange={e => upd({ shape: e.target.value as typeof comp.shape })}
          className="w-full text-xs font-mono rounded px-1.5 py-0.5 outline-none"
          style={{ background: '#1a1a26', border: '1px solid #2a2a38', color: '#c8d0e0' }}>
          {shapes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </FieldRow>
      {comp.shape === 'cuboid' && (
        <FieldRow label="Half Extents"><Vec3Input value={comp.halfExtents} onChange={v => upd({ halfExtents: v })} step={0.05} /></FieldRow>
      )}
      {(comp.shape === 'ball' || comp.shape === 'capsule' || comp.shape === 'cylinder' || comp.shape === 'cone') && (
        <FieldRow label="Radius"><NumberInput value={comp.radius} onChange={v => upd({ radius: v })} step={0.05} /></FieldRow>
      )}
      {(comp.shape === 'capsule' || comp.shape === 'cylinder' || comp.shape === 'cone') && (
        <FieldRow label="Half Height"><NumberInput value={comp.halfHeight} onChange={v => upd({ halfHeight: v })} step={0.05} /></FieldRow>
      )}
      <SliderField label="Restitution" value={comp.restitution} min={0} max={1} step={0.01} onChange={v => upd({ restitution: v })} />
      <SliderField label="Friction" value={comp.friction} min={0} max={1} step={0.01} onChange={v => upd({ friction: v })} />
      <SliderField label="Density" value={comp.density} min={0} max={10} step={0.1} onChange={v => upd({ density: v })} />
      <CheckboxField label="Is Sensor" value={comp.isSensor} onChange={v => upd({ isSensor: v })} />
      <FieldRow label="Offset"><Vec3Input value={comp.offset} onChange={v => upd({ offset: v })} step={0.05} /></FieldRow>
    </ComponentSection>
  );
}

function AddComponentMenu({ id, existingTypes }: { id: string; existingTypes: string[] }) {
  const { addComponent } = useEngineStore();
  const available = [
    { type: 'mesh', label: 'Mesh Renderer', icon: <Box size={11} />, make: () => makeDefaultMesh() },
    { type: 'light', label: 'Light', icon: <Sun size={11} />, make: () => makeDefaultLight() },
    { type: 'camera', label: 'Camera', icon: <Camera size={11} />, make: () => ({ type: 'camera' as const, fov: 60, near: 0.1, far: 1000, isMain: false }) },
    { type: 'script', label: 'Script', icon: <Code2 size={11} />, make: () => ({ type: 'script' as const, code: '// onUpdate(delta) {\n//   this.rotation.y += delta;\n// }', enabled: true }) },
    { type: 'rigidbody', label: 'Rigidbody', icon: <Zap size={11} />, make: () => makeDefaultRigidbody() },
    { type: 'collider', label: 'Collider', icon: <Shield size={11} />, make: () => makeDefaultCollider() },
    { type: 'cauchyStress', label: 'Cauchy Stress Tensor', icon: <span style={{ fontSize: 11, fontFamily: 'serif', fontStyle: 'italic', color: '#ff6b35' }}>sigma</span>, make: () => makeDefaultCauchyStress() },
  ].filter(c => !existingTypes.includes(c.type));
  if (available.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center justify-center gap-1.5 py-1.5 text-xs font-mono text-cyan-500 border border-dashed border-cyan-900/60 hover:border-cyan-500/60 hover:bg-cyan-950/20 rounded transition-colors mt-2 mx-3"
          style={{ width: 'calc(100% - 24px)' }}>
          <Plus size={11} /> Add Component
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent style={{ background: '#111116', border: '1px solid #2a2a38' }}>
        {available.map(c => (
          <DropdownMenuItem key={c.type} className="text-xs font-mono gap-2" onClick={() => addComponent(id, c.make() as Component)}>
            {c.icon} {c.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function InspectorPanel() {
  const { objects, selectedIds, updateObject } = useEngineStore();
  const selectedId = selectedIds[0];
  const obj = selectedId ? objects[selectedId] : null;

  if (!obj) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600" style={{ background: '#0e0e16' }}>
        <Box size={28} />
        <span className="text-xs font-mono">No object selected</span>
        <span className="text-xs font-mono text-gray-700">Click an object in the scene or hierarchy</span>
      </div>
    );
  }

  const existingTypes = Object.keys(obj.components);
  const transform = obj.components.transform as TransformComponent | undefined;
  const mesh = obj.components.mesh as MeshComponent | undefined;
  const light = obj.components.light as LightComponent | undefined;
  const camera = obj.components.camera as CameraComponent | undefined;
  const script = obj.components.script as ScriptComponent | undefined;
  const rigidbody = obj.components.rigidbody as RigidbodyComponent | undefined;
  const collider = obj.components.collider as ColliderComponent | undefined;
  const cauchyStress = obj.components.cauchyStress as CauchyStressComponent | undefined;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0e0e16' }}>
      <div className="px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1e1e2e' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <input
            className="flex-1 text-sm font-mono font-bold bg-transparent border-b outline-none text-gray-100 pb-0.5 hover:border-cyan-700 focus:border-cyan-500 transition-colors"
            style={{ borderColor: '#2a2a38' }}
            value={obj.name} onChange={e => updateObject(obj.id, { name: e.target.value })}
          />
          <button className="p-1 hover:text-cyan-400 text-gray-500 transition-colors" onClick={() => updateObject(obj.id, { active: !obj.active })} title={obj.active ? 'Deactivate' : 'Activate'}>
            {obj.active ? <Eye size={12} /> : <EyeOff size={12} className="text-gray-600" />}
          </button>
          <button className="p-1 hover:text-orange-400 text-gray-500 transition-colors" onClick={() => updateObject(obj.id, { locked: !obj.locked })} title={obj.locked ? 'Unlock' : 'Lock'}>
            {obj.locked ? <Lock size={12} className="text-orange-400" /> : <Unlock size={12} />}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Tag size={9} className="text-gray-600" />
          <span className="text-xs font-mono text-gray-600">ID: {obj.id}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        {transform && <TransformEditor id={obj.id} comp={transform} cauchyStress={cauchyStress} />}
        {mesh && <MeshEditor id={obj.id} comp={mesh} />}
        {light && <LightEditor id={obj.id} comp={light} />}
        {camera && <CameraEditor id={obj.id} comp={camera} />}
        {script && <ScriptEditor id={obj.id} comp={script} />}
        {rigidbody && <RigidbodyEditor id={obj.id} comp={rigidbody} />}
        {collider && <ColliderEditor id={obj.id} comp={collider} />}
        {cauchyStress && (
          <ComponentSection title="Cauchy Stress Tensor" icon={<span style={{ fontSize: 11, fontFamily: 'serif', fontStyle: 'italic' }}>sigma</span>} onRemove={() => useEngineStore.getState().removeComponent(obj.id, 'cauchyStress')} accentColor="#ff6b35">
            <CauchyStressEditor objectId={obj.id} comp={cauchyStress} />
          </ComponentSection>
        )}
        <AddComponentMenu id={obj.id} existingTypes={existingTypes} />
        <div className="h-4" />
      </div>
    </div>
  );
}
