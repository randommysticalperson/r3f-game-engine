/**
 * R3F Game Engine -- Scene Hierarchy Panel
 * Design: Obsidian Terminal -- monospace, electric cyan selections
 */

import { useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  Box,
  Sun,
  Camera,
  Circle,
  Triangle,
  Cylinder,
  Layers,
  Search,
} from 'lucide-react';
import { useEngineStore } from './store';
import type { SceneObject } from './store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { makeDefaultMesh, makeDefaultLight, makeDefaultTransform } from './store';

// --- Object icon --------------------------------------------------------------

function ObjectIcon({ obj }: { obj: SceneObject }) {
  const hasLight = !!obj.components.light;
  const hasCamera = !!obj.components.camera;
  const hasMesh = !!obj.components.mesh;
  const mesh = obj.components.mesh as any;

  if (hasCamera) return <Camera size={11} className="text-blue-400 shrink-0" />;
  if (hasLight) return <Sun size={11} className="text-yellow-400 shrink-0" />;
  if (hasMesh) {
    const g = mesh?.geometry;
    if (g === 'sphere' || g === 'icosahedron') return <Circle size={11} className="text-cyan-400 shrink-0" />;
    if (g === 'cylinder' || g === 'cone' || g === 'capsule') return <Cylinder size={11} className="text-cyan-400 shrink-0" />;
    if (g === 'torus') return <Circle size={11} className="text-purple-400 shrink-0" />;
    return <Box size={11} className="text-cyan-400 shrink-0" />;
  }
  return <Layers size={11} className="text-gray-400 shrink-0" />;
}

// --- Single hierarchy item ----------------------------------------------------

interface HierarchyItemProps {
  id: string;
  depth: number;
}

