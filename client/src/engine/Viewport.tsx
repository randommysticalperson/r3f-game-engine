/**
 * R3F Game Engine -- 3D Viewport
 * Design: Obsidian Terminal -- electric cyan selections, ember orange play mode
 *
 * Physics: @react-three/rapier (Rapier WASM)
 * - Editor mode: static preview, transform gizmos, no physics
 * - Play mode: full Rapier simulation -- rigid bodies, colliders, gravity, CCD
 * - Physics debug: shows collider wireframes via <Debug />
 *
 * Bug fixes:
 * - Objects now visible without selection (ambient light raised to 0.5)
 * - Selection persists after mouse release (hitRef flag prevents background deselect)
 */
import React, { useRef, useCallback, Suspense, useEffect, useState } from 'react';
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
  useAfterPhysicsStep,
  type RapierRigidBody,
} from '@react-three/rapier';
import * as THREE from 'three';
import { useEngineStore } from './store';
import type {
  SceneObject,
  MeshGeometry,
  RigidbodyComponent,
  ColliderComponent,
  TransformComponent,
  CauchyStressComponent,
} from './store';
import { computeDeformation, computePrincipalStresses } from './cauchyStress';
import MohrCircleHUD from './MohrCircleHUD';

// Shared flag: set true when a mesh is clicked, so background handler won't deselect
const meshHitThisFrame = { current: false };
// Registry: maps object id -> RapierRigidBody ref for stress coupling
const rigidBodyRegistry = new Map<string, RapierRigidBody>();

// -----------------------------------------------------------------------

// -----------------------------------------------------------------------
// RigidBodyStressWave: applies stress wave as addForce to a Rapier RigidBody
// Placed as a child of <RigidBody> so it can access the registry.
// Uses the same P-wave modulation as CauchyStressDeformer.
// -----------------------------------------------------------------------
function RigidBodyStressWave({
  comp,
  basePos,
  objId,
}: {
  comp: CauchyStressComponent;
  basePos: [number, number, number];
  objId: string;
}) {
  const timeRef = useRef(0);
  useFrame((_, delta) => {
    const body = rigidBodyRegistry.get(objId);
    if (!body || !comp.enabled) return;
    if (!body.isDynamic()) return;

    timeRef.current += delta;
    const t = timeRef.current;

    const E = Math.max(comp.youngsModulus, 1e6);
    const rho = Math.max(comp.density, 1.0);
    const cWave = Math.sqrt(E / rho);
    const lambda = 2.0;
    const k = (2 * Math.PI) / lambda;
    const omega = cWave * k;

    const xPhase = k * basePos[0] - omega * t;
    const yPhase = k * basePos[1] - omega * t * 0.8;
    const zPhase = k * basePos[2] - omega * t * 1.2;

    const waveAmp = 0.20;
    const waveX = Math.sin(xPhase) * waveAmp;
    const waveY = Math.sin(yPhase) * waveAmp;
    const waveZ = Math.sin(zPhase) * waveAmp;

    const animTensor = {
      sxx: comp.sxx * (1 + waveX),
      syy: comp.syy * (1 + waveY),
      szz: comp.szz * (1 + waveZ),
      txy: comp.txy * (1 + (waveX + waveY) * 0.5),
      txz: comp.txz * (1 + (waveX + waveZ) * 0.5),
      tyz: comp.tyz * (1 + (waveY + waveZ) * 0.5),
    };

    // Body force from stress divergence: F = div(sigma) * V
    // Approximate as hydrostatic pressure gradient driving force
    // F_i = (sigma_ii) * scale  (diagonal terms = normal stresses)
    const forceScale = 1e-6; // scale Pa -> N (assuming ~1 m3 volume)
    body.addForce(
      {
        x: animTensor.sxx * forceScale,
        y: animTensor.syy * forceScale,
        z: animTensor.szz * forceScale,
      },
      true
    );
  });
  return null;
}

