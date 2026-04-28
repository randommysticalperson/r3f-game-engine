/**
 * R3F Game Engine -- Bottom Panel (Console + Assets)
 * Design: Obsidian Terminal -- monospace terminal output
 */

import { useRef, useEffect, useState } from 'react';
import {
  Terminal,
  Trash2,
  AlertTriangle,
  Info,
  AlertCircle,
  MessageSquare,
  Filter,
  Box,
  Sun,
  Camera,
  Layers,
  ChevronUp,
  ChevronDown,
  FolderOpen,
  Image,
  FileCode,
  Music,
} from 'lucide-react';
import { useEngineStore } from './store';
import type { ConsoleEntry } from './store';

// --- Console ------------------------------------------------------------------

function ConsoleIcon({ level }: { level: ConsoleEntry['level'] }) {
  switch (level) {
    case 'error': return <AlertCircle size={10} className="text-red-400 shrink-0" />;
    case 'warn': return <AlertTriangle size={10} className="text-yellow-400 shrink-0" />;
    case 'info': return <Info size={10} className="text-blue-400 shrink-0" />;
    default: return <MessageSquare size={10} className="text-gray-500 shrink-0" />;
  }
}

function ConsolePanel() {
  const { consoleEntries, consoleFilter, setConsoleFilter, clearConsole } = useEngineStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleEntries, autoScroll]);

  const filtered = consoleFilter === 'all'
    ? consoleEntries
    : consoleEntries.filter(e => e.level === consoleFilter);

  const counts = {
    log: consoleEntries.filter(e => e.level === 'log').length,
    warn: consoleEntries.filter(e => e.level === 'warn').length,
    error: consoleEntries.filter(e => e.level === 'error').length,
    info: consoleEntries.filter(e => e.level === 'info').length,
  };

  const levelColors: Record<ConsoleEntry['level'], string> = {
    error: '#ff6666',
    warn: '#ffcc44',
    info: '#4488ff',
    log: '#c8d0e0',
  };

  const levelBg: Record<ConsoleEntry['level'], string> = {
    error: 'rgba(255,60,60,0.05)',
    warn: 'rgba(255,200,0,0.04)',
    info: 'rgba(60,120,255,0.04)',
    log: 'transparent',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Console toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 shrink-0" style={{ borderBottom: '1px solid #1a1a28' }}>
        <Filter size={10} className="text-gray-600" />
        {(['all', 'log', 'warn', 'error'] as const).map(f => (
          <button
            key={f}
            className={`text-xs font-mono px-1.5 py-0.5 rounded transition-colors ${
              consoleFilter === f ? 'bg-cyan-950/60 text-cyan-300' : 'text-gray-500 hover:text-gray-300'
            }`}
            onClick={() => setConsoleFilter(f)}
          >
            {f === 'all' ? `All (${consoleEntries.length})` : f === 'warn' ? `? ${counts.warn}` : f === 'error' ? `? ${counts.error}` : `? ${counts.log}`}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="flex items-center gap-1 text-xs font-mono text-gray-600 hover:text-red-400 transition-colors"
          onClick={clearConsole}
          title="Clear console"
        >
          <Trash2 size={10} /> Clear
        </button>
        <button
          className={`text-xs font-mono px-1.5 py-0.5 rounded transition-colors ${autoScroll ? 'text-cyan-400' : 'text-gray-600'}`}
          onClick={() => setAutoScroll(v => !v)}
          title="Auto-scroll"
        >
          ?
        </button>
      </div>

      {/* Entries */}
      <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs" style={{ background: '#0a0a10' }}>
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-700">
            <Terminal size={16} className="mr-2" /> No output
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-start gap-2 px-3 py-0.5 border-b"
              style={{
                borderColor: '#0f0f18',
                background: i % 2 === 0 ? levelBg[entry.level] : 'transparent',
              }}
            >
              <ConsoleIcon level={entry.level} />
              <span className="text-gray-600 shrink-0" style={{ fontSize: 9 }}>
                {new Date(entry.timestamp).toLocaleTimeString('en', { hour12: false })}
              </span>
              {entry.source && (
                <span className="shrink-0 px-1 rounded" style={{ fontSize: 9, background: '#1a1a28', color: '#5a6070' }}>
                  {entry.source}
                </span>
              )}
              <span style={{ color: levelColors[entry.level], wordBreak: 'break-all' }}>
                {entry.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// --- Assets Browser -----------------------------------------------------------

const DEMO_ASSETS = [
  { id: 'a1', name: 'DefaultMaterial', type: 'material', icon: <Box size={14} className="text-cyan-400" /> },
  { id: 'a2', name: 'SunLight', type: 'prefab', icon: <Sun size={14} className="text-yellow-400" /> },
  { id: 'a3', name: 'MainCamera', type: 'prefab', icon: <Camera size={14} className="text-blue-400" /> },
  { id: 'a4', name: 'GridFloor', type: 'prefab', icon: <Layers size={14} className="text-gray-400" /> },
  { id: 'a5', name: 'PlayerController', type: 'script', icon: <FileCode size={14} className="text-purple-400" /> },
  { id: 'a6', name: 'Skybox_Night', type: 'texture', icon: <Image size={14} className="text-green-400" /> },
  { id: 'a7', name: 'AmbientLoop', type: 'audio', icon: <Music size={14} className="text-pink-400" /> },
  { id: 'a8', name: 'PhysicsMaterial', type: 'material', icon: <Box size={14} className="text-orange-400" /> },
];

function AssetsPanel() {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { log } = useEngineStore();

  const types = ['all', 'material', 'prefab', 'script', 'texture', 'audio'];

  const filtered = DEMO_ASSETS.filter(a =>
    (filter === 'all' || a.type === filter) &&
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 shrink-0" style={{ borderBottom: '1px solid #1a1a28' }}>
        <FolderOpen size={10} className="text-gray-600" />
        <div className="flex items-center gap-1 overflow-x-auto">
          {types.map(t => (
            <button
              key={t}
              className={`text-xs font-mono px-1.5 py-0.5 rounded whitespace-nowrap transition-colors ${
                filter === t ? 'bg-cyan-950/60 text-cyan-300' : 'text-gray-500 hover:text-gray-300'
              }`}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <input
          className="text-xs font-mono bg-transparent border-b outline-none text-gray-300 placeholder-gray-600 w-24"
          style={{ borderColor: '#2a2a38' }}
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Asset grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {filtered.map(asset => (
            <div
              key={asset.id}
              className="flex flex-col items-center gap-1 p-2 rounded cursor-pointer hover:bg-white/5 transition-colors group"
              style={{ border: '1px solid #1a1a28' }}
              onDoubleClick={() => log(`Asset "${asset.name}" opened`, 'info', 'Assets')}
              title={`${asset.name} (${asset.type})`}
            >
              <div className="w-8 h-8 flex items-center justify-center rounded" style={{ background: '#16161e' }}>
                {asset.icon}
              </div>
              <span className="text-xs font-mono text-gray-400 text-center truncate w-full group-hover:text-gray-200 transition-colors" style={{ fontSize: 10 }}>
                {asset.name}
              </span>
              <span className="text-gray-700" style={{ fontSize: 9 }}>{asset.type}</span>
            </div>
          ))}
          {/* Import placeholder */}
          <div
            className="flex flex-col items-center gap-1 p-2 rounded cursor-pointer hover:bg-cyan-950/20 transition-colors border-dashed"
            style={{ border: '1px dashed #2a2a38' }}
            onClick={() => log('Asset import coming soon', 'info', 'Assets')}
          >
            <div className="w-8 h-8 flex items-center justify-center rounded text-gray-600">
              <span className="text-lg">+</span>
            </div>
            <span className="text-gray-600" style={{ fontSize: 10 }}>Import</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Bottom Panel --------------------------------------------------------

export default function BottomPanel() {
  const { bottomPanelTab, setBottomPanelTab, bottomPanelOpen, toggleBottomPanel, consoleEntries } = useEngineStore();

  const errorCount = consoleEntries.filter(e => e.level === 'error').length;
  const warnCount = consoleEntries.filter(e => e.level === 'warn').length;

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        height: bottomPanelOpen ? 200 : 32,
        borderTop: '1px solid #1e1e2e',
        background: '#0e0e16',
        transition: 'height 0.15s ease',
      }}
    >
      {/* Tab bar */}
      <div className="flex items-center gap-0 shrink-0" style={{ borderBottom: bottomPanelOpen ? '1px solid #1a1a28' : 'none', height: 32 }}>
        {[
          { id: 'console', label: 'Console', icon: <Terminal size={10} /> },
          { id: 'assets', label: 'Assets', icon: <FolderOpen size={10} /> },
        ].map(tab => (
          <button
            key={tab.id}
            className={`flex items-center gap-1.5 px-3 h-full text-xs font-mono transition-colors border-r ${
              bottomPanelTab === tab.id
                ? 'text-cyan-300 bg-cyan-950/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/3'
            }`}
            style={{ borderColor: '#1a1a28' }}
            onClick={() => {
              setBottomPanelTab(tab.id as any);
              if (!bottomPanelOpen) toggleBottomPanel();
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.id === 'console' && errorCount > 0 && (
              <span className="text-red-400 font-bold">{errorCount}</span>
            )}
            {tab.id === 'console' && warnCount > 0 && errorCount === 0 && (
              <span className="text-yellow-400">{warnCount}</span>
            )}
          </button>
        ))}
        <div className="flex-1" />
        <button
          className="px-3 h-full text-gray-600 hover:text-gray-300 transition-colors"
          onClick={toggleBottomPanel}
          title={bottomPanelOpen ? 'Collapse' : 'Expand'}
        >
          {bottomPanelOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
        </button>
      </div>

      {/* Content */}
      {bottomPanelOpen && (
        <div className="flex-1 overflow-hidden">
          {bottomPanelTab === 'console' && <ConsolePanel />}
          {bottomPanelTab === 'assets' && <AssetsPanel />}
        </div>
      )}
    </div>
  );
}
