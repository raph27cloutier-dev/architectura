'use client';

import { useState } from 'react';
import { ChatPanel } from '@/components/ChatPanel';
import { PlanCanvas } from '@/components/PlanCanvas';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { PresetsGallery } from '@/components/PresetsGallery';
import { BuildingHeights } from '@/components/BuildingHeights';
import { ToastContainer } from '@/components/Toast';
import { useStore } from '@/store';
import { downloadPlanAsDXF } from '@/lib/export-dxf';
import dynamic from 'next/dynamic';

const View3D = dynamic(() => import('@/components/View3D').then(m => ({ default: m.View3D })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: '#1a1612' }}>
      <span style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 }}>Loading 3D view…</span>
    </div>
  ),
});

type LeftTab = 'chat' | 'presets';
type RightTab = 'props' | 'heights';

export default function Home() {
  const [activeTab, setActiveTab] = useState<LeftTab>('chat');
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('props');

  const currentPlan = useStore(state => state.currentPlan);
  const activeView = useStore(state => state.activeView);
  const setActiveView = useStore(state => state.setActiveView);

  const handleExportDXF = () => {
    if (currentPlan) downloadPlanAsDXF(currentPlan);
  };

  const tabBtn = (active: boolean) => ({
    flex: 1,
    padding: '6px 0',
    fontSize: 12,
    fontFamily: 'Instrument Sans, sans-serif',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--accent)' : 'var(--text-muted)',
    background: 'transparent',
    border: 'none',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    letterSpacing: '0.02em',
  });

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>

      {/* Header */}
      <header
        className="h-14 flex items-center px-5 justify-between flex-shrink-0 z-20 absolute top-0 left-0 right-0"
        style={{
          background: 'rgba(35,31,27,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 animate-fade-in-up">
          <span
            className="text-xl font-bold select-none"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--accent)', letterSpacing: '-0.02em' }}
          >
            PlanBot
          </span>
          <span
            className="px-2 py-0.5 rounded text-xs"
            style={{ background: 'var(--panel-elevated)', color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', border: '1px solid var(--border-color)' }}
          >
            CAD v4
          </span>
        </div>

        {/* Center: 2D / 3D toggle */}
        <div
          className="flex items-center rounded-xl p-1 animate-fade-in-up stagger-2"
          style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border-color)' }}
        >
          {(['2d', '3d'] as const).map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 uppercase tracking-wider"
              style={activeView === v
                ? { background: 'var(--accent)', color: '#1a1612', fontFamily: 'IBM Plex Mono, monospace', boxShadow: '0 2px 8px rgba(200,169,110,0.3)' }
                : { color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', background: 'transparent' }
              }
            >
              {v}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 animate-fade-in-up stagger-3">
          <button
            onClick={() => useStore.getState().validateCurrentPlan()}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: 'var(--panel-elevated)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              fontFamily: 'Instrument Sans, sans-serif',
            }}
          >
            Validate
          </button>
          <button
            onClick={handleExportDXF}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
            style={{
              background: 'var(--accent)',
              color: '#1a1612',
              fontFamily: 'Instrument Sans, sans-serif',
              boxShadow: '0 2px 10px rgba(200,169,110,0.25)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
          >
            Export DXF
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden mt-14">

        {/* Left sidebar */}
        <aside
          className="w-80 flex flex-col z-10 animate-slide-in-left flex-shrink-0"
          style={{ background: 'var(--panel-bg)', borderRight: '1px solid var(--border-color)' }}
        >
          {/* Tabs */}
          <div
            className="flex px-4 pt-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <button style={tabBtn(activeTab === 'chat')} onClick={() => setActiveTab('chat')}>
              Architect
            </button>
            <button style={tabBtn(activeTab === 'presets')} onClick={() => setActiveTab('presets')}>
              Presets
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden relative">
            {activeTab === 'chat' ? <ChatPanel /> : <PresetsGallery />}
          </div>
        </aside>

        {/* Center canvas */}
        <main className="flex-1 relative flex flex-col min-w-0 blueprint-grid">
          {activeView === '2d' ? (
            <PlanCanvas />
          ) : (
            <View3D plan={currentPlan} />
          )}
        </main>

        {/* Right sidebar */}
        <aside
          className="w-72 flex flex-col z-10 flex-shrink-0"
          style={{ background: 'var(--panel-bg)', borderLeft: '1px solid var(--border-color)' }}
        >
          {/* Tabs */}
          <div
            className="flex px-4 pt-3 flex-shrink-0"
            style={{ borderBottom: '1px solid var(--border-color)' }}
          >
            <button style={tabBtn(activeRightTab === 'props')} onClick={() => setActiveRightTab('props')}>
              Properties
            </button>
            <button style={tabBtn(activeRightTab === 'heights')} onClick={() => setActiveRightTab('heights')}>
              Heights
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {activeRightTab === 'props' ? <PropertiesPanel /> : <BuildingHeights />}
          </div>
        </aside>
      </div>

      <ToastContainer />
    </div>
  );
}