// CauchyStressDeformer: applies tensor-driven deformation each frame
// Drives position offset, rotation, and scale from principal strains.
//
// Stress Wave Propagation (play mode):
//   The wave equation d2u/dt2 = c2 * nabla2(u) governs elastic wave propagation.
//   Wave speed: c = sqrt(E / rho)  (longitudinal P-wave speed)
//   We simulate this by modulating each tensor component with a travelling wave:
//     sigma_ij(t) = sigma_ij_0 * (1 + A * sin(k*x - omega*t))
//   where omega = c * k (dispersion relation), k = 2*pi / lambda.
//   The position of the object acts as the spatial coordinate x.
//   This produces a physically-motivated oscillation that propagates in space.
// -----------------------------------------------------------------------
function CauchyStressDeformer({
  groupRef,
  comp,
  basePos,
  baseRot,
  baseScale,
  isPlaying,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  comp: CauchyStressComponent;
  basePos: [number, number, number];
  baseRot: [number, number, number];
  baseScale: [number, number, number];
  isPlaying: boolean;
}) {
  const timeRef = useRef(0);
  useFrame((_, delta) => {
    const g = groupRef.current;
    if (!g || !comp.enabled) return;
    if (!isPlaying) {
      g.position.set(...basePos);
      g.rotation.set(
        (baseRot[0] * Math.PI) / 180,
        (baseRot[1] * Math.PI) / 180,
        (baseRot[2] * Math.PI) / 180
      );
      g.scale.set(...baseScale);
      return;
    }
    timeRef.current += delta;
    const t = timeRef.current;

    // --- Stress Wave Propagation ---
    // P-wave speed: c = sqrt(E / rho)  (longitudinal elastic wave)
    const E = Math.max(comp.youngsModulus, 1e6);
    const rho = Math.max(comp.density, 1.0);
    const cWave = Math.sqrt(E / rho); // m/s (steel ~5000 m/s)

    // Wavenumber k = 2*pi / lambda, lambda = 1 unit in scene space
    const lambda = 2.0; // wavelength in scene units
    const k = (2 * Math.PI) / lambda;
    const omega = cWave * k; // angular frequency (rad/s)

    // Spatial phase: use object's base position as the wave coordinate
    // x-component drives longitudinal wave, y/z drive transverse waves
    const xPhase = k * basePos[0] - omega * t;
    const yPhase = k * basePos[1] - omega * t * 0.8; // slightly different freq
    const zPhase = k * basePos[2] - omega * t * 1.2;

    // Wave amplitude: 20% modulation of tensor components
    const waveAmp = 0.20;
    const waveX = Math.sin(xPhase) * waveAmp;
    const waveY = Math.sin(yPhase) * waveAmp;
    const waveZ = Math.sin(zPhase) * waveAmp;

    // Modulate tensor components with wave
    const animTensor = {
      sxx: comp.sxx * (1 + waveX),
      syy: comp.syy * (1 + waveY),
      szz: comp.szz * (1 + waveZ),
      txy: comp.txy * (1 + (waveX + waveY) * 0.5),
      txz: comp.txz * (1 + (waveX + waveZ) * 0.5),
      tyz: comp.tyz * (1 + (waveY + waveZ) * 0.5),
    };

    const mat = { youngsModulus: E, poissonsRatio: comp.poissonsRatio, density: rho };
    const def = computeDeformation(animTensor, mat, comp.strainAmplitude, delta);

    if (comp.applyToPosition) {
      g.position.set(
        basePos[0] + def.dispX,
        basePos[1] + def.dispY,
        basePos[2] + def.dispZ
      );
    }
    if (comp.applyToRotation) {
      g.rotation.set(
        (baseRot[0] * Math.PI) / 180 + def.rotX,
        (baseRot[1] * Math.PI) / 180 + def.rotY,
        (baseRot[2] * Math.PI) / 180 + def.rotZ
      );
    }
    if (comp.applyToScale) {
      g.scale.set(
        baseScale[0] * def.scaleX,
        baseScale[1] * def.scaleY,
        baseScale[2] * def.scaleZ
      );
    }
  });
  return null;
}

