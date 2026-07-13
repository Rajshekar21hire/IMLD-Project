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

const PANEL_BG = 'linear-gradient(180deg, #f8f5ee 0%, #f1f6f5 55%, #eef3f8 100%)';
const TEXT = '#232323';

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
      <div className="mx-auto" style={{ maxWidth: '780px' }}>
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
          <>
            <AgenticCard eyebrow="How it feels" title="Take a breath" accent="#10b981">
              <BreathingCircle city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
            <AgenticCard eyebrow="Right now" title="What this means today" accent="#7c3aed">
              <WhatThisMeansToday city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
            <AgenticCard eyebrow="Do this" title="One small thing" accent="#d97706">
              <OneSmallThing city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
            <AgenticCard eyebrow="Perspective" title="The neighbour comparison" accent="#e11d48">
              <NeighbourComparison city={city!} forWhom={forWhom!} concern={concern!} />
            </AgenticCard>
          </>
        )}

        <AgenticCard eyebrow="Right now" title="Today's air, in words" accent="#0d9488">
          <TodaysAirInWords />
        </AgenticCard>

        <AgenticCard eyebrow="What helps" title="What would actually help here" accent="#ea580c">
          <WhatWouldActuallyHelpHere />
        </AgenticCard>

        <AgenticCard eyebrow="Imagine" title="One good day" accent="#c026d3">
          <OneGoodDay />
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
      </div>
    </section>
  );
};
