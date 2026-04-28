/**
 * R3F Game Engine -- Core Store
 * Design: Obsidian Terminal -- dark industrial IDE
 *
 * Entity-Component-System inspired scene graph using Zustand.
 * Physics powered by @react-three/rapier (Rapier WASM engine).
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from 'nanoid';

// --- Types --------------------------------------------------------------------

export type Vec3 = [number, number, number];

export type ComponentType = 'transform' | 'mesh' | 'light' | 'camera' | 'script' | 'rigidbody' | 'collider';

export interface TransformComponent {
  type: 'transform';
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export type MeshGeometry = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'capsule' | 'icosahedron';

export interface MeshComponent {
  type: 'mesh';
  geometry: MeshGeometry;
  color: string;
  wireframe: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  metalness: number;
  roughness: number;
  opacity: number;
  transparent: boolean;
}

export type LightType = 'ambient' | 'directional' | 'point' | 'spot';

export interface LightComponent {
  type: 'light';
  lightType: LightType;
  color: string;
  intensity: number;
  castShadow: boolean;
  distance?: number;
  angle?: number;
  penumbra?: number;
}

export interface CameraComponent {
  type: 'camera';
  fov: number;
  near: number;
  far: number;
  isMain: boolean;
}

export interface ScriptComponent {
  type: 'script';
  code: string;
  enabled: boolean;
}

// --- Rapier physics types -----------------------------------------------------

export type RigidBodyType = 'dynamic' | 'fixed' | 'kinematicPosition' | 'kinematicVelocity';
export type ColliderShape = 'cuboid' | 'ball' | 'capsule' | 'cylinder' | 'cone';

export interface RigidbodyComponent {
  type: 'rigidbody';
  bodyType: RigidBodyType;
  gravityScale: number;
  linearDamping: number;
  angularDamping: number;
  initialLinearVelocity: Vec3;
  initialAngularVelocity: Vec3;
  lockTranslations: boolean;
  lockRotations: boolean;
  ccd: boolean;
  canSleep: boolean;
  // legacy
  isKinematic: boolean;
}

export interface ColliderComponent {
  type: 'collider';
  shape: ColliderShape;
  halfExtents: Vec3;
  radius: number;
  halfHeight: number;
  restitution: number;
  friction: number;
  density: number;
  isSensor: boolean;
  offset: Vec3;
}

export type Component =
  | TransformComponent
  | MeshComponent
  | LightComponent
  | CameraComponent
  | ScriptComponent
  | RigidbodyComponent
  | ColliderComponent;

export interface SceneObject {
  id: string;
  name: string;
  parentId: string | null;
  childIds: string[];
  active: boolean;
  locked: boolean;
  components: Record<string, Component>;
  tags: string[];
}

export type EditorMode = 'editor' | 'play' | 'pause';
export type TransformMode = 'translate' | 'rotate' | 'scale';
export type TransformSpace = 'world' | 'local';

export interface ConsoleEntry {
  id: string;
  level: 'log' | 'warn' | 'error' | 'info';
  message: string;
  timestamp: number;
  source?: string;
}

export interface EditorCamera {
  position: Vec3;
  target: Vec3;
}

// --- Store Interface ----------------------------------------------------------

export interface EngineStore {
  objects: Record<string, SceneObject>;
  rootIds: string[];
  sceneName: string;
  selectedIds: string[];
  hoveredId: string | null;
  mode: EditorMode;
  transformMode: TransformMode;
  transformSpace: TransformSpace;
  showGrid: boolean;
  showGizmos: boolean;
  showStats: boolean;
  showWireframe: boolean;
  showPhysicsDebug: boolean;
  snapEnabled: boolean;
  snapValue: number;
  editorCamera: EditorCamera;
  physicsGravity: Vec3;
  physicsTimestep: number | 'vary';
  consoleEntries: ConsoleEntry[];
  consoleFilter: 'all' | 'log' | 'warn' | 'error';
  activePanel: 'hierarchy' | 'inspector' | 'assets' | 'console';
  rightPanelTab: 'inspector' | 'components';
  bottomPanelTab: 'console' | 'assets';
  bottomPanelOpen: boolean;
  addObject: (partial?: Partial<SceneObject>, parentId?: string | null) => string;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => string;
  updateObject: (id: string, patch: Partial<SceneObject>) => void;
  updateComponent: <T extends Component>(id: string, compType: string, patch: Partial<T>) => void;
  addComponent: (id: string, component: Component) => void;
  removeComponent: (id: string, compType: string) => void;
  reparentObject: (id: string, newParentId: string | null) => void;
  reorderObject: (id: string, direction: 'up' | 'down') => void;
  selectObject: (id: string | null, multi?: boolean) => void;
  setHovered: (id: string | null) => void;
  setMode: (mode: EditorMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  setTransformSpace: (space: TransformSpace) => void;
  toggleGrid: () => void;
  toggleGizmos: () => void;
  toggleStats: () => void;
  toggleWireframe: () => void;
  togglePhysicsDebug: () => void;
  toggleSnap: () => void;
  setSnapValue: (v: number) => void;
  setEditorCamera: (cam: Partial<EditorCamera>) => void;
  setPhysicsGravity: (g: Vec3) => void;
  setPhysicsTimestep: (t: number | 'vary') => void;
  log: (msg: string, level?: ConsoleEntry['level'], source?: string) => void;
  clearConsole: () => void;
  setConsoleFilter: (f: EngineStore['consoleFilter']) => void;
  setActivePanel: (p: EngineStore['activePanel']) => void;
  setRightPanelTab: (t: EngineStore['rightPanelTab']) => void;
  setBottomPanelTab: (t: EngineStore['bottomPanelTab']) => void;
  toggleBottomPanel: () => void;
  clearScene: () => void;
  loadDefaultScene: () => void;
  setSceneName: (name: string) => void;
}

// --- Default factories --------------------------------------------------------

export function makeDefaultTransform(): TransformComponent {
  return { type: 'transform', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

export function makeDefaultMesh(geometry: MeshGeometry = 'box'): MeshComponent {
  return { type: 'mesh', geometry, color: '#4a9eff', wireframe: false, castShadow: true, receiveShadow: true, metalness: 0.1, roughness: 0.7, opacity: 1, transparent: false };
}

export function makeDefaultLight(lightType: LightType = 'point'): LightComponent {
  return { type: 'light', lightType, color: '#ffffff', intensity: 1, castShadow: true, distance: 20, angle: Math.PI / 4, penumbra: 0.1 };
}

export function makeDefaultRigidbody(): RigidbodyComponent {
  return { type: 'rigidbody', bodyType: 'dynamic', isKinematic: false, gravityScale: 1, linearDamping: 0.05, angularDamping: 0.05, initialLinearVelocity: [0,0,0], initialAngularVelocity: [0,0,0], lockTranslations: false, lockRotations: false, ccd: false, canSleep: true };
}

export function makeDefaultCollider(shape: ColliderShape = 'cuboid'): ColliderComponent {
  return { type: 'collider', shape, halfExtents: [0.5,0.5,0.5], radius: 0.5, halfHeight: 0.5, restitution: 0.3, friction: 0.7, density: 1.0, isSensor: false, offset: [0,0,0] };
}

function makeObject(partial: Partial<SceneObject> = {}): SceneObject {
  return { id: nanoid(8), name: 'GameObject', parentId: null, childIds: [], active: true, locked: false, components: { transform: makeDefaultTransform() }, tags: [], ...partial };
}

// --- Default scene ------------------------------------------------------------

function buildDefaultScene(): { objects: Record<string, SceneObject>; rootIds: string[] } {
  const floor = makeObject({
    id: 'floor', name: 'Floor',
    components: {
      transform: { type: 'transform', position: [0, -0.05, 0], rotation: [0,0,0], scale: [12, 0.1, 12] },
      mesh: { type: 'mesh', geometry: 'box', color: '#2a2a3a', wireframe: false, castShadow: false, receiveShadow: true, metalness: 0.0, roughness: 0.9, opacity: 1, transparent: false },
      rigidbody: { type: 'rigidbody', bodyType: 'fixed', isKinematic: false, gravityScale: 0, linearDamping: 0, angularDamping: 0, initialLinearVelocity: [0,0,0], initialAngularVelocity: [0,0,0], lockTranslations: true, lockRotations: true, ccd: false, canSleep: true },
      collider: { type: 'collider', shape: 'cuboid', halfExtents: [6,0.05,6], radius: 0.5, halfHeight: 0.5, restitution: 0.3, friction: 0.8, density: 0, isSensor: false, offset: [0,0,0] },
    },
  });
  const cube = makeObject({
    id: 'cube1', name: 'Cube',
    components: {
      transform: { type: 'transform', position: [0, 4, 0], rotation: [15,45,10], scale: [1,1,1] },
      mesh: { type: 'mesh', geometry: 'box', color: '#00e5ff', wireframe: false, castShadow: true, receiveShadow: true, metalness: 0.2, roughness: 0.5, opacity: 1, transparent: false },
      rigidbody: { type: 'rigidbody', bodyType: 'dynamic', isKinematic: false, gravityScale: 1, linearDamping: 0.05, angularDamping: 0.05, initialLinearVelocity: [0,0,0], initialAngularVelocity: [0,0,0], lockTranslations: false, lockRotations: false, ccd: false, canSleep: true },
      collider: { type: 'collider', shape: 'cuboid', halfExtents: [0.5,0.5,0.5], radius: 0.5, halfHeight: 0.5, restitution: 0.4, friction: 0.6, density: 1.0, isSensor: false, offset: [0,0,0] },
    },
  });
  const sphere = makeObject({
    id: 'sphere1', name: 'Sphere',
    components: {
      transform: { type: 'transform', position: [2, 6, 0], rotation: [0,0,0], scale: [1,1,1] },
      mesh: { type: 'mesh', geometry: 'sphere', color: '#ff6b35', wireframe: false, castShadow: true, receiveShadow: true, metalness: 0.4, roughness: 0.3, opacity: 1, transparent: false },
      rigidbody: { type: 'rigidbody', bodyType: 'dynamic', isKinematic: false, gravityScale: 1, linearDamping: 0.02, angularDamping: 0.02, initialLinearVelocity: [0,0,0], initialAngularVelocity: [0,0,0], lockTranslations: false, lockRotations: false, ccd: true, canSleep: true },
      collider: { type: 'collider', shape: 'ball', halfExtents: [0.5,0.5,0.5], radius: 0.5, halfHeight: 0.5, restitution: 0.7, friction: 0.3, density: 1.0, isSensor: false, offset: [0,0,0] },
    },
  });
  const capsule = makeObject({
    id: 'capsule1', name: 'Capsule',
    components: {
      transform: { type: 'transform', position: [-2, 7, 1], rotation: [0,0,0], scale: [1,1,1] },
      mesh: { type: 'mesh', geometry: 'capsule', color: '#44ff88', wireframe: false, castShadow: true, receiveShadow: true, metalness: 0.1, roughness: 0.6, opacity: 1, transparent: false },
      rigidbody: { type: 'rigidbody', bodyType: 'dynamic', isKinematic: false, gravityScale: 1, linearDamping: 0.05, angularDamping: 0.05, initialLinearVelocity: [1,0,0], initialAngularVelocity: [0,0,0], lockTranslations: false, lockRotations: false, ccd: false, canSleep: true },
      collider: { type: 'collider', shape: 'capsule', halfExtents: [0.3,0.5,0.3], radius: 0.3, halfHeight: 0.5, restitution: 0.2, friction: 0.7, density: 1.0, isSensor: false, offset: [0,0,0] },
    },
  });
  const dirLight = makeObject({
    id: 'dirlight1', name: 'Directional Light',
    components: {
      transform: { type: 'transform', position: [5,8,5], rotation: [0,0,0], scale: [1,1,1] },
      light: { type: 'light', lightType: 'directional', color: '#ffffff', intensity: 1.5, castShadow: true },
    },
  });
  const ambLight = makeObject({
    id: 'amblight1', name: 'Ambient Light',
    components: {
      transform: makeDefaultTransform(),
      light: { type: 'light', lightType: 'ambient', color: '#334466', intensity: 0.5, castShadow: false },
    },
  });
  const camera = makeObject({
    id: 'maincam', name: 'Main Camera',
    components: {
      transform: { type: 'transform', position: [0,3,8], rotation: [-15,0,0], scale: [1,1,1] },
      camera: { type: 'camera', fov: 60, near: 0.1, far: 1000, isMain: true },
    },
  });
  return {
    objects: { floor, cube1: cube, sphere1: sphere, capsule1: capsule, dirlight1: dirLight, amblight1: ambLight, maincam: camera },
    rootIds: ['floor', 'cube1', 'sphere1', 'capsule1', 'dirlight1', 'amblight1', 'maincam'],
  };
}

// --- Store --------------------------------------------------------------------

const { objects: defaultObjects, rootIds: defaultRootIds } = buildDefaultScene();

export const useEngineStore = create<EngineStore>()(
  subscribeWithSelector((set, get) => ({
    objects: defaultObjects,
    rootIds: defaultRootIds,
    sceneName: 'Untitled Scene',
    selectedIds: [],
    hoveredId: null,
    mode: 'editor',
    transformMode: 'translate',
    transformSpace: 'world',
    showGrid: true,
    showGizmos: true,
    showStats: false,
    showWireframe: false,
    showPhysicsDebug: false,
    snapEnabled: false,
    snapValue: 0.25,
    editorCamera: { position: [5,5,10], target: [0,0,0] },
    physicsGravity: [0, -9.81, 0],
    physicsTimestep: 'vary',
    consoleEntries: [
      { id: nanoid(6), level: 'info', message: 'R3F Game Engine initialized. Physics: Rapier WASM.', timestamp: Date.now(), source: 'Engine' },
    ],
    consoleFilter: 'all',
    activePanel: 'hierarchy',
    rightPanelTab: 'inspector',
    bottomPanelTab: 'console',
    bottomPanelOpen: true,

    addObject: (partial = {}, parentId = null) => {
      const id = nanoid(8);
      const obj: SceneObject = { id, name: partial.name ?? 'GameObject', parentId, childIds: [], active: true, locked: false, components: { transform: makeDefaultTransform(), ...partial.components }, tags: partial.tags ?? [], ...partial };
      set(state => {
        const newObjects = { ...state.objects, [id]: obj };
        if (parentId && newObjects[parentId]) newObjects[parentId] = { ...newObjects[parentId], childIds: [...newObjects[parentId].childIds, id] };
        return { objects: newObjects, rootIds: parentId ? state.rootIds : [...state.rootIds, id] };
      });
      get().log(`Created "${obj.name}"`, 'log', 'Scene');
      return id;
    },

    removeObject: (id) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        const newObjects = { ...state.objects };
        const toRemove: string[] = [];
        const collect = (oid: string) => { toRemove.push(oid); (newObjects[oid]?.childIds ?? []).forEach(collect); };
        collect(id);
        toRemove.forEach(oid => delete newObjects[oid]);
        if (obj.parentId && newObjects[obj.parentId]) newObjects[obj.parentId] = { ...newObjects[obj.parentId], childIds: newObjects[obj.parentId].childIds.filter(c => c !== id) };
        return { objects: newObjects, rootIds: state.rootIds.filter(r => !toRemove.includes(r)), selectedIds: state.selectedIds.filter(s => !toRemove.includes(s)) };
      });
      get().log(`Removed object "${id}"`, 'warn', 'Scene');
    },

    duplicateObject: (id) => {
      const state = get();
      const obj = state.objects[id];
      if (!obj) return '';
      const newId = nanoid(8);
      const cloned: SceneObject = { ...JSON.parse(JSON.stringify(obj)), id: newId, name: obj.name + ' (Copy)', childIds: [] };
      if (cloned.components.transform) { const t = cloned.components.transform as TransformComponent; t.position = [t.position[0]+0.5, t.position[1], t.position[2]+0.5]; }
      set(state => {
        const newObjects = { ...state.objects, [newId]: cloned };
        if (cloned.parentId && newObjects[cloned.parentId]) newObjects[cloned.parentId] = { ...newObjects[cloned.parentId], childIds: [...newObjects[cloned.parentId].childIds, newId] };
        return { objects: newObjects, rootIds: cloned.parentId ? state.rootIds : [...state.rootIds, newId] };
      });
      get().log(`Duplicated "${obj.name}"`, 'log', 'Scene');
      return newId;
    },

    updateObject: (id, patch) => set(state => ({ objects: { ...state.objects, [id]: { ...state.objects[id], ...patch } } })),

    updateComponent: <T extends Component>(id: string, compType: string, patch: Partial<T>) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        return { objects: { ...state.objects, [id]: { ...obj, components: { ...obj.components, [compType]: { ...obj.components[compType], ...patch } } } } };
      });
    },

    addComponent: (id, component) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        return { objects: { ...state.objects, [id]: { ...obj, components: { ...obj.components, [component.type]: component } } } };
      });
      get().log(`Added component "${component.type}"`, 'log', 'Scene');
    },

    removeComponent: (id, compType) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj || compType === 'transform') return state;
        const newComps = { ...obj.components };
        delete newComps[compType];
        return { objects: { ...state.objects, [id]: { ...obj, components: newComps } } };
      });
      get().log(`Removed component "${compType}"`, 'warn', 'Scene');
    },

    reparentObject: (id, newParentId) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj || id === newParentId) return state;
        const newObjects = { ...state.objects };
        if (obj.parentId && newObjects[obj.parentId]) newObjects[obj.parentId] = { ...newObjects[obj.parentId], childIds: newObjects[obj.parentId].childIds.filter(c => c !== id) };
        if (newParentId && newObjects[newParentId]) newObjects[newParentId] = { ...newObjects[newParentId], childIds: [...newObjects[newParentId].childIds, id] };
        newObjects[id] = { ...obj, parentId: newParentId };
        const newRootIds = !newParentId ? (obj.parentId ? [...state.rootIds, id] : state.rootIds) : state.rootIds.filter(r => r !== id);
        return { objects: newObjects, rootIds: newRootIds };
      });
    },

    reorderObject: (id, direction) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        if (!obj.parentId) {
          const idx = state.rootIds.indexOf(id);
          if (idx === -1) return state;
          const newRootIds = [...state.rootIds];
          const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (swapIdx < 0 || swapIdx >= newRootIds.length) return state;
          [newRootIds[idx], newRootIds[swapIdx]] = [newRootIds[swapIdx], newRootIds[idx]];
          return { rootIds: newRootIds };
        }
        const parent = state.objects[obj.parentId];
        if (!parent) return state;
        const idx = parent.childIds.indexOf(id);
        const newChildIds = [...parent.childIds];
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= newChildIds.length) return state;
        [newChildIds[idx], newChildIds[swapIdx]] = [newChildIds[swapIdx], newChildIds[idx]];
        return { objects: { ...state.objects, [parent.id]: { ...parent, childIds: newChildIds } } };
      });
    },

    selectObject: (id, multi = false) => {
      set(state => {
        if (!id) return { selectedIds: [] };
        if (multi) { const already = state.selectedIds.includes(id); return { selectedIds: already ? state.selectedIds.filter(s => s !== id) : [...state.selectedIds, id] }; }
        return { selectedIds: [id] };
      });
    },
    setHovered: (id) => set({ hoveredId: id }),

    setMode: (mode) => {
      const prev = get().mode;
      set({ mode });
      if (mode === 'play' && prev !== 'play') get().log('? Play mode started -- Rapier physics active', 'info', 'Engine');
      else if (mode === 'editor' && prev !== 'editor') get().log('? Stopped -- returned to editor', 'info', 'Engine');
      else if (mode === 'pause') get().log('? Paused', 'info', 'Engine');
    },

    setTransformMode: (mode) => set({ transformMode: mode }),
    setTransformSpace: (space) => set({ transformSpace: space }),
    toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
    toggleGizmos: () => set(s => ({ showGizmos: !s.showGizmos })),
    toggleStats: () => set(s => ({ showStats: !s.showStats })),
    toggleWireframe: () => set(s => ({ showWireframe: !s.showWireframe })),
    togglePhysicsDebug: () => set(s => ({ showPhysicsDebug: !s.showPhysicsDebug })),
    toggleSnap: () => set(s => ({ snapEnabled: !s.snapEnabled })),
    setSnapValue: (v) => set({ snapValue: v }),
    setEditorCamera: (cam) => set(s => ({ editorCamera: { ...s.editorCamera, ...cam } })),
    setPhysicsGravity: (g) => set({ physicsGravity: g }),
    setPhysicsTimestep: (t) => set({ physicsTimestep: t }),

    log: (message, level = 'log', source) => {
      set(s => ({ consoleEntries: [...s.consoleEntries.slice(-199), { id: nanoid(6), level, message, timestamp: Date.now(), source }] }));
    },
    clearConsole: () => set({ consoleEntries: [] }),
    setConsoleFilter: (f) => set({ consoleFilter: f }),
    setActivePanel: (p) => set({ activePanel: p }),
    setRightPanelTab: (t) => set({ rightPanelTab: t }),
    setBottomPanelTab: (t) => set({ bottomPanelTab: t }),
    toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),
    clearScene: () => { set({ objects: {}, rootIds: [], selectedIds: [] }); get().log('Scene cleared', 'warn', 'Scene'); },
    loadDefaultScene: () => { const { objects, rootIds } = buildDefaultScene(); set({ objects, rootIds, selectedIds: [] }); get().log('Default scene loaded', 'info', 'Scene'); },
    setSceneName: (name) => set({ sceneName: name }),
  }))
);
