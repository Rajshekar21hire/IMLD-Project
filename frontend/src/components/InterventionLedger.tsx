import React, { useEffect, useMemo, useRef, useState } from 'react';

type Category = 'transport' | 'industry' | 'household' | 'agriculture';

type Intervention = {
  id: string;
  name: string;
  category: Category;
  costMillionsUSD: number;
  yearsToEffect: number;
  aqiPointsRemoved: number;
  mechanism: string;
};

const INTERVENTIONS: Intervention[] = [
  { id: 'bus-electrification', name: 'Public bus electrification', category: 'transport', costMillionsUSD: 1400, yearsToEffect: 5, aqiPointsRemoved: 24, mechanism: 'Replaces diesel bus fleets with electric drivetrains, cutting tailpipe PM2.5 city-wide.' },
  { id: 'kiln-zigzag', name: 'Brick kiln zigzag retrofit', category: 'industry', costMillionsUSD: 180, yearsToEffect: 1, aqiPointsRemoved: 14, mechanism: 'Redesigns kiln airflow so fuel burns more completely, cutting soot per brick fired.' },
  { id: 'crop-baler', name: 'Crop-residue baler subsidy', category: 'agriculture', costMillionsUSD: 260, yearsToEffect: 2, aqiPointsRemoved: 20, mechanism: 'Pays farmers to bale stubble instead of burning it, removing the autumn spike at its source.' },
  { id: 'lpg-access', name: 'LPG stove access', category: 'household', costMillionsUSD: 620, yearsToEffect: 3, aqiPointsRemoved: 26, mechanism: 'Replaces solid-fuel cooking with LPG, cutting indoor smoke and neighborhood haze together.' },
  { id: 'dust-enforcement', name: 'Construction dust enforcement', category: 'industry', costMillionsUSD: 40, yearsToEffect: 0, aqiPointsRemoved: 5, mechanism: 'Mandates dust screens and water spraying at sites, with fines issued the same day.' },
  { id: 'ev-two-wheeler', name: 'Electric two-wheeler subsidy', category: 'transport', costMillionsUSD: 420, yearsToEffect: 3, aqiPointsRemoved: 12, mechanism: 'Subsidizes e-scooters to displace the two-stroke fleet that dominates urban trip counts.' },
  { id: 'truck-retrofit', name: 'Diesel truck retrofit mandate', category: 'transport', costMillionsUSD: 950, yearsToEffect: 4, aqiPointsRemoved: 19, mechanism: 'Requires particulate filters on freight trucks entering city limits.' },
  { id: 'stack-scrubbers', name: 'Industrial stack scrubber mandate', category: 'industry', costMillionsUSD: 1250, yearsToEffect: 4, aqiPointsRemoved: 22, mechanism: 'Forces flue-gas desulfurization on the largest point-source emitters.' },
  { id: 'residue-waste-energy', name: 'Crop residue waste-to-energy plants', category: 'agriculture', costMillionsUSD: 800, yearsToEffect: 5, aqiPointsRemoved: 17, mechanism: 'Converts stubble into power-plant feedstock instead of open burning.' },
  { id: 'clean-cookstoves', name: 'Clean cookstove distribution', category: 'household', costMillionsUSD: 150, yearsToEffect: 1, aqiPointsRemoved: 9, mechanism: 'Distributes improved-combustion stoves that cut particulate output per meal cooked.' },
  { id: 'odd-even', name: 'Odd-even vehicle rationing', category: 'transport', costMillionsUSD: 20, yearsToEffect: 0, aqiPointsRemoved: 6, mechanism: 'Alternates which plates may drive by day, thinning peak traffic overnight.' },
  { id: 'emissions-monitoring', name: 'Real-time emissions monitoring & fines', category: 'industry', costMillionsUSD: 100, yearsToEffect: 1, aqiPointsRemoved: 7, mechanism: 'Installs continuous stack sensors so violations are fined the same day, not audited a year later.' },
];

