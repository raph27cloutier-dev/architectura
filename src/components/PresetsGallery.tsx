'use client';

import React from 'react';
import { useStore } from '../store';
import {
  getBasicMockPlan,
  getMockPlanWithBathroom,
  getMockStudioPlan,
  get2BedroomPlan,
  getLShapedPlan,
} from '../lib/presets';
import { PlanJSON } from '../types/plan';
import { v4 as uuidv4 } from 'uuid';

interface Preset {
  id: string;
  label: string;
  emoji: string;
  sqft: number;
  beds: number;
  baths: number;
  getPlan: () => PlanJSON;
}

const PRESETS: Preset[] = [
  {
    id: 'open-plan',
    label: 'Open-Plan Modern',
    emoji: '◻',
    sqft: 300,
    beds: 0,
    baths: 0,
    getPlan: getBasicMockPlan,
  },
  {
    id: 'studio',
    label: 'Studio Loft',
    emoji: '⌂',
    sqft: 288,
    beds: 0,
    baths: 1,
    getPlan: getMockStudioPlan,
  },
  {
    id: '1br',
    label: '1-Bedroom Apt',
    emoji: '▣',
    sqft: 348,
    beds: 1,
    baths: 1,
    getPlan: getMockPlanWithBathroom,
  },
  {
    id: '2br',
    label: '2-Bedroom House',
    emoji: '⊞',
    sqft: 900,
    beds: 2,
    baths: 1,
    getPlan: get2BedroomPlan,
  },
  {
    id: 'l-shape',
    label: 'L-Shaped Bungalow',
    emoji: '⌐',
    sqft: 750,
    beds: 1,
    baths: 1,
    getPlan: getLShapedPlan,
  },
];

export const PresetsGallery = () => {
  const setPlan = useStore(state => state.setPlan);
  const addToast = useStore(state => state.addToast);

  const handleLoad = (preset: Preset) => {
    const plan = preset.getPlan();
    setPlan({ id: uuidv4(), ...plan });
    addToast({ type: 'success', message: `Loaded: ${preset.label}` });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-3">
      <p className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
        Choose a starting point
      </p>

      {PRESETS.map((preset, i) => (
        <div
          key={preset.id}
          className="preset-card animate-fade-in-up"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="text-2xl flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl"
                style={{ background: 'var(--background)', border: '1px solid var(--border-color)', color: 'var(--accent)' }}
              >
                {preset.emoji}
              </span>
              <div className="min-w-0">
                <div
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--text-primary)', fontFamily: 'Instrument Sans, sans-serif' }}
                >
                  {preset.label}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}
                >
                  {preset.sqft} sqft
                  {preset.beds > 0 ? ` · ${preset.beds}bd` : ''}
                  {preset.baths > 0 ? ` · ${preset.baths}ba` : ''}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleLoad(preset)}
              className="flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200"
              style={{
                background: 'var(--accent-muted)',
                color: 'var(--accent)',
                border: '1px solid rgba(200,169,110,0.3)',
                fontFamily: 'Instrument Sans, sans-serif',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent)';
                (e.currentTarget as HTMLButtonElement).style.color = '#1a1612';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-muted)';
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
              }}
            >
              Load
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
