/**
 * R3F Game Engine -- 3D Viewport
 * Design: Obsidian Terminal -- electric cyan selections, ember orange play mode
 *
 * Physics: @react-three/rapier (Rapier WASM)
 * - Editor mode: static preview, transform gizmos, no physics
 * - Play mode: full Rapier simulation -- rigid bodies, colliders, gravity, CCD
 * - Physics debug: shows collider wireframes via <Debug />
 */

import React, { useRef, useCallback, Suspense, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewport,
  Stats,
  TransformControls,
} from '@react-three/drei';
import {
  Physics,
  RigidBody,
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
  CylinderCollider,
  ConeCollider,
  useRapier,
} from '@react-three/rapier';
import * as THREE from 'three';
import { useEngineStore } from './store';
import type {
  SceneObject,
  MeshGeometry,
  RigidbodyComponent,
  ColliderComponent,
  TransformComponent,
} from './store';

// --- Geometry map -------------------------------------------------------------

function GeometryByType({ geometry }: { geometry: MeshGeometry }) {
  switch (geometry) {
    case 'sphere':      return <sphereGeometry args={[0.5, 32, 32]} />;
    case 'cylinder':    return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
    case 'cone':        return <coneGeometry args={[0.5, 1, 32]} />;
    case 'torus':       return <torusGeometry args={[0.4, 0.2, 16, 64]} />;
    case 'plane':       return <planeGeometry args={[1, 1]} />;
    case 'capsule':     return <capsuleGeometry args={[0.3, 0.6, 8, 16]} />;
    case 'icosahedron': return <icosahedronGeometry args={[0.5, 1]} />;
    default:            return <boxGeometry args={[1, 1, 1]} />;
  }
}

// --- Collider wrapper ---------------------------------------------------------

function ColliderByShape({
  collider,
  scale,
}: {
  collider: ColliderComponent;
  scale: [number, number, number];
}) {
  const { shape, halfExtents, radius, halfHeight, restitution, friction, density, isSensor, offset } = collider;
  const pos = offset as [number, number, number];

  const props = {
    restitution,
    friction,
    density,
    sensor: isSensor,
    position: pos,
  };

  switch (shape) {
    case 'ball':
      return <BallCollider args={[radius * Math.max(...scale)]} {...props} />;
    case 'capsule':
      return <CapsuleCollider args={[halfHeight * scale[1], radius * Math.max(scale[0], scale[2])]} {...props} />;
    case 'cylinder':
      return <CylinderCollider args={[halfHeight * scale[1], radius * Math.max(scale[0], scale[2])]} {...props} />;
    case 'cone':
      return <ConeCollider args={[halfHeight * scale[1], radius * Math.max(scale[0], scale[2])]} {...props} />;
    default: // cuboid
      return (
        <CuboidCollider
          args={[halfExtents[0] * scale[0], halfExtents[1] * scale[1], halfExtents[2] * scale[2]]}
          {...props}
        />
      );
  }
}

// --- Physics-aware scene object -----------------------------------------------