// -----------------------------------------------------------------------
// PrincipalStressArrows: 3 colored lines along principal stress directions
// -----------------------------------------------------------------------
function PrincipalStressArrows({ comp, position }: { comp: CauchyStressComponent; position: [number, number, number] }) {
  const tensor = { sxx: comp.sxx, syy: comp.syy, szz: comp.szz, txy: comp.txy, txz: comp.txz, tyz: comp.tyz };
  const ps = computePrincipalStresses(tensor);
  const maxStress = Math.max(Math.abs(ps.s1), Math.abs(ps.s3), 1e-6);
  const arrowScale = 1.5 / maxStress;
  const arrows = [
    { dir: ps.v1, stress: ps.s1, color: ps.s1 > 0 ? '#ff6b35' : '#7bc67e' },
    { dir: ps.v2, stress: ps.s2, color: '#00e5ff' },
    { dir: ps.v3, stress: ps.s3, color: ps.s3 < 0 ? '#7bc67e' : '#ff6b35' },
  ];
  return (
    <group position={position}>
      {arrows.map(({ dir, stress, color }, i) => {
        const len = Math.abs(stress) * arrowScale;
        if (len < 0.01) return null;
        const d = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
        const pts = new Float32Array([
          -d.x * len, -d.y * len, -d.z * len,
           d.x * len,  d.y * len,  d.z * len,
        ]);
        const lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
        return (
          <primitive key={i} object={new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color }))} />
        );
      })}
    </group>
  );
}

// --- Geometry map ---
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

// --- Collider wrapper ---
function ColliderByShape({
  collider,
  scale,
}: {
  collider: ColliderComponent;
  scale: [number, number, number];
}) {
  const { shape, halfExtents, radius, halfHeight, restitution, friction, density, isSensor, offset } = collider;
  const pos = offset as [number, number, number];
  const props = { restitution, friction, density, sensor: isSensor, position: pos };
  switch (shape) {
    case 'ball':
      return <BallCollider args={[radius * Math.max(...scale)]} {...props} />;
    case 'capsule':
      return <CapsuleCollider args={[halfHeight * scale[1], radius * Math.max(scale[0], scale[2])]} {...props} />;
    case 'cylinder':
      return <CylinderCollider args={[halfHeight * scale[1], radius * Math.max(scale[0], scale[2])]} {...props} />;
    case 'cone':
      return <ConeCollider args={[halfHeight * scale[1], radius * Math.max(scale[0], scale[2])]} {...props} />;
    default:
      return (
        <CuboidCollider
          args={[halfExtents[0] * scale[0], halfExtents[1] * scale[1], halfExtents[2] * scale[2]]}
          {...props}
        />
      );
  }
}

// --- Shared mesh material ---
function SceneMaterial({
  isSelected,
  isHovered,
  mesh,
  showWireframe,
}: {
  isSelected: boolean;
  isHovered: boolean;
  mesh: any;
  showWireframe: boolean;
}) {
  return (
    <meshStandardMaterial
      color={isSelected ? '#00e5ff' : isHovered ? '#88ddff' : mesh.color}
      wireframe={showWireframe || mesh.wireframe}
      metalness={mesh.metalness ?? 0.2}
      roughness={mesh.roughness ?? 0.5}
      opacity={mesh.opacity ?? 1}
      transparent={(mesh.transparent ?? false) || (mesh.opacity ?? 1) < 1}
      emissive={isSelected ? '#003344' : isHovered ? '#001122' : '#000000'}
      emissiveIntensity={isSelected ? 0.4 : isHovered ? 0.15 : 0}
    />
  );
}

