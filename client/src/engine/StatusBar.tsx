/**
 * R3F Game Engine — Status Bar
 * Design: Obsidian Terminal — bottom info strip
 */

import { useEngineStore } from './store';
import { Cpu, Box, Sun, Camera, Layers } from 'lucide-react';

export default function StatusBar() {
  const { objects, mode, selectedIds, sceneName } = useEngineStore();

  const allObjects = Object.values(objects);
  const meshCount = allObjects.filter(o => o.components.mesh).length;
  const lightCount = allObjects.filter(o => o.components.light).length;
  const cameraCount = allObjects.filter(o => o.components.camera).length;
  const totalCount = allObjects.length;

  return (
    <div
      className="flex items-center gap-4 px-3 shrink-0"
      style={{
        height: 22,
        background: '#080810',
        borderTop: '1px solid #1a1a28',
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {/* Mode indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: mode === 'play' ? '#ff6b35' : mode === 'pause' ? '#ffd700' : '#00e5ff',
          }}
        />
        <span className="text-gray-600 uppercase" style={{ fontSize: 9, letterSpacing: '0.05em' }}>
          {mode}
        </span>
      </div>

      <div className="w-px h-3" style={{ background: '#2a2a38' }} />

      {/* Scene name */}
      <span className="text-gray-600 truncate max-w-24">{sceneName}</span>

      <div className="w-px h-3" style={{ background: '#2a2a38' }} />

      {/* Object counts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-gray-600">
          <Layers size={9} />
          <span>{totalCount} obj</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Box size={9} className="text-cyan-700" />
          <span>{meshCount}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Sun size={9} className="text-yellow-700" />
          <span>{lightCount}</span>
        </div>
        <div className="flex items-center gap-1 text-gray-600">
          <Camera size={9} className="text-blue-700" />
          <span>{cameraCount}</span>
        </div>
      </div>

      {/* Selection info */}
      {selectedIds.length > 0 && (
        <>
          <div className="w-px h-3" style={{ background: '#2a2a38' }} />
          <span className="text-cyan-700">
            {selectedIds.length === 1
              ? `"${objects[selectedIds[0]]?.name ?? selectedIds[0]}" selected`
              : `${selectedIds.length} objects selected`}
          </span>
        </>
      )}

      <div className="flex-1" />

      {/* Engine info */}
      <div className="flex items-center gap-1 text-gray-700">
        <Cpu size={9} />
        <span>R3F Engine v1.0 · @react-three/fiber · @react-three/drei</span>
      </div>
    </div>
  );
}
