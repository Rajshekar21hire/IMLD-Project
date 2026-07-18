import React from 'react';

export const DeepDivesWorstAffectedSection: React.FC = () => {
  return (
    <section className="ss-structural-section py-16 px-6 md:px-12 bg-transparent">
      <div className="mx-auto max-w-[90rem] bg-transparent text-center">
         <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#0C447C] font-bold">
          Deep Dives
        </p>
        <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
          The <span style={{ color: '#ba324f' }}>Worst-Affected </span> Cities
        </h2>
            <p className="mt-4 text-center text-slate-700 leading-relaxed"> 
                In order to deep dive, we need to know what are the best and worst cities according to the air quality index.
            </p>
            <p className="mt-4 text-center text-slate-700 leading-relaxed">
                 There are certain factors that contribute to the root cause of the cities having a bad air quality. The five cities we see share a structural cluster of causes such as fossil-fuel transport, coal-fired kilns and industrial emissions. These are then amplified by flat basin geography that traps pollutants in winter inversions, and undermined by weak cross-boundary governance.
            </p>
      </div>
    </section>
  );
};
