/**
 * R3F Game Engine - Toolbar
 * Design: Obsidian Terminal - ember orange play mode, electric cyan selections
 * Scene persistence: tRPC + MySQL database via useScenePersistence hook
 */
import { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Move,
  RotateCw,
  Maximize2,
  Grid3X3,
  Layers,
  BarChart2,
  Magnet,
  Globe,
  Box,
  ChevronDown,
  Download,
  Cpu,
  Trash2,
  RefreshCw,
  Shield,
  Database,
  Loader2,
  FolderOpen,
} from 'lucide-react';
import { useEngineStore } from './store';
import { exportSceneJSON, downloadJSON } from './sceneIO';
import { useScenePersistence } from './useScenePersistence';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// --- Toolbar button ---
function ToolbarBtn({
  onClick,
  active,
  title,
  children,
  variant = 'default',
  disabled = false,
}: {
  onClick?: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'play' | 'pause' | 'stop';
  disabled?: boolean;
}) {
  const colors = {
    default: active
      ? 'bg-cyan-950/60 text-cyan-300 border-cyan-700/60'
      : 'text-gray-400 border-transparent hover:bg-white/5 hover:text-gray-200',
    play: 'text-green-400 border-green-900/60 hover:bg-green-950/40 hover:border-green-700/60',
    pause: 'text-yellow-400 border-yellow-900/60 hover:bg-yellow-950/40 hover:border-yellow-700/60',
    stop: 'text-red-400 border-red-900/60 hover:bg-red-950/40 hover:border-red-700/60',
  };

  return (
    <button
      className={`flex items-center justify-center w-7 h-7 rounded border text-xs transition-all ${colors[variant]} ${disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 mx-1" style={{ background: '#2a2a38' }} />;
}

// --- Main Toolbar ---
export default function Toolbar() {
  const {
    mode, setMode,
    transformMode, setTransformMode,
    transformSpace, setTransformSpace,
    showGrid, toggleGrid,
    showGizmos, toggleGizmos,
    showStats, toggleStats,
    showWireframe, toggleWireframe,
    snapEnabled, toggleSnap, snapValue, setSnapValue,
    sceneName, setSceneName,
    objects, rootIds,
    loadDefaultScene,
    log,
    showPhysicsDebug, togglePhysicsDebug,
  } = useEngineStore();

  const {
    isSaving,
    isLoading,
    currentSceneId,
    sceneList,
    saveToDb,
    loadFromDb,
  } = useScenePersistence();

  const isPlay = mode === 'play';
  const isPause = mode === 'pause';
  const isEditor = mode === 'editor';

  const [editingName, setEditingName] = useState(false);

  // --- Database save ---
  const handleSaveToDb = async () => {
    const id = await saveToDb();
    if (id) {
      toast.success(`Scene "${sceneName}" saved to database`, {
        description: `Scene ID: ${id}`,
      });
    } else {
      toast.error('Failed to save scene to database', {
        description: 'Check the console for details',
      });
    }
  };

  // --- Database load ---
  const handleLoadFromDb = async (sceneId: string, name: string) => {
    const ok = await loadFromDb(sceneId);
    if (ok) {
      toast.success(`Scene "${name}" loaded from database`);
    } else {
      toast.error(`Failed to load scene "${name}"`);
    }
  };

  // --- Export JSON ---
  const handleExport = () => {
    const json = exportSceneJSON(sceneName, objects, rootIds);
    downloadJSON(`${sceneName.replace(/\s+/g, '_')}.r3f.json`, json);
    log('Scene exported as JSON', 'info', 'Editor');
    toast.success('Scene exported as JSON');
  };

  return (
    <div
      className="flex items-center gap-1 px-3 shrink-0"
      style={{
        height: 42,
        background: '#0e0e16',
        borderBottom: `1px solid ${isPlay ? '#ff6b35' : isPause ? '#ffd700' : '#1e1e2e'}`,
        transition: 'border-color 0.2s',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="flex items-center justify-center w-6 h-6 rounded" style={{ background: '#00e5ff18', border: '1px solid #00e5ff44' }}>
          <Cpu size={12} className="text-cyan-400" />
        </div>
        <span className="text-xs font-mono font-bold text-gray-300 hidden sm:block">R3F Engine</span>
      </div>

      <Divider />

      {/* File operations */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1 px-2 h-7 text-xs font-mono text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded transition-colors">
            File <ChevronDown size={9} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent style={{ background: '#111116', border: '1px solid #2a2a38', minWidth: 200 }}>
          {/* Save to database */}
          <DropdownMenuItem
            className="text-xs font-mono gap-2"
            onClick={handleSaveToDb}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 size={11} className="animate-spin" /> : <Database size={11} />}
            {currentSceneId ? 'Save to DB (Update)' : 'Save to DB (New)'}
          </DropdownMenuItem>

          {/* Load from database */}
          {sceneList.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1 text-xs font-mono text-gray-600">
                Saved Scenes ({sceneList.length})
              </div>
              {sceneList.map((scene: any) => (
                <div key={scene.sceneId} className="flex items-center gap-1 px-2 py-1 hover:bg-white/5 rounded">
                  <button
                    className="flex-1 flex items-center gap-2 text-left text-xs font-mono text-gray-300 hover:text-cyan-300"
                    onClick={() => handleLoadFromDb(scene.sceneId, scene.name)}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 size={10} className="animate-spin" /> : <FolderOpen size={10} />}
                    <span className="truncate max-w-28">{scene.name}</span>
                  </button>
                  <span className="text-xs font-mono opacity-30 ml-auto">
                    {new Date(scene.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-xs font-mono gap-2"
            onClick={() => { loadDefaultScene(); toast.info('Default scene loaded'); }}
          >
            <RefreshCw size={11} /> Reset to Default Scene
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-xs font-mono gap-2" onClick={handleExport}>
            <Download size={11} /> Export Scene JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      {/* Transform mode */}
      <div className="flex items-center gap-0.5">
        <ToolbarBtn onClick={() => setTransformMode('translate')} active={transformMode === 'translate'} title="Translate (W)">
          <Move size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => setTransformMode('rotate')} active={transformMode === 'rotate'} title="Rotate (E)">
          <RotateCw size={13} />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => setTransformMode('scale')} active={transformMode === 'scale'} title="Scale (R)">
          <Maximize2 size={13} />
        </ToolbarBtn>
      </div>

      <Divider />

      {/* Transform space */}
      <ToolbarBtn
        onClick={() => setTransformSpace(transformSpace === 'world' ? 'local' : 'world')}
        active={transformSpace === 'local'}
        title={`Space: ${transformSpace} (toggle)`}
      >
        <Globe size={13} />
      </ToolbarBtn>
      <span className="text-xs font-mono text-gray-600 hidden md:block ml-1">{transformSpace}</span>

      <Divider />

      {/* Snap */}
      <ToolbarBtn onClick={toggleSnap} active={snapEnabled} title={`Snap: ${snapEnabled ? 'on' : 'off'}`}>
        <Magnet size={13} />
      </ToolbarBtn>
      {snapEnabled && (
        <input
          type="number"
          className="w-12 text-xs font-mono bg-transparent border-b outline-none text-gray-300 text-center ml-1"
          style={{ borderColor: '#2a2a38' }}
          value={snapValue}
          step={0.1}
          min={0.01}
          onChange={e => setSnapValue(parseFloat(e.target.value) || 0.5)}
          title="Snap value"
        />
      )}

      <Divider />

      {/* View toggles */}
      <ToolbarBtn onClick={toggleGrid} active={showGrid} title="Toggle Grid">
        <Grid3X3 size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={toggleGizmos} active={showGizmos} title="Toggle Gizmos">
        <Layers size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={toggleWireframe} active={showWireframe} title="Toggle Wireframe">
        <Box size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={toggleStats} active={showStats} title="Toggle Performance Stats">
        <BarChart2 size={13} />
      </ToolbarBtn>
      <ToolbarBtn onClick={togglePhysicsDebug} active={showPhysicsDebug} title="Toggle Physics Debug (Collider Wireframes)">
        <Shield size={13} />
      </ToolbarBtn>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Scene name with DB indicator */}
      <div className="flex items-center gap-1 mr-2">
        {editingName ? (
          <input
            autoFocus
            value={sceneName}
            onChange={e => setSceneName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false); }}
            className="h-6 px-1.5 rounded text-xs border outline-none"
            style={{
              background: '#1a1a2e',
              border: '1px solid #00e5ff44',
              color: '#c8d0e0',
              fontFamily: 'JetBrains Mono, monospace',
              width: 130,
            }}
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-xs font-mono text-gray-600 hidden lg:block truncate max-w-32 hover:text-gray-300 transition-colors"
            title="Click to rename scene"
          >
            {sceneName}
          </button>
        )}
        {currentSceneId && (
          <span title={`Saved to DB: ${currentSceneId}`}>
            <Database size={10} style={{ color: '#00e5ff', opacity: 0.5 }} />
          </span>
        )}
      </div>

      <Divider />

      {/* Play controls */}
      <div className="flex items-center gap-1">
        {isEditor ? (
          <ToolbarBtn onClick={() => setMode('play')} variant="play" title="Play (F5)">
            <Play size={13} fill="currentColor" />
          </ToolbarBtn>
        ) : (
          <>
            <ToolbarBtn
              onClick={() => setMode(isPause ? 'play' : 'pause')}
              variant="pause"
              title={isPause ? 'Resume' : 'Pause'}
            >
              {isPause ? <Play size={13} fill="currentColor" /> : <Pause size={13} fill="currentColor" />}
            </ToolbarBtn>
            <ToolbarBtn onClick={() => setMode('editor')} variant="stop" title="Stop">
              <Square size={13} fill="currentColor" />
            </ToolbarBtn>
          </>
        )}
      </div>

      {/* Play mode badge */}
      {!isEditor && (
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono ml-1"
          style={{
            background: isPlay ? 'rgba(255,107,53,0.15)' : 'rgba(255,215,0,0.15)',
            border: `1px solid ${isPlay ? '#ff6b3566' : '#ffd70066'}`,
            color: isPlay ? '#ff6b35' : '#ffd700',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'currentColor' }} />
          {isPlay ? 'PLAYING' : 'PAUSED'}
        </div>
      )}
    </div>
  );
}
