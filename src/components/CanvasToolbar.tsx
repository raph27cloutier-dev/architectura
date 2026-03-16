'use client';

import React from 'react';
import { MousePointer2, Square, DoorOpen, AppWindow, Bath, PencilRuler, Ruler, CheckCircle2, Undo2, Redo2 } from 'lucide-react';
import { useStore } from '../store';
import { ToolType } from '../types/plan';

export const CanvasToolbar = () => {
  const activeTool = useStore(state => state.activeTool);
  const activeFixtureType = useStore(state => state.activeFixtureType);
  const setActiveTool = useStore(state => state.setActiveTool);

  const tools: { id: ToolType | 'wall' | 'measure'; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 className="w-5 h-5" />, label: 'Select / Pan' },
    { id: 'wall', icon: <PencilRuler className="w-5 h-5" />, label: 'Draw Layout' },
    { id: 'room', icon: <Square className="w-5 h-5" />, label: 'Quick Room' },
    { id: 'measure', icon: <Ruler className="w-5 h-5" />, label: 'Measure' },
    { id: 'door', icon: <DoorOpen className="w-5 h-5" />, label: 'Add Door' },
    { id: 'window', icon: <AppWindow className="w-5 h-5" />, label: 'Add Window' },
    { id: 'fixture', icon: <Bath className="w-5 h-5" />, label: 'Add Fixture' },
  ];

  const toolbarStyle = {
    background: 'rgba(35,31,27,0.92)',
    backdropFilter: 'blur(16px)',
    border: '1px solid var(--border-color)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
    borderRadius: 18,
    padding: 8,
  };

  const baseBtn = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 38,
    height: 38,
    borderRadius: 12,
    transition: 'all 0.18s ease',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
  };

  const activeBtn = {
    ...baseBtn,
    background: 'var(--accent)',
    color: '#1a1612',
    boxShadow: '0 4px 16px rgba(200,169,110,0.35)',
    transform: 'scale(1.05)',
  };

  const idleBtn = {
    ...baseBtn,
    color: 'var(--text-secondary)',
  };

  const ghostBtn = {
    ...baseBtn,
    color: 'var(--text-secondary)',
  };

  return (
    <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20" style={toolbarStyle}>
      {/* Undo / Redo / Validate */}
      <div className="flex items-center gap-1 pr-3" style={{ borderRight: '1px solid var(--border-color)' }}>
        <button
          onClick={() => useStore.getState().undo()}
          style={ghostBtn}
          title="Undo (Cmd+Z)"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover-bg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => useStore.getState().redo()}
          style={ghostBtn}
          title="Redo (Cmd+Shift+Z)"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover-bg)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => useStore.getState().validateCurrentPlan()}
          style={{ ...ghostBtn, color: 'var(--accent)' }}
          title="Validate Plan"
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = '#1a1612'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; }}
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tool buttons */}
      {tools.map(tool => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          style={activeTool === tool.id ? activeBtn : idleBtn}
          title={tool.label}
          onMouseEnter={e => {
            if (activeTool !== tool.id) {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--hover-bg)';
            }
          }}
          onMouseLeave={e => {
            if (activeTool !== tool.id) {
              (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }
          }}
        >
          {tool.icon}
        </button>
      ))}

      {/* Fixture type selector */}
      {activeTool === 'fixture' && (
        <div
          className="absolute top-[110%] left-1/2 -translate-x-1/2 flex items-center gap-1 p-2 z-10 w-max max-w-[80vw] overflow-x-auto"
          style={{
            background: 'rgba(35,31,27,0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            borderRadius: 14,
          }}
        >
          {['toilet', 'sink', 'bathtub', 'shower', 'bed', 'sofa', 'stove', 'fridge', 'table'].map(type => (
            <button
              key={type}
              onClick={() => useStore.getState().setActiveFixtureType(type)}
              className="px-3 py-1.5 rounded-lg text-sm capitalize transition-all duration-200"
              style={activeFixtureType === type
                ? { background: 'var(--accent)', color: '#1a1612', fontWeight: 600, fontFamily: 'Instrument Sans, sans-serif' }
                : { background: 'transparent', color: 'var(--text-secondary)', fontFamily: 'Instrument Sans, sans-serif' }
              }
            >
              {type}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
