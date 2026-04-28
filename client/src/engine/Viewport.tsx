/**
 * R3F Game Engine — 3D Viewport
 * Design: Obsidian Terminal — electric cyan selections, ember orange play mode
 * 
 * Features:
 * - Orbit controls with damping
 * - Grid with infinite extension
 * - Selection with outline highlight
 * - Transform gizmos (translate/rotate/scale)
 * - Corner orientation gizmo
 * - Play mode with basic physics simulation
 * - Keyboard shortcuts (W/E/R, F5)
 * - Click-to-select, Shift+click multi-select
 */

import { useRef, useCallback, Suspense, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Stats,
  TransformControls,
  Html,
  Billboard,
} from '@react-three/drei';
import * as THREE from 'three';
import { useEngineStore } from './store';
import type { SceneObject, MeshGeometry } from './store';

// ─── Geometry map ─────────────────────────────────────────────────────────────

function GeometryByType({ geometry }: { geometry: MeshGeometry }) {
  switch (geometry) {
    case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
    case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
    case 'torus': return <torusGeometry args={[0.4, 0.2, 16, 64]} />;
    case 'plane': return <planeGeometry args={[1, 1]} />;
    case 'capsule': return <capsuleGeometry args={[0.3, 0.6, 8, 16]} />;
    case 'icosahedron': return <icosahedronGeometry args={[0.5, 1]} />;
    default: return <boxGeometry args={[1, 1, 1]} />;
  }
}

// ─── Play mode physics state ──────────────────────────────────────────────────

const playVelocities: Record<string, THREE.Vector3> = {};

// ─── Single scene object renderer ────────────────────────────────────────────

