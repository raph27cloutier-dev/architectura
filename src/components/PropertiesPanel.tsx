'use client';

import React from 'react';
import { useStore } from '../store';
import { Ruler, Info, AlertTriangle, Square, MousePointer2 } from 'lucide-react';

const KNOWLEDGE_BASE: Record<string, { guidelines: string[], warnings: string[] }> = {
  'bathroom': {
    guidelines: [
      "Minimum clearance in front of toilet: 21 inches (24+ recommended).",
      "Minimum shower size: 30x30 inches.",
      "GFCI outlets required within 36 inches of outside edge of sink."
    ],
    warnings: [
      "Ensure proper ventilation (exhaust fan required if no window)."
    ]
  },
  'living': {
    guidelines: [
      "Habitable rooms must have a floor area of at least 70 sq ft.",
      "Ceiling height must be a minimum of 7 ft."
    ],
    warnings: []
  },
  'bedroom': {
    guidelines: [
      "Minimum area: 70 sq ft per IBC.",
      "Minimum dimension: 7 ft in any direction.",
      "Egress window required: min 5.7 sq ft opening, 24\" high, 20\" wide."
    ],
    warnings: []
  },
  'toilet': {
    guidelines: [
      "Minimum width for toilet compartment: 30 inches.",
      "Centerline of toilet must be at least 15 inches from side wall."
    ],
    warnings: []
  },
  'bathtub': {
    guidelines: [
      "Standard Alcove tub is 60x30 inches or 60x32 inches."
    ],
    warnings: []
  }
};