// --- Physics-aware scene object (play mode) ---
function PhysicsSceneObject({ obj }: { obj: SceneObject }) {
  const { selectedIds, hoveredId, selectObject, setHovered, showWireframe } = useEngineStore();
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const transform = obj.components.transform as TransformComponent | undefined;
  const mesh = obj.components.mesh as any;
  const rigidbody = obj.components.rigidbody as RigidbodyComponent | undefined;
  const collider = obj.components.collider as ColliderComponent | undefined;
  const cauchyStress = obj.components.cauchyStress as CauchyStressComponent | undefined;
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
      onPointerDown={(e) => {
        e.stopPropagation();
        meshHitThisFrame.current = true;
        selectObject(obj.id);
      }}
      onPointerEnter={() => setHovered(obj.id)}
      onPointerLeave={() => setHovered(null)}
    >
      <GeometryByType geometry={mesh.geometry} />
      <SceneMaterial isSelected={isSelected} isHovered={isHovered} mesh={mesh} showWireframe={showWireframe} />
    </mesh>
  );

  if (rigidbody) {
    const bodyType = rigidbody.bodyType === 'dynamic' ? 'dynamic'
      : rigidbody.bodyType === 'fixed' ? 'fixed'
      : rigidbody.bodyType === 'kinematicPosition' ? 'kinematicPosition'
      : 'kinematicVelocity';
    return (
      <RigidBody
        key={obj.id}
        ref={(body) => {
          // Register the Rapier body for stress coupling lookup
          if (body) rigidBodyRegistry.set(obj.id, body);
          else rigidBodyRegistry.delete(obj.id);
        }}
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
        <group scale={scl}>{meshEl}</group>
        {collider && <ColliderByShape collider={collider} scale={scl} />}
        {cauchyStress?.enabled && (
          <RigidBodyStressWave comp={cauchyStress} basePos={pos} objId={obj.id} />
        )}
      </RigidBody>
    );
  }

  // No rigidbody -- use group ref for Cauchy deformation
  return (
    <>
      <group ref={groupRef} position={pos} rotation={rotRad} scale={scl}>
        {meshEl}
      </group>
      {cauchyStress && (
        <CauchyStressDeformer
          groupRef={groupRef}
          comp={cauchyStress}
          basePos={pos}
          baseRot={rot}
          baseScale={scl}
          isPlaying={true}
        />
      )}
      {cauchyStress?.showPrincipalArrows && (
        <PrincipalStressArrows comp={cauchyStress} position={pos} />
      )}
    </>
  );
}

// --- Editor-mode scene object (no physics) ---
function EditorSceneObject({ obj }: { obj: SceneObject }) {
  const { selectedIds, hoveredId, selectObject, setHovered, showWireframe } = useEngineStore();
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const transform = obj.components.transform as TransformComponent | undefined;
  const mesh = obj.components.mesh as any;
  const cauchyStress = obj.components.cauchyStress as CauchyStressComponent | undefined;
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
    <>
      <group ref={groupRef} position={pos} rotation={rotRad} scale={scl}>
        <mesh
          ref={meshRef}
          castShadow={mesh.castShadow}
          receiveShadow={mesh.receiveShadow}
          onPointerDown={(e) => {
            e.stopPropagation();
            meshHitThisFrame.current = true;
            selectObject(obj.id);
          }}
          onPointerEnter={() => setHovered(obj.id)}
          onPointerLeave={() => setHovered(null)}
        >
          <GeometryByType geometry={mesh.geometry} />
          <SceneMaterial isSelected={isSelected} isHovered={isHovered} mesh={mesh} showWireframe={showWireframe} />
        </mesh>
      </group>
      {/* Cauchy Stress deformer: editor mode shows static preview (isPlaying=false) */}
      {cauchyStress && (
        <CauchyStressDeformer
          groupRef={groupRef}
          comp={cauchyStress}
          basePos={pos}
          baseRot={rot}
          baseScale={scl}
          isPlaying={false}
        />
      )}
      {/* Principal stress arrows always visible when enabled */}
      {cauchyStress?.showPrincipalArrows && (
        <PrincipalStressArrows comp={cauchyStress} position={pos} />
      )}
    </>
  );
}