// Hardcoded panel palette - intentionally not derived from the page theme.
const PANEL_BG = '#f5f1e8';
const PANEL_TEXT = '#1c1b18';
const AXIS_LINE = 'rgba(28,27,24,0.3)';
const TICK_LABEL = '#3f3d38';
const PRIMARY_NUM = '#14130f';
const SECONDARY_TEXT = '#57544d';
const LABEL_COLOR = '#5c594f';
const PANEL_BORDER = 'rgba(28,27,24,0.12)';
const SELECTED_RING = '#14130f';
const HOVER_STROKE = '#14130f';
const BUDGET_TRACK = 'rgba(28,27,24,0.08)';
const BUDGET_FILL = '#b7822f';
const BUDGET_OVER = '#a8402e';

const CATEGORY_COLORS: Record<Category, string> = {
  transport: '#b9812e',
  industry: '#4f6a91',
  household: '#5f7a45',
  agriculture: '#a2523a',
};

const BUDGET_CAP = 2000;
const X_MAX_YEARS = 8;
const Y_MAX_AQI = 40;
const MAX_COST = Math.max(...INTERVENTIONS.map((i) => i.costMillionsUSD));

const VB_W = 640;
const VB_H = 340;
const MARGIN = { top: 12, right: 16, bottom: 34, left: 44 };
const PLOT_W = VB_W - MARGIN.left - MARGIN.right;
const PLOT_H = VB_H - MARGIN.top - MARGIN.bottom;

const xToPx = (years: number) => MARGIN.left + (years / X_MAX_YEARS) * PLOT_W;
const yToPx = (aqi: number) => MARGIN.top + PLOT_H - (aqi / Y_MAX_AQI) * PLOT_H;
const radiusFor = (cost: number) => 4 + (cost / MAX_COST) * 16;

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2:3b';

