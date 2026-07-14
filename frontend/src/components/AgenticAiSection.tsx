import React, { useState } from 'react';
import { WhoAreYouAskingFor } from './WhoAreYouAskingFor';
import { BreathingCircle } from './BreathingCircle';
import { WhatThisMeansToday } from './WhatThisMeansToday';
import { OneSmallThing } from './OneSmallThing';
import { NeighbourComparison } from './NeighbourComparison';
import { TodaysAirInWords } from './TodaysAirInWords';
import { WhatWouldActuallyHelpHere } from './WhatWouldActuallyHelpHere';
import { OneGoodDay } from './OneGoodDay';
import { WhatsInTheAir } from './WhatsInTheAir';
import { SmallThingsThatHold } from './SmallThingsThatHold';
import { RecoveryClock } from './RecoveryClock';
import { AgenticCard } from './AgenticCard';
import { MechanismFlowDiagram } from './MechanismFlowDiagram';
import { CityGridSmallMultiples } from './CityGridSmallMultiples';
import { SeasonalityHeatmap } from './SeasonalityHeatmap';
import { ExposureImpactScrollytelling } from './ExposureImpactScrollytelling';
import { CounterfactualSlider } from './CounterfactualSlider';

const PANEL_BG = 'linear-gradient(180deg, #f8f5ee 0%, #f1f6f5 55%, #eef3f8 100%)';
const TEXT = '#232323';

const ColumnHeader: React.FC<{ eyebrow: string; title: string; accent: string }> = ({ eyebrow, title, accent }) => (
  <div>
    <div className="flex items-center gap-2">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />
      <span className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>
        {eyebrow}
      </span>
    </div>
    <h4 className="mt-2 text-lg font-extrabold text-slate-900">{title}</h4>
  </div>
);

export const AgenticAiSection: React.FC = () => {
  const [city, setCity] = useState<string | null>(null);
  const [forWhom, setForWhom] = useState<string | null>(null);
  const [concern, setConcern] = useState<string | null>(null);

  const allSelected = Boolean(city && forWhom && concern);

  return (
    <section
      className="w-full"
      style={{ background: PANEL_BG, color: TEXT, padding: '64px 24px' }}
    >
      <div className="mx-auto" style={{ maxWidth: '1100px' }}>
        <p className="text-center text-sm font-bold uppercase tracking-[0.32em] text-sky-700">
          Agentic AI
        </p>
        <h2 className="mt-3 text-center text-3xl font-extrabold text-slate-950 md:text-4xl">
          A warmer way to read the air
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-lg text-slate-600">
          Tell it a little about you, and it writes the story back &mdash; in plain, human words.
        </p>

        <AgenticCard eyebrow="Start here" title="Agentic AI" accent="#0ea5e9">
          <WhoAreYouAskingFor
            city={city}
            forWhom={forWhom}
            concern={concern}
            onSelectCity={setCity}
            onSelectForWhom={setForWhom}
            onSelectConcern={setConcern}
          />
        </AgenticCard>

        {allSelected && (
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
            <AgenticCard
              eyebrow="How it feels"
              title="Take a breath"
              accent="#10b981"
              className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_4px_28px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_44px_rgba(0,0,0,0.09)] md:p-10"
            >
              <BreathingCircle city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
            <AgenticCard
              eyebrow="Right now"
              title="What this means today"
              accent="#7c3aed"
              className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_4px_28px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_44px_rgba(0,0,0,0.09)] md:p-10"
            >
              <WhatThisMeansToday city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
            <AgenticCard
              eyebrow="Do this"
              title="One small thing"
              accent="#d97706"
              className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_4px_28px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_44px_rgba(0,0,0,0.09)] md:p-10"
            >
              <OneSmallThing city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
            <AgenticCard
              eyebrow="Perspective"
              title="The neighbour comparison"
              accent="#e11d48"
              className="rounded-[28px] border border-black/5 bg-white p-8 shadow-[0_4px_28px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_44px_rgba(0,0,0,0.09)] md:p-10"
            >
              <NeighbourComparison city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
          </div>
        )}

        <AgenticCard eyebrow="Right now" title="Today, what helps, and what's possible" accent="#0d9488">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-8">
            <div>
              <ColumnHeader eyebrow="Right now" title="Today's air, in words" accent="#0d9488" />
              <div className="mt-5">
                <TodaysAirInWords />
              </div>
            </div>
            <div className="lg:border-x lg:border-black/5 lg:px-8">
              <ColumnHeader eyebrow="What helps" title="What would actually help here" accent="#ea580c" />
              <div className="mt-5">
                <WhatWouldActuallyHelpHere />
              </div>
            </div>
            <div>
              <ColumnHeader eyebrow="Imagine" title="One good day" accent="#c026d3" />
              <div className="mt-5">
                <OneGoodDay />
              </div>
            </div>
          </div>
        </AgenticCard>

        <AgenticCard eyebrow="Sources" title="What's in the air" accent="#65a30d">
          <WhatsInTheAir />
        </AgenticCard>

        <AgenticCard eyebrow="Reminders" title="Small things that hold" accent="#0ea5e9">
          <SmallThingsThatHold />
        </AgenticCard>

        <AgenticCard eyebrow="The reversal" title="One Recovery, at Every Scale." accent="#16a34a">
          <RecoveryClock />
        </AgenticCard>

        <AgenticCard eyebrow="The pattern" title="One mechanism, repeated" accent="#dc2626">
          <MechanismFlowDiagram />
        </AgenticCard>

        <AgenticCard eyebrow="Same shape, five cities" title="Five cities, one curve" accent="#0ea5e9">
          <CityGridSmallMultiples />
        </AgenticCard>

        <AgenticCard eyebrow="When it's worst" title="The season, mapped" accent="#b45309">
          <SeasonalityHeatmap />
        </AgenticCard>

        <AgenticCard eyebrow="Feel the number" title="One number, three ways" accent="#7c3aed">
          <ExposureImpactScrollytelling />
        </AgenticCard>

        <AgenticCard eyebrow="What's left over" title="Cut the burning, keep the haze" accent="#d97706">
          <CounterfactualSlider />
        </AgenticCard>
      </div>
    </section>
  );
};
