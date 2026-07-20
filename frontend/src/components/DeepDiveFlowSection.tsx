import React from 'react';
import { FogDriftLayer } from './FogDriftLayer';
import { PollutionScrollField } from './PollutionScrollField';
import { InversionChamber } from './InversionChamber';
import { InterventionLedger } from './InterventionLedger';
import { SourceMixComparator } from './SourceMixComparator';
import { InterventionImpactScenario } from './InterventionImpactScenario';

// One continuous flow (no per-item boxed-card chrome, no opaque canvas of its own) so the
// page's own ambient sky background (SkyBackground.tsx, fixed behind everything) shows straight
// through, exactly like the Human Generated section - only the left-to-right fog motif shared
// with the Agentic AI section sits on top. Each piece keeps its own deliberately art-directed
// internal palette (InversionChamber's soft AQI-band colour, Intervention Ledger's cream ledger
// look) - only the connecting background is shared here. PollutionScrollField gets a fixed,
// moderate severity (no per-beat severity data exists here like in Agentic AI) so it still
// answers scroll direction, just without the beat-to-beat colour swing.
export const DeepDiveFlowSection: React.FC = () => (
  <div className="s4h-root relative w-full overflow-hidden bg-transparent">
    <FogDriftLayer opacity={0.7} />
    <PollutionScrollField severity={0.4} />
    <div className="relative z-[1] flex flex-col gap-6 py-4">
      <section className="ss-structural mx-auto w-full max-w-[84rem] bg-white py-16 px-6 md:px-12">
        <SourceMixComparator />
      </section>

      <section className="ss-structural mx-auto w-full max-w-[84rem] bg-white py-16 px-6 md:px-12">
        <InterventionImpactScenario />
      </section>

      <section className="ss-structural mx-auto w-full max-w-[84rem] bg-white py-16 px-6 md:px-12">
        <InterventionLedger />
      </section>

      <section className="ss-structural mx-auto w-full max-w-[84rem] bg-white py-16 px-6 md:px-12">
        <InversionChamber />
      </section>
    </div>
  </div>
);
