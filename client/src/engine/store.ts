/**
 * R3F Game Engine — Core Store
 * Design: Obsidian Terminal — dark industrial IDE
 * 
 * Entity-Component-System inspired scene graph using Zustand.
 * Each SceneObject is an entity with typed components (transform, mesh, light, etc.)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from 'nanoid';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Vec3 = [number, number, number];

export type ComponentType =
  | 'transform'
  | 'mesh'
  | 'light'
  | 'camera'
  | 'script'
  | 'rigidbody'
  | 'collider';

export interface TransformComponent {
  type: 'transform';
  position: Vec3;
  rotation: Vec3; // Euler degrees
  scale: Vec3;
}

export type MeshGeometry =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'plane'
  | 'capsule'
  | 'icosahedron';

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

export interface RigidbodyComponent {
  type: 'rigidbody';
  mass: number;
  isKinematic: boolean;
  useGravity: boolean;
  drag: number;
  angularDrag: number;
}

export interface ColliderComponent {
  type: 'collider';
  shape: 'box' | 'sphere' | 'capsule';
  isTrigger: boolean;
  center: Vec3;
  size: Vec3;
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

// ─── Store Interface ──────────────────────────────────────────────────────────

export interface EngineStore {
  // Scene
  objects: Record<string, SceneObject>;
  rootIds: string[];
  sceneName: string;

  // Selection
  selectedIds: string[];
  hoveredId: string | null;

  // Editor state
  mode: EditorMode;
  transformMode: TransformMode;
  transformSpace: TransformSpace;
  showGrid: boolean;
  showGizmos: boolean;
  showStats: boolean;
  showWireframe: boolean;
  snapEnabled: boolean;
  snapValue: number;
  editorCamera: EditorCamera;

  // Console
  consoleEntries: ConsoleEntry[];
  consoleFilter: 'all' | 'log' | 'warn' | 'error';

  // Active panel
  activePanel: 'hierarchy' | 'inspector' | 'assets' | 'console';
  rightPanelTab: 'inspector' | 'components';
  bottomPanelTab: 'console' | 'assets';
  bottomPanelOpen: boolean;

  // Actions — Scene
  addObject: (partial?: Partial<SceneObject>, parentId?: string | null) => string;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => string;
  updateObject: (id: string, patch: Partial<SceneObject>) => void;
  updateComponent: <T extends Component>(id: string, compType: string, patch: Partial<T>) => void;
  addComponent: (id: string, component: Component) => void;
  removeComponent: (id: string, compType: string) => void;
  reparentObject: (id: string, newParentId: string | null) => void;
  reorderObject: (id: string, direction: 'up' | 'down') => void;

  // Actions — Selection
  selectObject: (id: string | null, multi?: boolean) => void;
  setHovered: (id: string | null) => void;

  // Actions — Editor
  setMode: (mode: EditorMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  setTransformSpace: (space: TransformSpace) => void;
  toggleGrid: () => void;
  toggleGizmos: () => void;
  toggleStats: () => void;
  toggleWireframe: () => void;
  toggleSnap: () => void;
  setSnapValue: (v: number) => void;
  setEditorCamera: (cam: Partial<EditorCamera>) => void;

  // Actions — Console
  log: (msg: string, level?: ConsoleEntry['level'], source?: string) => void;
  clearConsole: () => void;
  setConsoleFilter: (f: EngineStore['consoleFilter']) => void;

  // Actions — UI
  setActivePanel: (p: EngineStore['activePanel']) => void;
  setRightPanelTab: (t: EngineStore['rightPanelTab']) => void;
  setBottomPanelTab: (t: EngineStore['bottomPanelTab']) => void;
  toggleBottomPanel: () => void;

  // Actions — Scene management
  clearScene: () => void;
  loadDefaultScene: () => void;
  setSceneName: (name: string) => void;
}

// ─── Default object factory ───────────────────────────────────────────────────

export function makeDefaultTransform(): TransformComponent {
  return { type: 'transform', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
}

export function makeDefaultMesh(geometry: MeshGeometry = 'box'): MeshComponent {
  return {
    type: 'mesh',
    geometry,
    color: '#4a9eff',
    wireframe: false,
    castShadow: true,
    receiveShadow: true,
    metalness: 0.1,
    roughness: 0.7,
    opacity: 1,
    transparent: false,
  };
}

export function makeDefaultLight(lightType: LightType = 'point'): LightComponent {
  return {
    type: 'light',
    lightType,
    color: '#ffffff',
    intensity: 1,
    castShadow: true,
    distance: 20,
    angle: Math.PI / 4,
    penumbra: 0.1,
  };
}

function makeObject(partial: Partial<SceneObject> = {}): SceneObject {
  return {
    id: nanoid(8),
    name: 'GameObject',
    parentId: null,
    childIds: [],
    active: true,
    locked: false,
    components: {
      transform: makeDefaultTransform(),
    },
    tags: [],
    ...partial,
  };
}

// ─── Default scene ────────────────────────────────────────────────────────────

function buildDefaultScene(): { objects: Record<string, SceneObject>; rootIds: string[] } {
  const floor = makeObject({
    id: 'floor',
    name: 'Floor',
    components: {
      transform: { type: 'transform', position: [0, -0.5, 0], rotation: [0, 0, 0], scale: [10, 0.1, 10] },
      mesh: { type: 'mesh', geometry: 'box', color: '#2a2a3a', wireframe: false, castShadow: false, receiveShadow: true, metalness: 0.0, roughness: 0.9, opacity: 1, transparent: false },
    },
  });

  const cube = makeObject({
    id: 'cube1',
    name: 'Cube',
    components: {
      transform: { type: 'transform', position: [0, 0.5, 0], rotation: [0, 45, 0], scale: [1, 1, 1] },
      mesh: { type: 'mesh', geometry: 'box', color: '#00e5ff', wireframe: false, castShadow: true, receiveShadow: true, metalness: 0.2, roughness: 0.5, opacity: 1, transparent: false },
    },
  });

  const sphere = makeObject({
    id: 'sphere1',
    name: 'Sphere',
    components: {
      transform: { type: 'transform', position: [2.5, 0.7, 0], rotation: [0, 0, 0], scale: [0.7, 0.7, 0.7] },
      mesh: { type: 'mesh', geometry: 'sphere', color: '#ff6b35', wireframe: false, castShadow: true, receiveShadow: true, metalness: 0.4, roughness: 0.3, opacity: 1, transparent: false },
    },
  });

  const dirLight = makeObject({
    id: 'dirlight1',
    name: 'Directional Light',
    components: {
      transform: { type: 'transform', position: [5, 8, 5], rotation: [0, 0, 0], scale: [1, 1, 1] },
      light: { type: 'light', lightType: 'directional', color: '#ffffff', intensity: 1.5, castShadow: true },
    },
  });

  const ambLight = makeObject({
    id: 'amblight1',
    name: 'Ambient Light',
    components: {
      transform: makeDefaultTransform(),
      light: { type: 'light', lightType: 'ambient', color: '#334466', intensity: 0.5, castShadow: false },
    },
  });

  const camera = makeObject({
    id: 'maincam',
    name: 'Main Camera',
    components: {
      transform: { type: 'transform', position: [0, 3, 8], rotation: [-15, 0, 0], scale: [1, 1, 1] },
      camera: { type: 'camera', fov: 60, near: 0.1, far: 1000, isMain: true },
    },
  });

  const objects: Record<string, SceneObject> = {
    floor, cube1: cube, sphere1: sphere, dirlight1: dirLight, amblight1: ambLight, maincam: camera,
  };
  const rootIds = ['floor', 'cube1', 'sphere1', 'dirlight1', 'amblight1', 'maincam'];

  return { objects, rootIds };
}

// ─── Store ────────────────────────────────────────────────────────────────────

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
    snapEnabled: false,
    snapValue: 0.5,
    editorCamera: { position: [5, 5, 10], target: [0, 0, 0] },

    consoleEntries: [
      { id: nanoid(6), level: 'info', message: 'R3F Game Engine initialized.', timestamp: Date.now(), source: 'Engine' },
    ],
    consoleFilter: 'all',

    activePanel: 'hierarchy',
    rightPanelTab: 'inspector',
    bottomPanelTab: 'console',
    bottomPanelOpen: true,

    // ── Scene actions ──────────────────────────────────────────────────────────

    addObject: (partial = {}, parentId = null) => {
      const obj = makeObject({ ...partial, parentId });
      set(state => {
        const newObjects = { ...state.objects, [obj.id]: obj };
        let newRootIds = state.rootIds;
        if (!parentId) {
          newRootIds = [...state.rootIds, obj.id];
        } else {
          const parent = newObjects[parentId];
          if (parent) {
            newObjects[parentId] = { ...parent, childIds: [...parent.childIds, obj.id] };
          }
        }
        return { objects: newObjects, rootIds: newRootIds };
      });
      get().log(`Created "${obj.name}"`, 'log', 'Scene');
      return obj.id;
    },

    removeObject: (id) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        const newObjects = { ...state.objects };
        // Recursively collect ids to remove
        const toRemove = new Set<string>();
        const collect = (oid: string) => {
          toRemove.add(oid);
          (newObjects[oid]?.childIds ?? []).forEach(collect);
        };
        collect(id);
        toRemove.forEach(oid => delete newObjects[oid]);
        // Remove from parent
        if (obj.parentId && newObjects[obj.parentId]) {
          newObjects[obj.parentId] = {
            ...newObjects[obj.parentId],
            childIds: newObjects[obj.parentId].childIds.filter(c => c !== id),
          };
        }
        const newRootIds = state.rootIds.filter(r => !toRemove.has(r));
        const newSelected = state.selectedIds.filter(s => !toRemove.has(s));
        return { objects: newObjects, rootIds: newRootIds, selectedIds: newSelected };
      });
    },

    duplicateObject: (id) => {
      const state = get();
      const src = state.objects[id];
      if (!src) return '';
      const newId = nanoid(8);
      const dup: SceneObject = {
        ...src,
        id: newId,
        name: src.name + ' (Copy)',
        childIds: [],
        components: JSON.parse(JSON.stringify(src.components)),
      };
      set(s => {
        const newObjects = { ...s.objects, [newId]: dup };
        let newRootIds = s.rootIds;
        if (!dup.parentId) {
          const idx = s.rootIds.indexOf(id);
          newRootIds = [...s.rootIds.slice(0, idx + 1), newId, ...s.rootIds.slice(idx + 1)];
        } else if (newObjects[dup.parentId]) {
          const parent = newObjects[dup.parentId];
          const idx = parent.childIds.indexOf(id);
          newObjects[dup.parentId] = {
            ...parent,
            childIds: [...parent.childIds.slice(0, idx + 1), newId, ...parent.childIds.slice(idx + 1)],
          };
        }
        return { objects: newObjects, rootIds: newRootIds, selectedIds: [newId] };
      });
      return newId;
    },

    updateObject: (id, patch) => {
      set(state => ({
        objects: { ...state.objects, [id]: { ...state.objects[id], ...patch } },
      }));
    },

    updateComponent: (id, compType, patch) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        return {
          objects: {
            ...state.objects,
            [id]: {
              ...obj,
              components: {
                ...obj.components,
                [compType]: { ...obj.components[compType], ...patch },
              },
            },
          },
        };
      });
    },

    addComponent: (id, component) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        return {
          objects: {
            ...state.objects,
            [id]: {
              ...obj,
              components: { ...obj.components, [component.type]: component },
            },
          },
        };
      });
    },

    removeComponent: (id, compType) => {
      if (compType === 'transform') return; // transform is required
      set(state => {
        const obj = state.objects[id];
        if (!obj) return state;
        const comps = { ...obj.components };
        delete comps[compType];
        return { objects: { ...state.objects, [id]: { ...obj, components: comps } } };
      });
    },

    reparentObject: (id, newParentId) => {
      set(state => {
        const obj = state.objects[id];
        if (!obj || id === newParentId) return state;
        const newObjects = { ...state.objects };
        // Remove from old parent
        if (obj.parentId && newObjects[obj.parentId]) {
          newObjects[obj.parentId] = {
            ...newObjects[obj.parentId],
            childIds: newObjects[obj.parentId].childIds.filter(c => c !== id),
          };
        }
        // Add to new parent
        if (newParentId && newObjects[newParentId]) {
          newObjects[newParentId] = {
            ...newObjects[newParentId],
            childIds: [...newObjects[newParentId].childIds, id],
          };
        }
        newObjects[id] = { ...obj, parentId: newParentId };
        const newRootIds = !newParentId
          ? obj.parentId ? [...state.rootIds, id] : state.rootIds
          : state.rootIds.filter(r => r !== id);
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
        return {
          objects: {
            ...state.objects,
            [parent.id]: { ...parent, childIds: newChildIds },
          },
        };
      });
    },

    // ── Selection ──────────────────────────────────────────────────────────────

    selectObject: (id, multi = false) => {
      set(state => {
        if (!id) return { selectedIds: [] };
        if (multi) {
          const already = state.selectedIds.includes(id);
          return { selectedIds: already ? state.selectedIds.filter(s => s !== id) : [...state.selectedIds, id] };
        }
        return { selectedIds: [id] };
      });
    },

    setHovered: (id) => set({ hoveredId: id }),

    // ── Editor ────────────────────────────────────────────────────────────────

    setMode: (mode) => {
      const prev = get().mode;
      set({ mode });
      if (mode === 'play' && prev !== 'play') {
        get().log('▶ Play mode started', 'info', 'Engine');
      } else if (mode === 'editor' && prev !== 'editor') {
        get().log('■ Stopped — returned to editor', 'info', 'Engine');
      } else if (mode === 'pause') {
        get().log('⏸ Paused', 'info', 'Engine');
      }
    },

    setTransformMode: (mode) => set({ transformMode: mode }),
    setTransformSpace: (space) => set({ transformSpace: space }),
    toggleGrid: () => set(s => ({ showGrid: !s.showGrid })),
    toggleGizmos: () => set(s => ({ showGizmos: !s.showGizmos })),
    toggleStats: () => set(s => ({ showStats: !s.showStats })),
    toggleWireframe: () => set(s => ({ showWireframe: !s.showWireframe })),
    toggleSnap: () => set(s => ({ snapEnabled: !s.snapEnabled })),
    setSnapValue: (v) => set({ snapValue: v }),
    setEditorCamera: (cam) => set(s => ({ editorCamera: { ...s.editorCamera, ...cam } })),

    // ── Console ───────────────────────────────────────────────────────────────

    log: (message, level = 'log', source) => {
      set(s => ({
        consoleEntries: [
          ...s.consoleEntries.slice(-199),
          { id: nanoid(6), level, message, timestamp: Date.now(), source },
        ],
      }));
    },

    clearConsole: () => set({ consoleEntries: [] }),
    setConsoleFilter: (f) => set({ consoleFilter: f }),

    // ── UI ────────────────────────────────────────────────────────────────────

    setActivePanel: (p) => set({ activePanel: p }),
    setRightPanelTab: (t) => set({ rightPanelTab: t }),
    setBottomPanelTab: (t) => set({ bottomPanelTab: t }),
    toggleBottomPanel: () => set(s => ({ bottomPanelOpen: !s.bottomPanelOpen })),

    // ── Scene management ──────────────────────────────────────────────────────

    clearScene: () => {
      set({ objects: {}, rootIds: [], selectedIds: [] });
      get().log('Scene cleared', 'warn', 'Scene');
    },

    loadDefaultScene: () => {
      const { objects, rootIds } = buildDefaultScene();
      set({ objects, rootIds, selectedIds: [] });
      get().log('Default scene loaded', 'info', 'Scene');
    },

    setSceneName: (name) => set({ sceneName: name }),
  }))
);
