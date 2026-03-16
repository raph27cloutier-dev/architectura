'use client';

import React from 'react';
import { useStore } from '../store';

const ZONING_LIMITS: { zone: string; label: string; maxFt: number }[] = [
  { zone: 'R1', label: 'R1 Single-Family', maxFt: 35 },
  { zone: 'R2', label: 'R2 Duplex', maxFt: 40 },
  { zone: 'R3', label: 'R3 Low-Rise Multi', maxFt: 45 },
  { zone: 'R4', label: 'R4 Mid-Rise Res.', maxFt: 55 },
  { zone: 'C1', label: 'C1 Neighborhood Comm.', maxFt: 35 },
];

const IBC_MINIMUMS = [
  { label: 'Habitable rooms', value: "7' - 0\"" },
  { label: 'Bathrooms / kitchens', value: "6' - 8\"" },
  { label: 'Corridors / hallways', value: "6' - 8\"" },
  { label: 'Basement (habitable)', value: "6' - 8\"" },
];

function getBarColor(pct: number): string {
  if (pct <= 80) return '#7bc47a';
  if (pct <= 95) return '#e8b84b';
  return '#e07070';
}

export const BuildingHeights = () => {
  const currentPlan = useStore(state => state.currentPlan);

  const floors = currentPlan?.metadata?.floors ?? 1;
  const estimatedHeight = floors * 9 + 3; // 9ft per floor + 3ft roof allowance

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-5">

      {/* Current height estimate */}
      <div
        className="rounded-xl p-4"
        style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border-color)' }}
      >
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
          Estimated Height
        </div>
        <div className="text-3xl font-semibold" style={{ color: 'var(--accent)', fontFamily: 'Playfair Display, serif' }}>
          {estimatedHeight}<span className="text-lg ml-1" style={{ color: 'var(--text-secondary)' }}>ft</span>
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'IBM Plex Mono, monospace' }}>
          {floors} floor{floors !== 1 ? 's' : ''} × 9ft + 3ft roof allowance
        </div>
      </div>

      {/* Zoning limits bar chart */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
          Zoning Height Limits
        </div>
        <div className="space-y-3">
          {ZONING_LIMITS.map(zone => {
            const pct = Math.min((estimatedHeight / zone.maxFt) * 100, 100);
            const color = getBarColor(pct);
            const over = estimatedHeight > zone.maxFt;
            return (
              <div key={zone.zone}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Instrument Sans, sans-serif' }}>
                    {zone.label}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ fontFamily: 'IBM Plex Mono, monospace', color: over ? '#e07070' : 'var(--text-muted)' }}
                  >
                    {over ? `+${estimatedHeight - zone.maxFt}ft over` : `${zone.maxFt}ft limit`}
                  </span>
                </div>
                <div className="height-bar">
                  <div
                    className="height-bar-fill"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* IBC minimums reference */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)', fontFamily: 'IBM Plex Mono, monospace' }}>
          IBC Minimum Ceiling Heights
        </div>
        <div className="space-y-2">
          {IBC_MINIMUMS.map(item => (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-2 rounded-lg"
              style={{ background: 'var(--panel-elevated)', border: '1px solid var(--border-color)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'Instrument Sans, sans-serif' }}>
                {item.label}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono, monospace' }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Note */}
      <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)', fontFamily: 'Instrument Sans, sans-serif' }}>
        Height estimates are approximate. Verify with local zoning ordinances and a licensed architect before submitting permits.
      </p>
    </div>
  );
};
