/**
 * R3F Game Engine - Main Editor Layout
 * Design: Obsidian Terminal - dark industrial IDE
 */
import { useEffect } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import WelcomeOverlay from './WelcomeOverlay';
import StatusBar from './StatusBar';
import Toolbar from './Toolbar';
import HierarchyPanel from './HierarchyPanel';
import InspectorPanel from './InspectorPanel';
import BottomPanel from './BottomPanel';
import Viewport from './Viewport';
import { useEngineStore } from './store';

function ViewportOverlay() {
  const { transformMode, transformSpace, selectedIds, objects, mode, canUndo, canRedo } = useEngineStore();
  const selectedId = selectedIds[0];
  const obj = selectedId ? objects[selectedId] : null;
  if (mode !== 'editor') return null;
  return (
    <div className="absolute bottom-3 left-3 pointer-events-none z-10 flex flex-col gap-1">
      <div className="flex items-center gap-2 px-2 py-1 rounded text-xs font-mono" style={{ background: 'rgba(10,10,20,0.8)', border: '1px solid #2a2a38' }}>
        <span className="text-gray-500">Mode:</span>
        <span className="text-cyan-300 uppercase font-bold">{transformMode}</span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-500">Space:</span>
        <span className="text-gray-300">{transformSpace}</span>
        {(canUndo || canRedo) && (
          <>
            <span className="text-gray-600">|</span>
            {canUndo && <span className="text-green-500 text-xs font-bold">Z</span>}
            {canRedo && <span className="text-blue-500 text-xs font-bold">Y</span>}
          </>
        )}
      </div>
      {obj && (
        <div className="flex items-center gap-2 px-2 py-1 rounded text-xs font-mono" style={{ background: 'rgba(10,10,20,0.8)', border: '1px solid #00e5ff33' }}>
          <span className="text-cyan-400">*</span>
          <span className="text-cyan-200">{obj.name}</span>
          <span className="text-gray-600">#{obj.id}</span>
        </div>
      )}
      <div className="flex items-center gap-3 px-2 py-1 rounded text-xs font-mono" style={{ background: 'rgba(10,10,20,0.7)', border: '1px solid #1a1a28' }}>
        <span className="text-gray-600">W</span><span className="text-gray-700">Move</span>
        <span className="text-gray-600">E</span><span className="text-gray-700">Rotate</span>
        <span className="text-gray-600">R</span><span className="text-gray-700">Scale</span>
        <span className="text-gray-600">F5</span><span className="text-gray-700">Play</span>
        <span className="text-gray-600">Ctrl+Z</span><span className="text-gray-700">Undo</span>
      </div>
    </div>
  );
}

export default function EngineEditor() {
  const {
    undo, redo, canUndo, canRedo,
    setTransformMode, setMode, mode,
    selectedIds, removeObject, duplicateObject,
    selectObject,
  } = useEngineStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) undo();
        return;
      }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) redo();
        return;
      }
      if (ctrl && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) duplicateObject(selectedIds[0]);
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        selectedIds.forEach(id => removeObject(id));
        return;
      }
      if (e.key === 'Escape') {
        selectObject(null);
        return;
      }
      if (mode === 'editor') {
        if (e.key === 'w' || e.key === 'W') { setTransformMode('translate'); return; }
        if (e.key === 'e' || e.key === 'E') { setTransformMode('rotate'); return; }
        if (e.key === 'r' || e.key === 'R') { setTransformMode('scale'); return; }
      }
      if (e.key === 'F5') {
        e.preventDefault();
        setMode(mode === 'editor' ? 'play' : 'editor');
        return;
      }
      if (e.key === 'F6') {
        e.preventDefault();
        if (mode === 'play') setMode('pause');
        else if (mode === 'pause') setMode('play');
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo, setTransformMode, setMode, mode, selectedIds, removeObject, duplicateObject, selectObject]);

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ background: '#0a0a0c', fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace" }}>
      <WelcomeOverlay />
      <Toolbar />
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
            <HierarchyPanel />
          </ResizablePanel>
          <ResizableHandle className="w-px hover:bg-cyan-700/50 transition-colors" style={{ background: '#1e1e2e' }} />
          <ResizablePanel defaultSize={60} minSize={30}>
            <ResizablePanelGroup direction="vertical" className="h-full">
              <ResizablePanel defaultSize={75} minSize={30}>
                <div className="relative w-full h-full">
                  <Viewport />
                  <ViewportOverlay />
                </div>
              </ResizablePanel>
              <ResizableHandle className="h-px hover:bg-cyan-700/50 transition-colors" style={{ background: '#1e1e2e' }} />
              <ResizablePanel defaultSize={25} minSize={8} maxSize={50}>
                <BottomPanel />
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle className="w-px hover:bg-cyan-700/50 transition-colors" style={{ background: '#1e1e2e' }} />
          <ResizablePanel defaultSize={22} minSize={14} maxSize={35}>
            <InspectorPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <StatusBar />
    </div>
  );
}