function PhysicsSceneObject({ obj }: { obj: SceneObject }) {
  const { selectedIds, hoveredId, selectObject, setHovered, showWireframe } = useEngineStore();
  const meshRef = useRef<THREE.Mesh>(null);

  const transform = obj.components.transform as TransformComponent | undefined;
  const mesh = obj.components.mesh as any;
  const rigidbody = obj.components.rigidbody as RigidbodyComponent | undefined;
  const collider = obj.components.collider as ColliderComponent | undefined;

  const isSelected = selectedIds.includes(obj.id);
  const isHovered = hoveredId === obj.id && !isSelected;

  if (!transform || !mesh || !obj.active) return null;

  const pos = transform.position as [number, number, number];
  const rot = transform.rotation as [number, number, number];
  const scl = transform.scale as [number, number, number];
  const rotRad: [number, number, number] = [
    (rot[0] * Math.PI) / 180,
    (rot[1] * Math.PI) / 180,
    (rot[2] * Math.PI) / 180,
  ];

  const meshEl = (
    <mesh
      ref={meshRef}
      castShadow={mesh.castShadow}
      receiveShadow={mesh.receiveShadow}
      onPointerDown={(e) => { e.stopPropagation(); selectObject(obj.id); }}
      onPointerEnter={() => setHovered(obj.id)}
      onPointerLeave={() => setHovered(null)}
    >
      <GeometryByType geometry={mesh.geometry} />
      <meshStandardMaterial
        color={isSelected ? '#00e5ff' : isHovered ? '#88ddff' : mesh.color}
        wireframe={showWireframe || mesh.wireframe}
        metalness={mesh.metalness}
        roughness={mesh.roughness}
        opacity={mesh.opacity}
        transparent={mesh.transparent || mesh.opacity < 1}
        emissive={isSelected ? '#003344' : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
    </mesh>
  );

  // If object has a RigidBody component, wrap with Rapier RigidBody
  if (rigidbody) {
    const bodyType = rigidbody.bodyType === 'dynamic' ? 'dynamic'
      : rigidbody.bodyType === 'fixed' ? 'fixed'
      : rigidbody.bodyType === 'kinematicPosition' ? 'kinematicPosition'
      : 'kinematicVelocity';

    return (
      <RigidBody
        key={obj.id}
        type={bodyType}
        position={pos}
        rotation={rotRad}
        gravityScale={rigidbody.gravityScale}
        linearDamping={rigidbody.linearDamping}
        angularDamping={rigidbody.angularDamping}
        lockTranslations={rigidbody.lockTranslations}
        lockRotations={rigidbody.lockRotations}
        ccd={rigidbody.ccd}
        canSleep={rigidbody.canSleep}
        linearVelocity={rigidbody.initialLinearVelocity}
        angularVelocity={rigidbody.initialAngularVelocity}
        name={obj.id}
      >
        <group scale={scl}>
          {meshEl}
        </group>
        {collider && <ColliderByShape collider={collider} scale={scl} />}
      </RigidBody>
    );
  }

  // No rigidbody -- plain static mesh
  return (
    <group position={pos} rotation={rotRad} scale={scl}>
      {meshEl}
    </group>
  );
}

// --- Editor-mode (non-physics) scene object -----------------------------------

function EditorSceneObject({ obj }: { obj: SceneObject }) {
  const { selectedIds, hoveredId, selectObject, setHovered, showWireframe } = useEngineStore();
  const meshRef = useRef<THREE.Mesh>(null);

  const transform = obj.components.transform as TransformComponent | undefined;
  const mesh = obj.components.mesh as any;

  const isSelected = selectedIds.includes(obj.id);
  const isHovered = hoveredId === obj.id && !isSelected;

  if (!transform || !mesh || !obj.active) return null;

  const pos = transform.position as [number, number, number];
  const rot = transform.rotation as [number, number, number];
  const scl = transform.scale as [number, number, number];
  const rotRad: [number, number, number] = [
    (rot[0] * Math.PI) / 180,
    (rot[1] * Math.PI) / 180,
    (rot[2] * Math.PI) / 180,
  ];

  return (
    <group position={pos} rotation={rotRad} scale={scl}>
      <mesh
        ref={meshRef}
        castShadow={mesh.castShadow}
        receiveShadow={mesh.receiveShadow}
        onPointerDown={(e) => { e.stopPropagation(); selectObject(obj.id); }}
        onPointerEnter={() => setHovered(obj.id)}
        onPointerLeave={() => setHovered(null)}
      >
        <GeometryByType geometry={mesh.geometry} />
        <meshStandardMaterial
          color={isSelected ? '#00e5ff' : isHovered ? '#88ddff' : mesh.color}
          wireframe={showWireframe || mesh.wireframe}
          metalness={mesh.metalness}
          roughness={mesh.roughness}
          opacity={mesh.opacity}
          transparent={mesh.transparent || mesh.opacity < 1}
          emissive={isSelected ? '#003344' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
        />
      </mesh>
    </group>
  );
}

// --- Light renderer -----------------------------------------------------------

function SceneLights({ objects }: { objects: Record<string, SceneObject> }) {
  return (
    <>
      {Object.values(objects).map(obj => {
        const light = obj.components.light as any;
        const transform = obj.components.transform as TransformComponent | undefined;
        if (!light || !obj.active) return null;
        const pos = transform?.position ?? [0, 0, 0];
        switch (light.lightType) {
          case 'ambient':
            return <ambientLight key={obj.id} color={light.color} intensity={light.intensity} />;
          case 'directional':
            return (
              <directionalLight
                key={obj.id}
                position={pos as [number,number,number]}
                color={light.color}
                intensity={light.intensity}
                castShadow={light.castShadow}
                shadow-mapSize={[2048, 2048]}
              />
            );
          case 'point':
            return (
              <pointLight
                key={obj.id}
                position={pos as [number,number,number]}
                color={light.color}
                intensity={light.intensity}
                distance={light.distance}
                castShadow={light.castShadow}
              />
            );
          case 'spot':
            return (
              <spotLight
                key={obj.id}
                position={pos as [number,number,number]}
                color={light.color}
                intensity={light.intensity}
                distance={light.distance}
                angle={light.angle}
                penumbra={light.penumbra}
                castShadow={light.castShadow}
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}

// --- Play-mode scene with Rapier Physics -------------------------------------

function PhysicsScene({ objects, rootIds }: { objects: Record<string, SceneObject>; rootIds: string[] }) {
  const { physicsGravity, physicsTimestep, showPhysicsDebug, log } = useEngineStore();

  // Log physics start
  useEffect(() => {
    log(`Physics world active -- gravity: [${physicsGravity.join(', ')}]`, 'info', 'Physics');
  }, []);

  return (
    <Physics
      gravity={physicsGravity}
      timeStep={physicsTimestep}
      debug={showPhysicsDebug}
    >
      <SceneLights objects={objects} />
      {rootIds.map(id => {
        const obj = objects[id];
        if (!obj) return null;
        return <PhysicsSceneObject key={id} obj={obj} />;
      })}
    </Physics>
  );
}

// --- Editor-mode scene (no physics) ------------------------------------------

function EditorScene({ objects, rootIds }: { objects: Record<string, SceneObject>; rootIds: string[] }) {
  return (
    <>
      <SceneLights objects={objects} />
      {rootIds.map(id => {
        const obj = objects[id];
        if (!obj) return null;
        return <EditorSceneObject key={id} obj={obj} />;
      })}
    </>
  );
}

// --- Transform gizmo ---------------------------------------------------------

function TransformGizmo() {
  const { selectedIds, objects, transformMode, transformSpace, updateComponent, mode } = useEngineStore();
  const selectedId = selectedIds[0];
  const obj = selectedId ? objects[selectedId] : null;
  const transform = obj?.components.transform as TransformComponent | undefined;

  // Pivot group ref - rendered at scene root, TransformControls attaches here imperatively
  const pivotRef = useRef<THREE.Group>(null);
  // TransformControls ref - attached after mount to guarantee ref is non-null (fixes updateMatrixWorld crash)
  const controlsRef = useRef<any>(null);
  const isDragging = useRef(false);

  // Sync pivot position/rotation/scale from store whenever selection or transform changes
  useEffect(() => {
    if (!pivotRef.current || !transform) return;
    const [px, py, pz] = transform.position as [number, number, number];
    const [rx, ry, rz] = transform.rotation as [number, number, number];
    const [sx, sy, sz] = transform.scale as [number, number, number];
    pivotRef.current.position.set(px, py, pz);
    pivotRef.current.rotation.set(
      (rx * Math.PI) / 180,
      (ry * Math.PI) / 180,
      (rz * Math.PI) / 180
    );
    pivotRef.current.scale.set(sx, sy, sz);
  }, [selectedId, transform]);

  // Attach TransformControls to pivot after both refs are populated
  useEffect(() => {
    const controls = controlsRef.current;
    const pivot = pivotRef.current;
    if (!controls || !pivot) return;
    controls.attach(pivot);
    return () => {
      if (controls) controls.detach();
    };
  }, [selectedId]);

  if (!obj || !transform || mode !== 'editor') return null;

  const handleMouseUp = () => {
    isDragging.current = false;
    if (!pivotRef.current || !selectedId) return;
    const p = pivotRef.current.position;
    const r = pivotRef.current.rotation;
    const s = pivotRef.current.scale;
    updateComponent<TransformComponent>(selectedId, 'transform', {
      position: [
        parseFloat(p.x.toFixed(4)),
        parseFloat(p.y.toFixed(4)),
        parseFloat(p.z.toFixed(4)),
      ],
      rotation: [
        parseFloat(((r.x * 180) / Math.PI).toFixed(2)),
        parseFloat(((r.y * 180) / Math.PI).toFixed(2)),
        parseFloat(((r.z * 180) / Math.PI).toFixed(2)),
      ],
      scale: [
        parseFloat(s.x.toFixed(4)),
        parseFloat(s.y.toFixed(4)),
        parseFloat(s.z.toFixed(4)),
      ],
    });
  };

  return (
    <>
      {/* Invisible pivot group at scene root - TransformControls attaches here */}
      <group ref={pivotRef} />
      {/* TransformControls rendered separately, attached imperatively via ref */}
      <TransformControls
        ref={controlsRef}
        mode={transformMode}
        space={transformSpace}
        onMouseDown={() => { isDragging.current = true; }}
        onMouseUp={handleMouseUp}
      />
    </>
  );
}

// --- Background click handler -------------------------------------------------

function BackgroundClickHandler() {
  const { gl } = useThree();
  const { selectObject, mode } = useEngineStore();
  const mouseDownPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;
    const onMouseDown = (e: MouseEvent) => { mouseDownPos.current = { x: e.clientX, y: e.clientY }; };
    const onMouseUp = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      if (dx < 3 && dy < 3 && mode === 'editor') selectObject(null);
    };
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    return () => { canvas.removeEventListener('mousedown', onMouseDown); canvas.removeEventListener('mouseup', onMouseUp); };
  }, [gl, mode, selectObject]);

  return null;
}

// --- Keyboard shortcuts -------------------------------------------------------

function KeyboardHandler() {
  const { setTransformMode, setMode, mode, removeObject, selectedIds, duplicateObject } = useEngineStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
      if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
      if (e.key === 'F5') { e.preventDefault(); setMode(mode === 'editor' ? 'play' : 'editor'); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) selectedIds.forEach(id => removeObject(id));
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedIds.length > 0) { e.preventDefault(); selectedIds.forEach(id => duplicateObject(id)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [mode, setTransformMode, setMode, selectedIds, removeObject, duplicateObject]);

  return null;
}

// --- Scene environment --------------------------------------------------------

function SceneEnvironment() {
  return (
    <>
      <ambientLight intensity={0.04} color="#112233" />
      <hemisphereLight args={['#0a1020', '#050508', 0.25]} />
    </>
  );
}

// --- Main Viewport ------------------------------------------------------------

export default function Viewport() {
  const {
    showGrid, showGizmos, showStats, mode, selectObject,
    objects, rootIds, physicsGravity, physicsTimestep, showPhysicsDebug,
  } = useEngineStore();
  const isPlayMode = mode !== 'editor';

  // Key to remount Physics world when entering play mode (fresh simulation)
  const [physicsKey, setPhysicsKey] = useState(0);
  const prevMode = useRef(mode);

  useEffect(() => {
    if (mode === 'play' && prevMode.current !== 'play') {
      setPhysicsKey(k => k + 1);
    }
    prevMode.current = mode;
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
          {mode === 'pause' ? 'PAUSED -- Click Stop to return to editor' : 'PLAYING -- Rapier Physics Active -- F5 or Stop to exit'}
        </div>
      )}

      {/* Physics debug badge */}
      {showPhysicsDebug && (
        <div
          className="absolute top-2 right-16 z-20 pointer-events-none flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
          style={{ background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.4)', color: '#ffa500' }}
        >
          ? Physics Debug
        </div>
      )}

      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: [5, 5, 10], fov: 60, near: 0.1, far: 1000 }}
        style={{ background: '#0d0d14' }}
        onPointerMissed={() => { if (mode === 'editor') selectObject(null); }}
      >
        <KeyboardHandler />
        <BackgroundClickHandler />
        <SceneEnvironment />

        {/* Fog */}
        <fog attach="fog" args={['#0d0d14', 40, 120]} />

        {/* Scene: physics in play mode, static in editor */}
        <Suspense fallback={null}>
          {isPlayMode ? (
            <PhysicsScene key={physicsKey} objects={objects} rootIds={rootIds} />
          ) : (
            <EditorScene objects={objects} rootIds={rootIds} />
          )}
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

        {/* Transform gizmo (editor only) */}
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
        {showStats && <Stats />}
      </Canvas>
    </div>
  );
}
