import React from 'react';

export const WhyTheseFiveSection: React.FC = () => {
  return (
    <section className="bg-white py-16 px-6 md:px-12">
      <div className="mx-auto max-w-5xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#0C447C]">
          Why these five
        </p>
        <h2 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
          The <span style={{ color: '#ba324f' }}>Worst-Affected </span> Places, By The Numbers
        </h2>
        <br/>
        <br/>
        <p className="mt-4 w-full text-justify text-base leading-relaxed text-slate-700">
          To deep-dive responsibly, we first had to establish which cities actually
          rank as the best and worst by air quality index. These five share a
          structural cluster of causes, fossil-fuel transport, coal-fired brick
          kilns, and industrial emissions, amplified by flat basin geography that
          traps pollutants in winter inversions, and left unchecked by weak
          cross-boundary governance.
        </p>
        <br/>
      </div>
    </section>
  );
};