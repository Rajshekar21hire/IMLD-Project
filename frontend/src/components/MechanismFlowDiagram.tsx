import React, { useMemo, useState } from 'react';
import { MECHANISM_CHAIN } from '../data/agenticMechanismData';
import { useAgenticOllamaCaption } from './useAgenticOllamaCaption';
import { AgenticCaption } from './AgenticCaption';

const TEXT = '#232323';
const MUTED = '#8b8780';
const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', serif";

const NODE_COLOR: Record<string, string> = {
  crop: '#dc2626',
  traffic: '#3b82f6',
  industry: '#ea580c',
  inversion: '#7c3aed',
  pm25: '#e11d48',
  health: '#16a34a',
};

// Percent-space (0-100) layout: four source nodes converge into the PM2.5 spike, which feeds health load.
const POSITIONS: Record<string, { x: number; y: number }> = {
  crop: { x: 10, y: 14 },
  traffic: { x: 10, y: 38 },
  industry: { x: 10, y: 62 },
  inversion: { x: 10, y: 86 },
  pm25: { x: 52, y: 50 },
  health: { x: 92, y: 50 },
};

const EDGES: [string, string][] = [
  ['crop', 'pm25'],
  ['traffic', 'pm25'],
  ['industry', 'pm25'],
  ['inversion', 'pm25'],
  ['pm25', 'health'],
];

const GHOST_OFFSETS = [
  { dx: -2.4, dy: -2.4 },
  { dx: 2.2, dy: 2.6 },
  { dx: -1.8, dy: 2.8 },
  { dx: 2.6, dy: -2 },
  { dx: 0.6, dy: -3.2 },
];

const FALLBACK_CAPTION =
  "It's the same story every time: burning, traffic, and industry pile up, cold winter air seals it in, and PM2.5 spikes fast. Five cities, one repeating mechanism.";

function isEdgeActive(edge: [string, string], active: string | null) {
  if (!active) return false;
  return edge[0] === active || edge[1] === active;
}

const Chain: React.FC<{ ghost?: boolean; opacity?: number }> = ({ ghost = false, opacity = 1 }) => (
  <svg
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    className="absolute inset-0 h-full w-full"
    style={{ opacity }}
    aria-hidden="true"
  >
    {EDGES.map(([from, to]) => {
      const a = POSITIONS[from];
      const b = POSITIONS[to];
      return (
        <line
          key={`${from}-${to}`}
          x1={a.x}
          y1={a.y}
          x2={b.x}
          y2={b.y}
          stroke={ghost ? 'rgba(139,135,128,0.4)' : 'rgba(139,135,128,0.28)'}
          strokeWidth={ghost ? 0.5 : 0.6}
        />
      );
    })}
  </svg>
);

export const MechanismFlowDiagram: React.FC = () => {
  const [active, setActive] = useState<string | null>(null);

  const userMessage = useMemo(
    () =>
      `Chart type: mechanism flow diagram showing the repeated South Asian air pollution chain. Nodes in order: ${MECHANISM_CHAIN.map(
        (n) => n.label
      ).join(' -> ')}. This same chain repeats across Delhi, Lahore, Dhaka, Kathmandu, and Kolkata.`,
    []
  );
  const { text: caption, status } = useAgenticOllamaCaption(userMessage, FALLBACK_CAPTION);

  const activeNode = MECHANISM_CHAIN.find((n) => n.key === active) || null;

  return (
    <div>
      <div className="relative mx-auto" style={{ height: '320px', maxWidth: '880px' }}>
        {GHOST_OFFSETS.map((g, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{ transform: `translate(${g.dx}%, ${g.dy}%)` }}
          >
            <Chain ghost opacity={0.14} />
          </div>
        ))}

        <Chain />

        {EDGES.map(([from, to]) => {
          const a = POSITIONS[from];
          const b = POSITIONS[to];
          const on = isEdgeActive([from, to], active);
          return (
            <svg
              key={`hi-${from}-${to}`}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={NODE_COLOR[from]}
                strokeOpacity={on ? 0.9 : 0}
                strokeWidth={1.2}
              />
            </svg>
          );
        })}

        {MECHANISM_CHAIN.map((node) => {
          const pos = POSITIONS[node.key];
          const dimmed = active !== null && active !== node.key && !EDGES.some((e) => isEdgeActive(e, active) && e.includes(node.key));
          return (
            <button
              key={node.key}
              type="button"
              className="absolute flex items-center justify-center rounded-2xl border text-center transition-all duration-200"
              style={{
                width: node.key === 'pm25' || node.key === 'health' ? 118 : 104,
                height: node.key === 'pm25' || node.key === 'health' ? 72 : 56,
                top: `${pos.y}%`,
                left: `${pos.x}%`,
                transform: 'translate(-50%, -50%)',
                background: '#fff',
                borderColor: active === node.key ? NODE_COLOR[node.key] : 'rgba(0,0,0,0.08)',
                borderWidth: active === node.key ? 2 : 1,
                boxShadow: active === node.key ? `0 10px 24px ${NODE_COLOR[node.key]}33` : '0 2px 8px rgba(0,0,0,0.05)',
                opacity: dimmed ? 0.35 : 1,
                cursor: 'pointer',
                zIndex: active === node.key ? 5 : 2,
              }}
              onMouseEnter={() => setActive(node.key)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(node.key)}
              onBlur={() => setActive(null)}
              aria-label={`${node.label}. ${node.explainer}`}
            >
              <span className="px-2 text-xs font-semibold leading-tight" style={{ color: TEXT }}>
                {node.short}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mx-auto mt-4 min-h-[52px] max-w-lg text-center transition-opacity duration-300" style={{ opacity: activeNode ? 1 : 0.5 }}>
        <div className="text-sm leading-relaxed" style={{ fontFamily: SERIF, color: TEXT }}>
          {activeNode ? activeNode.explainer : 'Hover or focus any node to see how it fits the chain.'}
        </div>
      </div>
      <div className="mt-1 text-center text-xs" style={{ color: MUTED }}>
        Five faint copies behind the diagram stand for the five cities - same mechanism, repeated.
      </div>

      <AgenticCaption text={caption} loading={status === 'loading'} generated={status === 'done'} />
    </div>
  );
};