// --- Light renderer ---
function SceneLights({ objects }: { objects: Record<string, SceneObject> }) {
  return (
    <>
      {Object.values(objects).map(obj => {
        const light = obj.components.light as any;
        const transform = obj.components.transform as TransformComponent | undefined;
        if (!light || !obj.active) return null;
        const pos = (transform?.position ?? [0, 0, 0]) as [number, number, number];
        switch (light.lightType) {
          case 'ambient':
            return <ambientLight key={obj.id} color={light.color} intensity={light.intensity} />;
          case 'directional':
            return (
              <directionalLight
                key={obj.id}
                position={pos}
                color={light.color}
                intensity={light.intensity}
                castShadow={light.castShadow}
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={80}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
              />
            );
          case 'point':
            return (
              <pointLight
                key={obj.id}
                position={pos}
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
                position={pos}
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

// --- Play-mode scene with Rapier Physics ---

// -----------------------------------------------------------------------
// StressCouplingSystem: Multi-object stress coupling via traction vectors
//
// Cauchy's traction theorem: t = sigma * n_hat
//   t = traction vector (force per unit area) on a surface with normal n_hat
//   sigma = Cauchy stress tensor of the object applying the traction
//
// In play mode, when two objects with CauchyStress components collide:
//   1. Get the contact normal n_hat from Rapier's narrow phase
//   2. Compute traction t = sigma * n_hat for each object
//   3. Apply t as a scaled impulse to the OTHER object's rigid body
//      (stress from object A acts on object B and vice versa)
//
// This simulates how stress waves and contact forces propagate between
// elastic bodies at their shared interface.
// -----------------------------------------------------------------------
function StressCouplingSystem({ objects }: { objects: Record<string, any> }) {
  const { world } = useRapier(); // used for narrowPhase contact detection

  // Build a map from collider handle -> object id for fast lookup
  // We rebuild this each frame since handles can change
  useAfterPhysicsStep(() => {
    // Find all objects with both rigidbody and cauchyStress components
    const stressObjects: Array<{ id: string; stress: any }> = [];
    for (const id of Object.keys(objects)) {
      const obj = objects[id];
      if (!obj || !obj.active) continue;
      if (obj.components.cauchyStress && obj.components.rigidbody) {
        stressObjects.push({ id, stress: obj.components.cauchyStress });
      }
    }
    if (stressObjects.length < 2) return;

    // For each pair of stress objects, check for contact
    for (let i = 0; i < stressObjects.length; i++) {
      for (let j = i + 1; j < stressObjects.length; j++) {
        const objA = stressObjects[i];
        const objB = stressObjects[j];

        // Look up rigid bodies from the registry (populated by RigidBody ref callbacks)
        const bodyA = rigidBodyRegistry.get(objA.id) ?? null;
        const bodyB = rigidBodyRegistry.get(objB.id) ?? null;
        if (!bodyA || !bodyB) continue;
        if (!bodyA.isDynamic() && !bodyB.isDynamic()) continue;

        // Get colliders for each body
        const numCollidersA = bodyA.numColliders();
        const numCollidersB = bodyB.numColliders();
        if (numCollidersA === 0 || numCollidersB === 0) continue;

        // Check contact between first colliders of each body
        const colliderA = bodyA.collider(0);
        const colliderB = bodyB.collider(0);

        let hasContact = false;
        let contactNormal = { x: 0, y: 1, z: 0 }; // default up

        // Use narrowPhase to check contact pair
        world.narrowPhase.contactPair(
          colliderA.handle,
          colliderB.handle,
          (manifold: any, flipped: boolean) => {
            if (manifold.numContacts() > 0) {
              hasContact = true;
              const n = manifold.normal();
              contactNormal = flipped
                ? { x: -n.x, y: -n.y, z: -n.z }
                : { x: n.x, y: n.y, z: n.z };
            }
          }
        );

        if (!hasContact) continue;

        // Compute traction vectors: t = sigma * n_hat
        // sigma is the 3x3 stress tensor, n_hat is the contact normal
        const nx = contactNormal.x;
        const ny = contactNormal.y;
        const nz = contactNormal.z;

        const stressA = objA.stress;
        const stressB = objB.stress;

        // t_A = sigma_A * n_hat (traction from A acting on B)
        const tAx = stressA.sxx * nx + stressA.txy * ny + stressA.txz * nz;
        const tAy = stressA.txy * nx + stressA.syy * ny + stressA.tyz * nz;
        const tAz = stressA.txz * nx + stressA.tyz * ny + stressA.szz * nz;

        // t_B = sigma_B * (-n_hat) (traction from B acting on A, normal reversed)
        const tBx = stressB.sxx * (-nx) + stressB.txy * (-ny) + stressB.txz * (-nz);
        const tBy = stressB.txy * (-nx) + stressB.syy * (-ny) + stressB.tyz * (-nz);
        const tBz = stressB.txz * (-nx) + stressB.tyz * (-ny) + stressB.szz * (-nz);

        // Scale: traction (Pa = N/m2) -> impulse (N*s)
        // Use a small coupling coefficient to keep simulation stable
        // Area ~ 1 m2, dt ~ 0.016 s, scale by 1e-9 to keep in reasonable range
        const couplingScale = 1e-9;

        if (bodyB.isDynamic()) {
          bodyB.applyImpulse(
            { x: tAx * couplingScale, y: tAy * couplingScale, z: tAz * couplingScale },
            true
          );
        }
        if (bodyA.isDynamic()) {
          bodyA.applyImpulse(
            { x: tBx * couplingScale, y: tBy * couplingScale, z: tBz * couplingScale },
            true
          );
        }
      }
    }
  });

  return null;
}

function PhysicsScene({ objects, rootIds }: { objects: Record<string, SceneObject>; rootIds: string[] }) {
  const { physicsGravity, physicsTimestep, showPhysicsDebug, log } = useEngineStore();
  useEffect(() => {
    log(`Physics world active -- gravity: [${physicsGravity.join(', ')}]`, 'info', 'Physics');
  }, []);
  return (
    <Physics gravity={physicsGravity} timeStep={physicsTimestep} debug={showPhysicsDebug}>
      <SceneLights objects={objects} />
      {rootIds.map(id => {
        const obj = objects[id];
        if (!obj) return null;
        return <PhysicsSceneObject key={id} obj={obj} />;
      })}
      <StressCouplingSystem objects={objects} />
    </Physics>
  );
}

// --- Editor-mode scene (no physics) ---
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

// --- Transform gizmo ---
function TransformGizmo() {
  const { selectedIds, objects, transformMode, transformSpace, updateComponent, mode } = useEngineStore();
  const selectedId = selectedIds[0];
  const obj = selectedId ? objects[selectedId] : null;
  const transform = obj?.components.transform as TransformComponent | undefined;

  const pivotRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<any>(null);
  const isDragging = useRef(false);

  // Sync pivot from store whenever selection/transform changes
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
    return () => { if (controls) controls.detach(); };
  }, [selectedId]);

  if (!obj || !transform || mode !== 'editor') return null;

  const handleMouseUp = () => {
    isDragging.current = false;
    if (!pivotRef.current || !selectedId) return;
    const p = pivotRef.current.position;
    const r = pivotRef.current.rotation;
    const s = pivotRef.current.scale;
    updateComponent<TransformComponent>(selectedId, 'transform', {
      position: [+p.x.toFixed(4), +p.y.toFixed(4), +p.z.toFixed(4)],
      rotation: [
        +((r.x * 180) / Math.PI).toFixed(2),
        +((r.y * 180) / Math.PI).toFixed(2),
        +((r.z * 180) / Math.PI).toFixed(2),
      ],
      scale: [+s.x.toFixed(4), +s.y.toFixed(4), +s.z.toFixed(4)],
    });
  };

  return (
    <>
      <group ref={pivotRef} />
      <TransformControls
        ref={controlsRef}
        mode={transformMode}
        space={transformSpace}
        onMouseDown={() => {
          isDragging.current = true;
          // Prevent background from deselecting while dragging gizmo
          meshHitThisFrame.current = true;
        }}
        onMouseUp={handleMouseUp}
      />
    </>
  );
}

// --- Background click handler (deselects only when clicking empty space) ---
function BackgroundClickHandler() {
  const { gl } = useThree();
  const { selectObject, mode } = useEngineStore();
  const mouseDownPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = gl.domElement;

    const onMouseDown = (e: MouseEvent) => {
      mouseDownPos.current = { x: e.clientX, y: e.clientY };
      // Reset hit flag at the start of each click
      meshHitThisFrame.current = false;
    };

    const onMouseUp = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - mouseDownPos.current.x);
      const dy = Math.abs(e.clientY - mouseDownPos.current.y);
      // Only deselect if: it was a click (not drag), in editor mode, AND no mesh was hit
      if (dx < 5 && dy < 5 && mode === 'editor' && !meshHitThisFrame.current) {
        selectObject(null);
      }
      // Reset flag after handling
      meshHitThisFrame.current = false;
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

// --- Keyboard shortcuts ---
function KeyboardHandler() {
  const {
    setTransformMode, setMode, mode, selectedIds,
    removeObject, duplicateObject,
  } = useEngineStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'w' || e.key === 'W') setTransformMode('translate');
      if (e.key === 'e' || e.key === 'E') setTransformMode('rotate');
      if (e.key === 'r' || e.key === 'R') setTransformMode('scale');
      if (e.key === 'F5') { e.preventDefault(); setMode(mode === 'editor' ? 'play' : 'editor'); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (mode === 'editor' && selectedIds.length > 0) {
          e.preventDefault();
          selectedIds.forEach(id => removeObject(id));
        }
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

// --- Scene environment (fallback lights -- supplemental only) ---
// NOTE: These are low-intensity fallback lights. Real scene lights come from SceneLights.
function SceneEnvironment() {
  return (
    <>
      {/* Soft fill light so objects are always slightly visible */}
      <ambientLight intensity={0.35} color="#8899bb" />
      {/* Subtle sky/ground hemisphere for depth */}
      <hemisphereLight args={['#1a2a4a', '#0a0a0f', 0.4]} />
    </>
  );
}

// --- Main Viewport ---
export default function Viewport() {
  const {
    showGrid, showGizmos, showStats, mode,
    objects, rootIds, physicsGravity, physicsTimestep, showPhysicsDebug,
    selectedIds,
  } = useEngineStore();

  // Cauchy Stress HUD: show when selected object has a cauchyStress component
  const selectedObj = selectedIds[0] ? objects[selectedIds[0]] : null;
  const selectedCauchy = selectedObj?.components.cauchyStress as import('./store').CauchyStressComponent | undefined;

  const isPlayMode = mode !== 'editor';
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

      {/* Cauchy Stress HUD overlay */}
      {selectedCauchy && selectedObj && (
        <MohrCircleHUD comp={selectedCauchy} objectName={selectedObj.name} />
      )}

      {/* Physics debug badge */}
      {showPhysicsDebug && (
        <div
          className="absolute top-2 right-16 z-20 pointer-events-none flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
          style={{ background: 'rgba(255,165,0,0.15)', border: '1px solid rgba(255,165,0,0.4)', color: '#ffa500' }}
        >
          Physics Debug
        </div>
      )}

      <Canvas
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        camera={{ position: [5, 5, 10], fov: 60, near: 0.1, far: 1000 }}
        style={{ background: '#0d0d14' }}
        onCreated={({ gl }) => {
          import('./thumbnailCapture').then(m => m.registerViewportCanvas(gl.domElement));
        }}
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