function HierarchyItem({ id, depth }: HierarchyItemProps) {
  const {
    objects,
    selectedIds,
    selectObject,
    updateObject,
    removeObject,
    duplicateObject,
    reorderObject,
  } = useEngineStore();
  const [expanded, setExpanded] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const obj = objects[id];
  if (!obj) return null;

  const isSelected = selectedIds.includes(id);
  const hasChildren = obj.childIds.length > 0;

  const startRename = () => {
    setRenameValue(obj.name);
    setRenaming(true);
  };

  const commitRename = () => {
    if (renameValue.trim()) updateObject(id, { name: renameValue.trim() });
    setRenaming(false);
  };

  return (
    <div>
      <div
        className={`flex items-center gap-0.5 py-0.5 px-1 cursor-pointer select-none group rounded-sm transition-colors ${
          isSelected
            ? 'bg-cyan-950/60 text-cyan-300'
            : 'hover:bg-white/5 text-gray-300'
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={(e) => selectObject(id, e.shiftKey || e.ctrlKey || e.metaKey)}
        onDoubleClick={startRename}
      >
        {/* Expand toggle */}
        <button
          className="w-4 h-4 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
        >
          {hasChildren ? (
            expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />
          ) : (
            <span className="w-2 h-px bg-gray-600 block" />
          )}
        </button>

        {/* Icon */}
        <ObjectIcon obj={obj} />

        {/* Name */}
        {renaming ? (
          <input
            autoFocus
            className="flex-1 bg-transparent border-b border-cyan-500 outline-none text-xs font-mono text-cyan-200 px-0.5 min-w-0"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') setRenaming(false);
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-xs font-mono truncate ml-1" style={{ opacity: obj.active ? 1 : 0.4 }}>
            {obj.name}
          </span>
        )}

        {/* Action buttons (show on hover / selected) */}
        <div className={`flex items-center gap-0.5 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          <button
            className="p-0.5 hover:text-cyan-400 transition-colors"
            onClick={e => { e.stopPropagation(); updateObject(id, { active: !obj.active }); }}
            title={obj.active ? 'Hide' : 'Show'}
          >
            {obj.active ? <Eye size={10} /> : <EyeOff size={10} className="text-gray-500" />}
          </button>
          <button
            className="p-0.5 hover:text-cyan-400 transition-colors"
            onClick={e => { e.stopPropagation(); updateObject(id, { locked: !obj.locked }); }}
            title={obj.locked ? 'Unlock' : 'Lock'}
          >
            {obj.locked ? <Lock size={10} className="text-orange-400" /> : <Unlock size={10} />}
          </button>
          <button
            className="p-0.5 hover:text-cyan-400 transition-colors"
            onClick={e => { e.stopPropagation(); duplicateObject(id); }}
            title="Duplicate"
          >
            <Copy size={10} />
          </button>
          <button
            className="p-0.5 hover:text-red-400 transition-colors"
            onClick={e => { e.stopPropagation(); removeObject(id); }}
            title="Delete"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {obj.childIds.map(childId => (
            <HierarchyItem key={childId} id={childId} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Add object menu ----------------------------------------------------------

function AddObjectMenu() {
  const { addObject } = useEngineStore();

  const addMesh = (geometry: string) => {
    const names: Record<string, string> = {
      box: 'Cube', sphere: 'Sphere', cylinder: 'Cylinder', cone: 'Cone',
      torus: 'Torus', plane: 'Plane', capsule: 'Capsule', icosahedron: 'Icosahedron',
    };
    addObject({
      name: names[geometry] ?? 'Mesh',
      components: {
        transform: { type: 'transform', position: [0, 0.5, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        mesh: { ...makeDefaultMesh(), geometry: geometry as any },
      },
    });
  };

  const addLight = (lightType: string) => {
    const names: Record<string, string> = {
      ambient: 'Ambient Light', directional: 'Directional Light',
      point: 'Point Light', spot: 'Spot Light',
    };
    addObject({
      name: names[lightType] ?? 'Light',
      components: {
        transform: { type: 'transform', position: [0, 3, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        light: makeDefaultLight(lightType as any),
      },
    });
  };

  const addCamera = () => {
    addObject({
      name: 'Camera',
      components: {
        transform: { type: 'transform', position: [0, 3, 8], rotation: [-15, 0, 0], scale: [1, 1, 1] },
        camera: { type: 'camera', fov: 60, near: 0.1, far: 1000, isMain: false },
      },
    });
  };

  const addEmpty = () => {
    addObject({ name: 'Empty', components: { transform: makeDefaultTransform() } });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-1 px-2 py-1 text-xs font-mono text-cyan-400 border border-cyan-900/60 hover:border-cyan-500/60 hover:bg-cyan-950/30 rounded transition-colors"
          title="Add GameObject"
        >
          <Plus size={11} /> Add
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="font-mono text-xs"
        style={{ background: '#111116', border: '1px solid #2a2a38', minWidth: 160 }}
      >
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs font-mono">
            <Box size={11} className="mr-2" /> 3D Object
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent style={{ background: '#111116', border: '1px solid #2a2a38' }}>
            {['box', 'sphere', 'cylinder', 'cone', 'torus', 'plane', 'capsule', 'icosahedron'].map(g => (
              <DropdownMenuItem key={g} className="text-xs font-mono" onClick={() => addMesh(g)}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="text-xs font-mono">
            <Sun size={11} className="mr-2" /> Light
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent style={{ background: '#111116', border: '1px solid #2a2a38' }}>
            {['ambient', 'directional', 'point', 'spot'].map(lt => (
              <DropdownMenuItem key={lt} className="text-xs font-mono" onClick={() => addLight(lt)}>
                {lt.charAt(0).toUpperCase() + lt.slice(1)} Light
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem className="text-xs font-mono" onClick={addCamera}>
          <Camera size={11} className="mr-2" /> Camera
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs font-mono" onClick={addEmpty}>
          <Layers size={11} className="mr-2" /> Empty Object
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// --- Main Hierarchy Panel -----------------------------------------------------

export default function HierarchyPanel() {
  const { objects, rootIds, sceneName, setSceneName, clearScene, loadDefaultScene } = useEngineStore();
  const [search, setSearch] = useState('');
  const [editingScene, setEditingScene] = useState(false);
  const [sceneNameValue, setSceneNameValue] = useState('');

  const totalObjects = Object.keys(objects).length;

  const filteredRootIds = search
    ? rootIds.filter(id => {
        const obj = objects[id];
        return obj?.name.toLowerCase().includes(search.toLowerCase());
      })
    : rootIds;

  return (
    <div className="flex flex-col h-full" style={{ background: '#0e0e16', borderRight: '1px solid #1e1e2e' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 shrink-0" style={{ borderBottom: '1px solid #1e1e2e' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Layers size={12} className="text-cyan-500 shrink-0" />
          {editingScene ? (
            <input
              autoFocus
              className="text-xs font-mono bg-transparent border-b border-cyan-500 outline-none text-cyan-200 min-w-0 flex-1"
              value={sceneNameValue}
              onChange={e => setSceneNameValue(e.target.value)}
              onBlur={() => { setSceneName(sceneNameValue || sceneName); setEditingScene(false); }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setSceneName(sceneNameValue || sceneName); setEditingScene(false); }
                if (e.key === 'Escape') setEditingScene(false);
              }}
            />
          ) : (
            <span
              className="text-xs font-mono font-bold text-gray-200 truncate cursor-pointer hover:text-cyan-300 transition-colors"
              onDoubleClick={() => { setSceneNameValue(sceneName); setEditingScene(true); }}
              title="Double-click to rename scene"
            >
              {sceneName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <AddObjectMenu />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 hover:text-cyan-400 text-gray-500 transition-colors rounded" title="Scene options">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
                </svg>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent style={{ background: '#111116', border: '1px solid #2a2a38' }}>
              <DropdownMenuItem className="text-xs font-mono" onClick={loadDefaultScene}>
                Reset to Default Scene
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs font-mono text-red-400" onClick={clearScene}>
                Clear Scene
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search */}
      <div className="px-2 py-1.5 shrink-0" style={{ borderBottom: '1px solid #1a1a28' }}>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: '#16161e', border: '1px solid #2a2a38' }}>
          <Search size={10} className="text-gray-500 shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-xs font-mono text-gray-300 placeholder-gray-600"
            placeholder="Search objects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Object count */}
      <div className="px-3 py-1 shrink-0">
        <span className="text-xs font-mono text-gray-600">{totalObjects} object{totalObjects !== 1 ? 's' : ''}</span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1 custom-scrollbar">
        {filteredRootIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-600">
            <Layers size={24} />
            <span className="text-xs font-mono">
              {search ? 'No results' : 'Scene is empty'}
            </span>
          </div>
        ) : (
          filteredRootIds.map(id => (
            <HierarchyItem key={id} id={id} depth={0} />
          ))
        )}
      </div>
    </div>
  );
}