function SceneObjectMesh({ obj }: { obj: SceneObject }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { selectedIds, hoveredId, selectObject, setHovered, mode, showWireframe } = useEngineStore();

  const transform = obj.components.transform as any;
  const mesh = obj.components.mesh as any;
  const rigidbody = obj.components.rigidbody as any;
  const isSelected = selectedIds.includes(obj.id);
  const isHovered = hoveredId === obj.id && !isSelected;
  const isPlayMode = mode !== 'editor';

  // Initialize velocity for rigidbody in play mode
  useEffect(() => {
    if (isPlayMode && rigidbody && !playVelocities[obj.id]) {
      playVelocities[obj.id] = new THREE.Vector3(0, 0, 0);
    }
  }, [isPlayMode, rigidbody, obj.id]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (isPlayMode) {
      // Basic physics simulation
      if (rigidbody && rigidbody.useGravity && !rigidbody.isKinematic) {
        const vel = playVelocities[obj.id] ?? new THREE.Vector3();
        vel.y -= 9.8 * rigidbody.mass * delta;
        vel.multiplyScalar(1 - rigidbody.drag * delta);
        meshRef.current.position.addScaledVector(vel, delta);
        // Ground collision
        if (meshRef.current.position.y < 0) {
          meshRef.current.position.y = 0;
          vel.y = Math.abs(vel.y) * 0.4;
        }
        playVelocities[obj.id] = vel;
      }
      // Auto-rotate for objects with script
      if (obj.components.script && (obj.components.script as any).enabled) {
        meshRef.current.rotation.y += delta * 0.8;
      }
    }
  });

  if (!transform || !mesh || !obj.active) return null;

  const pos = transform.position as [number, number, number];
  const rot = transform.rotation as [number, number, number];
  const scl = transform.scale as [number, number, number];

  return (
    <group>
      <mesh
        ref={meshRef}
        position={pos}
        rotation={[
          THREE.MathUtils.degToRad(rot[0]),
          THREE.MathUtils.degToRad(rot[1]),
          THREE.MathUtils.degToRad(rot[2]),
        ]}
        scale={scl}
        castShadow={mesh.castShadow}
        receiveShadow={mesh.receiveShadow}
        onClick={(e) => {
          if (mode === 'editor') {
            e.stopPropagation();
            selectObject(obj.id, e.shiftKey);
          }
        }}
        onPointerOver={(e) => {
          if (mode === 'editor') { e.stopPropagation(); setHovered(obj.id); }
        }}
        onPointerOut={() => setHovered(null)}
      >
        <GeometryByType geometry={mesh.geometry} />
        <meshStandardMaterial
          color={isSelected ? '#00e5ff' : isHovered ? '#80f0ff' : mesh.color}
          wireframe={showWireframe || mesh.wireframe}
          metalness={mesh.metalness}
          roughness={mesh.roughness}
          opacity={mesh.opacity}
          transparent={mesh.transparent || mesh.opacity < 1}
          emissive={isSelected ? '#003344' : isHovered ? '#001a22' : '#000000'}
          emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.2 : 0}
        />
      </mesh>

      {/* Selection outline */}
      {isSelected && mode === 'editor' && (
        <mesh
          position={pos}
          rotation={[
            THREE.MathUtils.degToRad(rot[0]),
            THREE.MathUtils.degToRad(rot[1]),
            THREE.MathUtils.degToRad(rot[2]),
          ]}
          scale={[scl[0] * 1.03, scl[1] * 1.03, scl[2] * 1.03]}
        >
          <GeometryByType geometry={mesh.geometry} />
          <meshBasicMaterial color="#00e5ff" wireframe side={THREE.BackSide} transparent opacity={0.35} />
        </mesh>
      )}

      {/* Name label in editor */}
      {isSelected && mode === 'editor' && (
        <Billboard position={[pos[0], pos[1] + scl[1] * 0.7 + 0.3, pos[2]]}>
          <Html center distanceFactor={8}>
            <div
              style={{
                background: 'rgba(0,20,30,0.85)',
                border: '1px solid #00e5ff44',
                color: '#00e5ff',
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                padding: '1px 6px',
                borderRadius: 2,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {obj.name}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}

// ─── Light renderer ───────────────────────────────────────────────────────────

function SceneObjectLight({ obj }: { obj: SceneObject }) {
  const { selectedIds, selectObject, mode } = useEngineStore();
  const transform = obj.components.transform as any;
  const light = obj.components.light as any;
  const isSelected = selectedIds.includes(obj.id);

  if (!transform || !light || !obj.active) return null;

  const pos = transform.position as [number, number, number];

  const handleClick = (e: any) => {
    if (mode === 'editor') { e.stopPropagation(); selectObject(obj.id, e.shiftKey); }
  };

  return (
    <group position={pos}>
      {light.lightType === 'ambient' && (
        <ambientLight color={light.color} intensity={light.intensity} />
      )}
      {light.lightType === 'directional' && (
        <directionalLight
          color={light.color}
          intensity={light.intensity}
          castShadow={light.castShadow}
          shadow-mapSize={[2048, 2048]}
          shadow-camera-near={0.1}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
      )}
      {light.lightType === 'point' && (
        <pointLight
          color={light.color}
          intensity={light.intensity}
          distance={light.distance ?? 20}
          castShadow={light.castShadow}
        />
      )}
      {light.lightType === 'spot' && (
        <spotLight
          color={light.color}
          intensity={light.intensity}
          distance={light.distance ?? 20}
          angle={light.angle ?? Math.PI / 4}
          penumbra={light.penumbra ?? 0.1}
          castShadow={light.castShadow}
        />
      )}
      {/* Light icon (editor only) */}
      {mode === 'editor' && (
        <group>
          <mesh onClick={handleClick}>
            <sphereGeometry args={[0.12, 8, 8]} />
            <meshBasicMaterial
              color={isSelected ? '#00e5ff' : light.lightType === 'ambient' ? '#aaaaff' : '#ffee44'}
              transparent
              opacity={0.9}
            />
          </mesh>
          {/* Light rays */}
          {light.lightType !== 'ambient' && (
            <mesh>
              <sphereGeometry args={[0.18, 6, 6]} />
              <meshBasicMaterial
                color={light.color}
                transparent
                opacity={0.1}
                wireframe
              />
            </mesh>
          )}
          {isSelected && (
            <Billboard position={[0, 0.35, 0]}>
              <Html center distanceFactor={8}>
                <div style={{
                  background: 'rgba(0,20,30,0.85)',
                  border: '1px solid #00e5ff44',
                  color: '#00e5ff',
                  fontSize: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '1px 6px',
                  borderRadius: 2,
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}>
                  {obj.name}
                </div>
              </Html>
            </Billboard>
          )}
        </group>
      )}
    </group>
  );
}

// ─── Camera icon renderer ─────────────────────────────────────────────────────

function SceneObjectCamera({ obj }: { obj: SceneObject }) {
  const { selectedIds, selectObject, mode } = useEngineStore();
  const transform = obj.components.transform as any;
  const isSelected = selectedIds.includes(obj.id);

  if (!transform || !obj.active || mode !== 'editor') return null;
  const pos = transform.position as [number, number, number];
  const rot = transform.rotation as [number, number, number];

  return (
    <group
      position={pos}
      rotation={[
        THREE.MathUtils.degToRad(rot[0]),
        THREE.MathUtils.degToRad(rot[1]),
        THREE.MathUtils.degToRad(rot[2]),
      ]}
    >
      <mesh onClick={(e) => { e.stopPropagation(); selectObject(obj.id, e.shiftKey); }}>
        <boxGeometry args={[0.22, 0.16, 0.28]} />
        <meshBasicMaterial color={isSelected ? '#00e5ff' : '#44aaff'} transparent opacity={0.85} />
      </mesh>
      {/* Lens */}
      <mesh position={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.06, 0.09, 0.1, 12]} />
        <meshBasicMaterial color={isSelected ? '#00e5ff' : '#2266aa'} transparent opacity={0.8} />
      </mesh>
      {isSelected && (
        <Billboard position={[0, 0.3, 0]}>
          <Html center distanceFactor={8}>
            <div style={{
              background: 'rgba(0,20,30,0.85)',
              border: '1px solid #00e5ff44',
              color: '#00e5ff',
              fontSize: 10,
              fontFamily: 'JetBrains Mono, monospace',
              padding: '1px 6px',
              borderRadius: 2,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}>
              {obj.name}
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}

// ─── Scene renderer ───────────────────────────────────────────────────────────

function SceneRenderer() {
  const { objects, rootIds } = useEngineStore();

  const renderObject = useCallback((id: string): React.ReactNode => {
    const obj = objects[id];
    if (!obj) return null;
    const hasMesh = !!obj.components.mesh;
    const hasLight = !!obj.components.light;
    const hasCamera = !!obj.components.camera;

    return (
      <group key={obj.id}>
        {hasMesh && <SceneObjectMesh obj={obj} />}
        {hasLight && <SceneObjectLight obj={obj} />}
        {hasCamera && <SceneObjectCamera obj={obj} />}
        {obj.childIds.map(renderObject)}
      </group>
    );
  }, [objects]);

  return <>{rootIds.map(renderObject)}</>;
}

// ─── Transform gizmo ─────────────────────────────────────────────────────────

function TransformGizmo() {
  const { selectedIds, objects, transformMode, transformSpace, updateComponent, mode } = useEngineStore();
  const selectedId = selectedIds[0];
  const obj = selectedId ? objects[selectedId] : null;
  const controlsRef = useRef<any>(null);
  const isDragging = useRef(false);

  if (!obj || mode !== 'editor') return null;

  const transform = obj.components.transform as any;
  if (!transform) return null;

  const flushTransform = () => {
    const tc = controlsRef.current;
    if (!tc || !tc.object) return;
    const obj3d = tc.object as THREE.Object3D;
    const pos: [number, number, number] = [obj3d.position.x, obj3d.position.y, obj3d.position.z];
    const euler = new THREE.Euler().setFromQuaternion(obj3d.quaternion);
    const rot: [number, number, number] = [
      THREE.MathUtils.radToDeg(euler.x),
      THREE.MathUtils.radToDeg(euler.y),
      THREE.MathUtils.radToDeg(euler.z),
    ];
    const scl: [number, number, number] = [obj3d.scale.x, obj3d.scale.y, obj3d.scale.z];
    updateComponent(selectedId, 'transform', { position: pos, rotation: rot, scale: scl });
  };

  return (
    <TransformControls
      ref={controlsRef}
      mode={transformMode}
      space={transformSpace}
      onMouseDown={() => { isDragging.current = true; }}
      onMouseUp={() => {
        if (isDragging.current) {
          isDragging.current = false;
          flushTransform();
        }
      }}
    >
      <group
        position={transform.position as [number, number, number]}
        rotation={[
          THREE.MathUtils.degToRad(transform.rotation[0]),
          THREE.MathUtils.degToRad(transform.rotation[1]),
          THREE.MathUtils.degToRad(transform.rotation[2]),
        ]}
        scale={transform.scale as [number, number, number]}
      />
    </TransformControls>
  );
}

// ─── Background click deselect ────────────────────────────────────────────────

function BackgroundClickHandler() {
  const { selectObject, mode } = useEngineStore();
  const { gl } = useThree();

  useEffect(() => {
    const canvas = gl.domElement;
    let mouseDownPos = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      // Only deselect on clean click (not drag)
      if (dx < 3 && dy < 3 && mode === 'editor') {
        // Will be overridden by mesh clicks due to stopPropagation
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [gl, mode, selectObject]);

  return null;
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function KeyboardHandler() {
  const { setTransformMode, setMode, mode, removeObject, selectedIds, duplicateObject } = useEngineStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
      if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
      if (e.key === 'F5') { e.preventDefault(); setMode(mode === 'editor' ? 'play' : 'editor'); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        selectedIds.forEach(id => removeObject(id));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedIds.length > 0) {
        e.preventDefault();
        selectedIds.forEach(id => duplicateObject(id));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, setTransformMode, setMode, selectedIds, removeObject, duplicateObject]);

  return null;
}

// ─── Ambient environment ──────────────────────────────────────────────────────

function SceneEnvironment() {
  const { mode } = useEngineStore();
  return (
    <>
      {/* Subtle ambient for editor */}
      <ambientLight intensity={0.05} color="#112233" />
      {/* Hemisphere light for sky/ground color */}
      <hemisphereLight args={['#0a1020', '#050508', 0.3]} />
    </>
  );
}

// ─── Main Viewport ────────────────────────────────────────────────────────────

export default function Viewport() {
  const { showGrid, showGizmos, showStats, mode, selectObject } = useEngineStore();
  const isPlayMode = mode !== 'editor';

  // Clear play velocities when entering play mode
  useEffect(() => {
    if (mode === 'play') {
      Object.keys(playVelocities).forEach(k => delete playVelocities[k]);
    }
  }, [mode]);

  return (
    <div className="relative w-full h-full" style={{ background: '#0d0d14' }}>
      {/* Play mode border overlay */}
      {isPlayMode && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            border: `2px solid ${mode === 'pause' ? '#ffd700' : '#ff6b35'}`,
            boxShadow: `inset 0 0 40px ${mode === 'pause' ? 'rgba(255,215,0,0.06)' : 'rgba(255,107,53,0.06)'}`,
          }}
        />
      )}

      {/* Play mode label */}
      {isPlayMode && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 px-3 py-1 rounded text-xs font-mono"
          style={{
            background: mode === 'pause' ? 'rgba(255,215,0,0.12)' : 'rgba(255,107,53,0.12)',
            border: `1px solid ${mode === 'pause' ? '#ffd70066' : '#ff6b3566'}`,
            color: mode === 'pause' ? '#ffd700' : '#ff6b35',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor' }} />
          {mode === 'pause' ? 'PAUSED — Click Stop to return to editor' : 'PLAYING — F5 or Stop to exit'}
        </div>
      )}

      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [5, 5, 10], fov: 60, near: 0.1, far: 1000 }}
        style={{ background: '#0d0d14' }}
        onPointerMissed={() => {
          if (mode === 'editor') selectObject(null);
        }}
      >
        <KeyboardHandler />
        <BackgroundClickHandler />
        <SceneEnvironment />

        {/* Fog */}
        <fog attach="fog" args={['#0d0d14', 40, 120]} />

        {/* Scene objects */}
        <Suspense fallback={null}>
          <SceneRenderer />
        </Suspense>

        {/* Grid */}
        {showGrid && (
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.4}
            cellColor="#1a1a2e"
            sectionSize={5}
            sectionThickness={0.8}
            sectionColor="#252540"
            fadeDistance={50}
            fadeStrength={1.5}
            infiniteGrid
            position={[0, -0.001, 0]}
          />
        )}

        {/* Transform gizmo */}
        {showGizmos && <TransformGizmo />}

        {/* Orbit controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          minDistance={0.3}
          maxDistance={300}
          mouseButtons={{
            LEFT: THREE.MOUSE.ROTATE,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.PAN,
          }}
        />

        {/* Corner orientation gizmo */}
        {showGizmos && (
          <GizmoHelper alignment="bottom-right" margin={[64, 64]}>
            <GizmoViewport
              axisColors={['#ff4444', '#44ff44', '#4488ff']}
              labelColor="#c8d0e0"
              hideNegativeAxes
            />
          </GizmoHelper>
        )}

        {/* Performance stats */}
        {showStats && <Stats className="stats-panel" />}
      </Canvas>
    </div>
  );
}