export const InterventionLedger: React.FC = () => {
  const [selected, setSelected] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftFull, setDraftFull] = useState('');
  const [draftVisible, setDraftVisible] = useState('');
  const revealTimerRef = useRef<number | undefined>(undefined);

  const selectedItems = useMemo(
    () => INTERVENTIONS.filter((item) => selected.includes(item.id)),
    [selected]
  );

  const totalCost = selectedItems.reduce((sum, item) => sum + item.costMillionsUSD, 0);
  const rawAqiSum = selectedItems.reduce((sum, item) => sum + item.aqiPointsRemoved, 0);
  const combinedAqi = rawAqiSum * Math.pow(0.92, selectedItems.length);
  const firstEffectYears = selectedItems.length
    ? Math.min(...selectedItems.map((item) => item.yearsToEffect))
    : null;
  const budgetPct = Math.min(100, (totalCost / BUDGET_CAP) * 100);
  const overBudget = totalCost > BUDGET_CAP;

  const toggleSelect = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const hoveredItem = hoveredId ? INTERVENTIONS.find((item) => item.id === hoveredId) : null;

  useEffect(() => {
    if (!draftFull) {
      setDraftVisible('');
      return;
    }
    let i = 0;
    setDraftVisible('');
    const tick = () => {
      i += 2;
      setDraftVisible(draftFull.slice(0, i));
      if (i < draftFull.length) {
        revealTimerRef.current = window.setTimeout(tick, 16);
      }
    };
    tick();
    return () => {
      if (revealTimerRef.current !== undefined) window.clearTimeout(revealTimerRef.current);
    };
  }, [draftFull]);

  const draftPlan = async () => {
    setDrafting(true);
    setDraftError(null);
    setDraftFull('');
    setDraftVisible('');

    const lines = selectedItems
      .map((item) => `- ${item.name} ($${item.costMillionsUSD}M, ${item.yearsToEffect}yr to effect, ${item.aqiPointsRemoved} AQI pts)`)
      .join('\n');

    const prompt = `You are a blunt policy analyst reviewing a selected set of air-quality interventions for a city.

Selected interventions:
${lines}

Total cost: $${totalCost}M
Projected combined AQI reduction (diminishing returns already applied): ${combinedAqi.toFixed(1)} points
First measurable change in: ${firstEffectYears} years

Write a 90-word memo in exactly three parts:
1. What this plan buys.
2. What it leaves untouched.
3. The one political obstacle most likely to kill it.

Be blunt. Avoid hedging language like "could" or "may help." Name one real, specific tradeoff instead of praising the plan. No headers, no markdown, just three short paragraphs.`;

    try {
      const res = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      });
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      const text = (data?.response || '').trim();
      if (!text) throw new Error('empty response');
      setDraftFull(text);
    } catch (err) {
      setDraftError('Ollama is offline right now — no plan available.');
    } finally {
      setDrafting(false);
    }
  };

  const xTicks = [0, 2, 4, 6, 8];
  const yTicks = [0, 10, 20, 30, 40];

  return (
    <section
      className="il-root w-full"
      style={{
        background: PANEL_BG,
        color: PANEL_TEXT,
        padding: '48px 32px',
      }}
    >
      <div className="mx-auto max-w-5xl">
        <p
          className="font-mono text-xs uppercase"
          style={{ letterSpacing: '0.3em', color: LABEL_COLOR, margin: 0 }}
        >
          Intervention Ledger
        </p>
        <div style={{ borderBottom: `1px solid ${PANEL_BORDER}`, marginTop: '16px', marginBottom: '32px' }} />

        <div className="flex flex-wrap gap-8 font-mono">
          <div>
            <div className="text-[10px] uppercase" style={{ letterSpacing: '0.2em', color: SECONDARY_TEXT }}>Budget spent</div>
            <div className="mt-1 text-lg" style={{ color: overBudget ? BUDGET_OVER : PRIMARY_NUM }}>
              ${totalCost}M <span style={{ color: SECONDARY_TEXT }}>/ ${BUDGET_CAP}M</span>
            </div>
            <div className="mt-1 h-[2px] w-40" style={{ backgroundColor: BUDGET_TRACK }}>
              <div
                className="h-full"
                style={{ width: `${budgetPct}%`, backgroundColor: overBudget ? BUDGET_OVER : BUDGET_FILL }}
              />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase" style={{ letterSpacing: '0.2em', color: SECONDARY_TEXT }}>Combined AQI reduction</div>
            <div className="mt-1 text-lg" style={{ color: PRIMARY_NUM }}>{combinedAqi.toFixed(1)} pts</div>
          </div>

          <div>
            <div className="text-[10px] uppercase" style={{ letterSpacing: '0.2em', color: SECONDARY_TEXT }}>First measurable change in</div>
            <div className="mt-1 text-lg" style={{ color: PRIMARY_NUM }}>
              {firstEffectYears === null ? '—' : `${firstEffectYears} yr${firstEffectYears === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-6 lg:flex-row">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            style={{ width: '100%', maxWidth: '640px', height: '420px', display: 'block' }}
          >
            <rect x={0} y={0} width={VB_W} height={VB_H} fill={PANEL_BG} />
            <line
              x1={MARGIN.left} y1={MARGIN.top} x2={MARGIN.left} y2={VB_H - MARGIN.bottom}
              stroke={AXIS_LINE} strokeWidth={1}
            />
            <line
              x1={MARGIN.left} y1={VB_H - MARGIN.bottom} x2={VB_W - MARGIN.right} y2={VB_H - MARGIN.bottom}
              stroke={AXIS_LINE} strokeWidth={1}
            />

            {xTicks.map((t) => (
              <React.Fragment key={`x-${t}`}>
                <line
                  x1={xToPx(t)} y1={VB_H - MARGIN.bottom} x2={xToPx(t)} y2={VB_H - MARGIN.bottom + 4}
                  stroke={AXIS_LINE} strokeWidth={1}
                />
                <text x={xToPx(t)} y={VB_H - MARGIN.bottom + 16} fontSize={10} fill={TICK_LABEL} textAnchor="middle" fontFamily="monospace">
                  {t}
                </text>
              </React.Fragment>
            ))}
            <text x={VB_W - MARGIN.right} y={VB_H - 4} fontSize={10} fill={TICK_LABEL} textAnchor="end" fontFamily="monospace">
              years to effect
            </text>

            {yTicks.map((t) => (
              <React.Fragment key={`y-${t}`}>
                <line
                  x1={MARGIN.left - 4} y1={yToPx(t)} x2={MARGIN.left} y2={yToPx(t)}
                  stroke={AXIS_LINE} strokeWidth={1}
                />
                <text x={MARGIN.left - 8} y={yToPx(t) + 3} fontSize={10} fill={TICK_LABEL} textAnchor="end" fontFamily="monospace">
                  {t}
                </text>
              </React.Fragment>
            ))}
            <text x={MARGIN.left} y={10} fontSize={10} fill={TICK_LABEL} textAnchor="start" fontFamily="monospace">
              AQI points removed
            </text>

            {INTERVENTIONS.map((item) => {
              const cx = xToPx(item.yearsToEffect);
              const cy = yToPx(item.aqiPointsRemoved);
              const r = radiusFor(item.costMillionsUSD);
              const isSelected = selected.includes(item.id);
              const isHovered = hoveredId === item.id;
              return (
                <g key={item.id}>
                  {isSelected && (
                    <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={SELECTED_RING} strokeWidth={2} />
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={CATEGORY_COLORS[item.category]}
                    fillOpacity={isSelected || isHovered ? 1 : 0.55}
                    stroke={isHovered ? HOVER_STROKE : 'transparent'}
                    strokeWidth={1}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId((current) => (current === item.id ? null : current))}
                    onClick={() => toggleSelect(item.id)}
                  />
                </g>
              );
            })}
          </svg>

          <div
            className="w-full pt-4 font-mono text-sm lg:w-64 lg:pl-6 lg:pt-0"
            style={{ borderTop: `1px solid ${PANEL_BORDER}` }}
          >
            {hoveredItem ? (
              <>
                <div className="text-xs uppercase" style={{ letterSpacing: '0.15em', color: CATEGORY_COLORS[hoveredItem.category] }}>
                  {hoveredItem.category}
                </div>
                <div className="mt-1 font-semibold" style={{ color: PRIMARY_NUM }}>{hoveredItem.name}</div>
                <div className="mt-2 leading-relaxed" style={{ color: SECONDARY_TEXT }}>{hoveredItem.mechanism}</div>
              </>
            ) : (
              <div style={{ color: SECONDARY_TEXT }}>Hover a point for its mechanism.</div>
            )}
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div className="mt-8 pt-4" style={{ borderTop: `1px solid ${PANEL_BORDER}` }}>
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 font-mono text-sm"
                style={{ borderBottom: `1px solid ${PANEL_BORDER}`, color: PRIMARY_NUM }}
              >
                <span>{item.name}</span>
                <span style={{ color: SECONDARY_TEXT }}>
                  ${item.costMillionsUSD}M · {item.yearsToEffect}yr · {item.aqiPointsRemoved} pts
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          <button
            type="button"
            disabled={selectedItems.length < 3 || drafting}
            onClick={draftPlan}
            style={{
              border: `1px solid ${selectedItems.length < 3 || drafting ? PANEL_BORDER : 'rgba(28,27,24,0.5)'}`,
              color: PRIMARY_NUM,
              opacity: selectedItems.length < 3 ? 0.3 : 1,
              cursor: selectedItems.length < 3 || drafting ? 'not-allowed' : 'pointer',
              background: 'transparent',
            }}
            className="px-4 py-2 font-mono text-xs uppercase"
          >
            {drafting ? 'Drafting…' : 'Draft the plan'}
          </button>
          {selectedItems.length < 3 && (
            <span className="ml-3 font-mono text-xs" style={{ color: SECONDARY_TEXT }}>select at least 3</span>
          )}

          {(drafting || draftVisible || draftError) && (
            <div
              className="mt-4 max-w-2xl p-4 font-mono text-sm leading-relaxed"
              style={{ border: `1px solid ${PANEL_BORDER}`, color: PRIMARY_NUM }}
            >
              {draftError && <span style={{ color: SECONDARY_TEXT }}>{draftError}</span>}
              {!draftError && (
                <span>
                  {draftVisible}
                  {draftVisible.length < draftFull.length && <span className="ic-cursor">▍</span>}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .ic-cursor {
          animation: il-blink 1s steps(1) infinite;
        }
        @keyframes il-blink {
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
};