export const PropertiesPanel = () => {
  const selectedElementId = useStore(state => state.selectedElementId);
  const currentPlan = useStore(state => state.currentPlan);
  const validationIssues = useStore(state => state.validationIssues);

  const labelStyle = { color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: '0.07em' };
  const valueStyle = { color: 'var(--text-primary)', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 };
  const cardStyle = { background: 'var(--background)', border: '1px solid var(--border-color)', borderRadius: 12, padding: 12 };

  if (!currentPlan || !selectedElementId) {
    return (
      <div className="flex-1 p-4 flex flex-col space-y-4 overflow-y-auto">
        {validationIssues && validationIssues.length > 0 && (
          <div className="rounded-xl p-4" style={{ background: 'rgba(224,112,112,0.06)', border: '1px solid rgba(224,112,112,0.25)' }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" style={{ color: 'var(--error)' }} />
              <h4 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--error)', fontFamily: 'IBM Plex Mono, monospace' }}>
                Issues ({validationIssues.length})
              </h4>
            </div>
            <ul className="space-y-2">
              {validationIssues.map(issue => (
                <li key={issue.id} className="text-sm flex flex-col gap-2 p-3 rounded-lg" style={{ background: 'var(--panel-elevated)', border: '1px solid rgba(224,112,112,0.2)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'Instrument Sans, sans-serif', fontSize: 13 }}>{issue.message}</span>
                    <button
                      onClick={() => useStore.getState().setSelectedElementId(issue.elementId)}
                      className="text-xs px-2 py-1 rounded-lg flex-shrink-0 transition-all"
                      style={{ color: 'var(--accent)', background: 'var(--accent-muted)', border: '1px solid rgba(200,169,110,0.2)', fontFamily: 'Instrument Sans, sans-serif' }}
                    >
                      Locate
                    </button>
                  </div>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: 'rgba(224,112,112,0.7)' }}>
                    [{issue.codeReference}]
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-muted)', border: '1px solid rgba(200,169,110,0.2)' }}>
            <Square className="w-7 h-7" style={{ color: 'var(--accent)', opacity: 0.6 }} />
          </div>
          <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)', fontFamily: 'Playfair Display, serif', fontSize: 17 }}>
            Workspace Empty
          </h3>
          <p className="text-sm max-w-[200px]" style={{ color: 'var(--text-muted)', fontFamily: 'Instrument Sans, sans-serif' }}>
            Select any room, wall, or fixture on the canvas to view properties.
          </p>
        </div>

        <div className="rounded-xl p-4" style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border-color)' }}>
          <h4 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
            <MousePointer2 className="w-3.5 h-3.5" />
            Quick Shortcuts
          </h4>
          <ul className="space-y-2.5">
            {[
              { label: 'Draw Layout', key: 'W' },
              { label: 'Measure Distance', key: 'M' },
              { label: 'Select / Pan', key: 'Space' },
              { label: 'Cancel Tool', key: 'Esc' },
            ].map(s => (
              <li key={s.key} className="flex justify-between items-center">
                <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'Instrument Sans, sans-serif' }}>{s.label}</span>
                <kbd className="px-2 py-1 rounded-lg text-xs" style={{ background: 'var(--background)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {s.key}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  let selectedRoom = currentPlan.rooms.find(r => r.id === selectedElementId);
  let selectedFixture: import('../types/plan').Fixture | null = null;
  let selectedOpening: import('../types/plan').Opening | null = null;

  if (!selectedRoom) {
    for (const room of currentPlan.rooms) {
      if (selectedFixture || selectedOpening) break;
      const fixture = room.fixtures.find(f => f.id === selectedElementId);
      if (fixture) {
        selectedFixture = fixture;
        selectedRoom = room;
        break;
      }
      for (const wall of room.walls) {
        const opening = wall.openings.find(o => o.id === selectedElementId);
        if (opening) {
          selectedOpening = opening;
          selectedRoom = room;
          break;
        }
      }
    }
  }

  const title = selectedOpening
    ? selectedOpening.type.toUpperCase()
    : selectedFixture
      ? `Fixture: ${selectedFixture.type.toUpperCase()}`
      : selectedRoom
        ? `Room: ${(selectedRoom.label || selectedRoom.name || '').toUpperCase()}`
        : 'Selection';

  const typeKey = selectedOpening
    ? selectedOpening.type
    : selectedFixture
      ? selectedFixture.type
      : selectedRoom
        ? selectedRoom.type
        : '';
  const knowledge = KNOWLEDGE_BASE[typeKey] || { guidelines: ['Select specific components for targeted guidelines.'], warnings: [] };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(44,39,33,0.5)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'Playfair Display, serif', fontSize: 15 }}>
          {title}
        </h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
          {selectedElementId}
        </p>
      </div>

      {/* Dimensions */}
      {selectedRoom && !selectedFixture && !selectedOpening && (
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
              Dimensions
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div style={cardStyle}>
              <div style={labelStyle}>Width</div>
              <div style={valueStyle}>{selectedRoom.width}&apos; - 0&quot;</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Length</div>
              <div style={valueStyle}>{selectedRoom.length}&apos; - 0&quot;</div>
            </div>
            <div className="col-span-2" style={cardStyle}>
              <div style={labelStyle}>Area</div>
              <div style={valueStyle}>{(selectedRoom.width || 0) * (selectedRoom.length || 0)} sq ft</div>
            </div>
          </div>
        </div>
      )}

      {/* Opening properties */}
      {selectedOpening && (
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
              Properties
            </h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div style={cardStyle}>
              <div style={labelStyle}>Width</div>
              <div style={valueStyle}>{selectedOpening.width}&apos; - 0&quot;</div>
            </div>
            <div style={cardStyle}>
              <div style={labelStyle}>Type</div>
              <div style={{ ...valueStyle, textTransform: 'capitalize' }}>{selectedOpening.type}</div>
            </div>
            {selectedOpening.type === 'door' && (
              <div className="col-span-2" style={cardStyle}>
                <div style={labelStyle}>Swing</div>
                <div style={{ ...valueStyle, textTransform: 'capitalize' }}>
                  {(selectedOpening.properties as import('../types/plan').DoorProps).swing}
                </div>
              </div>
            )}
            {selectedOpening.type === 'window' && (
              <div className="col-span-2" style={cardStyle}>
                <div style={labelStyle}>Sill Height</div>
                <div style={valueStyle}>
                  {(selectedOpening.properties as import('../types/plan').WindowProps).sillHeight}&apos; from floor
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guidelines */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
            IBC/IRC Guidelines
          </h4>
        </div>
        <ul className="space-y-2">
          {knowledge.guidelines.map((g, i) => (
            <li key={i} className="text-sm p-3 rounded-xl flex gap-2 items-start" style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontFamily: 'Instrument Sans, sans-serif', fontSize: 12 }}>
              <span style={{ color: 'var(--accent)', marginTop: 2 }}>·</span>
              {g}
            </li>
          ))}
        </ul>

        {knowledge.warnings.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />
              <h4 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--warning)', fontFamily: 'IBM Plex Mono, monospace' }}>
                Warnings
              </h4>
            </div>
            <ul className="space-y-2">
              {knowledge.warnings.map((w, i) => (
                <li key={i} className="text-xs p-3 rounded-xl flex gap-2 items-start" style={{ background: 'rgba(232,184,75,0.08)', border: '1px solid rgba(232,184,75,0.2)', color: 'rgba(232,184,75,0.9)', fontFamily: 'Instrument Sans, sans-serif' }}>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
