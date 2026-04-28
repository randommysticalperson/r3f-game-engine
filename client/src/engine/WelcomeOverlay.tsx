/**
 * R3F Game Engine -- Welcome Overlay
 * Design: Obsidian Terminal -- shown on first load
 */

import { useState } from 'react';
import { Cpu, X, Keyboard, Box, Sun, Camera, Move, RotateCw, Maximize2, Play } from 'lucide-react';

const shortcuts = [
  { key: 'W', desc: 'Translate mode' },
  { key: 'E', desc: 'Rotate mode' },
  { key: 'R', desc: 'Scale mode' },
  { key: 'F5', desc: 'Play / Stop' },
  { key: 'Del', desc: 'Delete selected' },
  { key: 'Ctrl+D', desc: 'Duplicate selected' },
  { key: 'LMB', desc: 'Select object' },
  { key: 'Shift+LMB', desc: 'Multi-select' },
  { key: 'RMB drag', desc: 'Pan camera' },
  { key: 'Scroll', desc: 'Zoom camera' },
  { key: 'LMB drag', desc: 'Orbit camera' },
];

export default function WelcomeOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(5,5,10,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={() => setVisible(false)}
    >
      <div
        className="relative max-w-lg w-full mx-4 rounded-sm"
        style={{
          background: '#0e0e16',
          border: '1px solid #2a2a38',
          boxShadow: '0 0 60px rgba(0,229,255,0.08)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid #1e1e2e' }}>
          <div className="flex items-center justify-center w-8 h-8 rounded" style={{ background: '#00e5ff18', border: '1px solid #00e5ff33' }}>
            <Cpu size={16} className="text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-mono font-bold text-gray-100">R3F Game Engine</h1>
            <p className="text-xs font-mono text-gray-500">Browser-based 3D editor powered by React Three Fiber</p>
          </div>
          <button
            className="ml-auto p-1 text-gray-600 hover:text-gray-300 transition-colors"
            onClick={() => setVisible(false)}
          >
            <X size={14} />
          </button>
        </div>

        {/* Quick start */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #1e1e2e' }}>
          <p className="text-xs font-mono text-gray-400 mb-3">Quick Start</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Box size={12} />, text: 'Click objects in the scene to select them' },
              { icon: <Move size={12} />, text: 'Use W/E/R to switch transform modes' },
              { icon: <Sun size={12} />, text: 'Add objects via the Hierarchy panel' },
              { icon: <Play size={12} />, text: 'Press F5 or ? to enter Play mode' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded" style={{ background: '#16161e', border: '1px solid #1e1e2e' }}>
                <span className="text-cyan-500 shrink-0 mt-0.5">{item.icon}</span>
                <span className="text-xs font-mono text-gray-400">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Keyboard shortcuts */}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Keyboard size={11} className="text-gray-500" />
            <p className="text-xs font-mono text-gray-400">Keyboard Shortcuts</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {shortcuts.map(s => (
              <div key={s.key} className="flex items-center gap-2">
                <kbd
                  className="text-xs font-mono px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: '#1a1a28', border: '1px solid #2a2a38', color: '#00e5ff', minWidth: 40, textAlign: 'center' }}
                >
                  {s.key}
                </kbd>
                <span className="text-xs font-mono text-gray-500">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: '1px solid #1e1e2e' }}>
          <span className="text-xs font-mono text-gray-600">Click anywhere to dismiss</span>
          <button
            className="px-3 py-1.5 text-xs font-mono rounded transition-colors"
            style={{ background: '#00e5ff18', border: '1px solid #00e5ff44', color: '#00e5ff' }}
            onClick={() => setVisible(false)}
          >
            Start Building ?
          </button>
        </div>
      </div>
    </div>
  );
}
