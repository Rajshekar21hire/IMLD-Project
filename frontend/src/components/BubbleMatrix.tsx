import React, { useMemo, useState } from 'react';
import { resolveCauseIcon } from './RootCauseExplorerSection';

interface DotPlotProps {
  rows: { label: string; values: string[] }[];
  columns: string[];
}

interface SeverityCell {
  tier: 1 | 2 | 3 | 4;
}

const cityOrder = ['Lahore', 'Delhi', 'New Delhi', 'Dhaka', 'Ghaziabad'] as const;

const causeOrder = [
  'Transport & vehicles',
  'Brick kilns',
  'Industry & power',
  'Crop burning',
  'Geography & meteorology',
  'Urban sprawl & construction',
  'Governance gap',
];

const tierSizes: Record<1 | 2 | 3 | 4, number> = {
  1: 14,
  2: 18,
  3: 22,
  4: 27,
};

const tierColors: Record<1 | 2 | 3 | 4, string> = {
  1: 'bg-sky-200',
  2: 'bg-sky-300',
  3: 'bg-sky-500',
  4: 'bg-sky-700',
};

const tierLegend: Record<1 | 2 | 3 | 4, string> = {
  1: 'Contributing',
  2: 'Notable',
  3: 'Major',
  4: 'Dominant / structural',
};

const inferSeverity = (text: string): SeverityCell => {
  const lowerText = text.toLowerCase();
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:–|to)?\s*(\d+(?:\.\d+)?)?%/);
  const percentage = percentMatch ? Number.parseFloat(percentMatch[1]) : null;

  if (
    lowerText.includes('largest single source') ||
    lowerText.includes('historically the #1 source') ||
    lowerText.includes('historically the #1') ||
    lowerText.includes('80–90%') ||
    (percentage !== null && percentage >= 28) ||
    lowerText.includes('structural driver')
  ) {
    return { tier: 4 };
  }

  if (
    lowerText.includes('significant contributor') ||
    lowerText.includes('major') ||
    lowerText.includes('shared ncr') ||
    lowerText.includes('shared regional') ||
    lowerText.includes('among top sources') ||
    lowerText.includes('30–40%') ||
    lowerText.includes('35–66%') ||
    lowerText.includes('13–29%') ||
    (percentage !== null && percentage >= 17 && percentage < 28)
  ) {
    return { tier: 3 };
  }

  if (
    lowerText.includes('same multi-state governance gap') ||
    lowerText.includes('no natural ventilation') ||
    lowerText.includes('downwind') ||
    lowerText.includes('regulatory grey zone')
  ) {
    return { tier: 1 };
  }

  return { tier: 2 };
};

export const DotPlot: React.FC<DotPlotProps> = ({ rows, columns }) => {
  const [selectedCell, setSelectedCell] = useState<{
    cause: string;
    city: string;
    note: string;
    tier: 1 | 2 | 3 | 4;
  } | null>(null);

  const detailPanelStyles: Record<1 | 2 | 3 | 4, { container: string; body: string }> = {
    1: { container: 'bg-sky-50 border-sky-200', body: 'text-slate-700' },
    2: { container: 'bg-sky-100 border-sky-300', body: 'text-slate-700' },
    3: { container: 'bg-sky-200 border-sky-400', body: 'text-slate-800' },
    4: { container: 'bg-sky-300 border-sky-500', body: 'text-slate-800' },
  };

  const orderedRows = useMemo(
    () =>
      causeOrder
        .map((cause) => rows.find((row) => row.label === cause))
        .filter((row): row is { label: string; values: string[] } => Boolean(row)),
    [rows]
  );

  const cityToSourceIndex = useMemo(
    () =>
      cityOrder.map((cityName) => {
        const exactMatch = columns.findIndex((column) => column.trim().startsWith(cityName));
        return exactMatch >= 0 ? exactMatch : columns.findIndex((column) => column === cityName);
      }),
    [columns]
  );

  const handleGridClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>('button[data-cause-index][data-city-index]');

    if (!button) {
      return;
    }

    const causeIndex = Number(button.dataset.causeIndex);
    const cityIndex = Number(button.dataset.cityIndex);
    const row = orderedRows[causeIndex];

    if (!row) {
      return;
    }

    const sourceIndex = cityToSourceIndex[cityIndex];
    const note = row.values[sourceIndex] ?? '';
    const tier = inferSeverity(note).tier;

    setSelectedCell({
      cause: row.label,
      city: cityOrder[cityIndex],
      note,
      tier,
    });
  };

  const detailHeading = selectedCell
    ? `${selectedCell.city}, ${selectedCell.cause}`
    : 'Click a dot to see the detail behind it.';

  const activeDetailStyle = selectedCell
    ? detailPanelStyles[selectedCell.tier]
    : { container: 'bg-white border-slate-200', body: 'text-slate-700' };

  return (

    <div className="mx-auto max-w-5xl">
    <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"> 
      <div className=" mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
        {([1, 2, 3, 4] as const).map((tier) => (
          <div key={tier} className="flex items-center gap-2">
            <span
              className={`inline-block rounded-full ${tierColors[tier]}`}
              style={{ width: tierSizes[tier], height: tierSizes[tier] }}
            />
            <span>{tierLegend[tier]}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]" onClick={handleGridClick}>
          <div
            className="grid items-center gap-x-4 gap-y-5 pb-5"
            style={{ gridTemplateColumns: '150px repeat(5, 1fr)' }}
          >
            <div />
            {cityOrder.map((cityName) => (
              <div
                key={cityName}
                className="text-center text-[11px] font-medium tracking-wide text-slate-500"
              >
                {cityName}
              </div>
            ))}

            {orderedRows.map((row, causeIndex) => (
              <React.Fragment key={row.label}>
                <div className="flex min-h-[28px] items-center gap-1.5 text-left text-sm font-medium text-slate-900">
                  {(() => {
                    const CauseIcon = resolveCauseIcon(row.label);
                    return <CauseIcon className="h-3.5 w-3.5 text-sky-600" />;
                  })()}
                  <span>{row.label}</span>
                </div>
                {cityOrder.map((cityName, cityIndex) => {
                  const sourceIndex = cityToSourceIndex[cityIndex];
                  const note = sourceIndex >= 0 ? row.values[sourceIndex] ?? '' : '';
                  const tier = inferSeverity(note).tier;

                  return (
                    <div key={cityName} className="flex items-center justify-center">
                      <button
                        type="button"
                        data-cause-index={causeIndex}
                        data-city-index={cityIndex}
                        aria-label={`${cityName}, ${row.label}`}
                        className={`rounded-full ${tierColors[tier]} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`}
                        style={{ width: tierSizes[tier], height: tierSizes[tier] }}
                      />
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className={`mt-6 rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md ${activeDetailStyle.container}`}>
        <h4 className="text-lg font-semibold text-slate-950">{detailHeading}</h4>
        <p className={`mt-3 text-sm leading-relaxed ${activeDetailStyle.body}`}>
          {selectedCell ? selectedCell.note : 'Click a dot to see the detail behind it.'}
        </p>
      </div>
    </div>
    </div>
  );
};
