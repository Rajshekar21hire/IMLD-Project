import React from 'react';

const steps = [
  {
    eyebrow: 'Structural cluster',
    title: 'The same three sources, everywhere',
    body: 'Fossil-fuel transport, coal-fired brick kilns and unregulated industrial emissions form the backbone of pollution in all five cities, just in different proportions.',
    accent: 'border-t-sky-300',
  },
  {
    eyebrow: 'Amplified by geography',
    title: 'A flat bowl that traps the air',
    body: 'Winter temperature inversions over the flat Indo-Gangetic and Punjab plains stop pollutants from dispersing, turning ordinary emissions into hazardous seasonal spikes.',
    accent: 'border-t-sky-500',
  },
  {
    eyebrow: 'Undermined by governance',
    title: 'Borders that pollution ignores',
    body: 'Overlapping jurisdictions across states and countries mean no single authority owns the airshed, so even good policy rarely survives contact with enforcement.',
    accent: 'border-t-sky-700',
  },
] as const;

export const ReadingPatternSection: React.FC = () => {
  return (
    <section className="ss-structural-section py-16 px-6 md:px-12 bg-transparent">
      <div className="mx-auto max-w-[90rem] bg-transparent">
        <div className="space-y-5">
          <div className="text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#0C447C] font-bold">Reading the pattern</p>
             <h2 className="mt-4 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">Not Five Crises. <span style={{ color: '#ff6d00' }}>  One Mechanism, </span> Repeated.</h2>
            <br/>
          </div>
          <br/>

          <div className="grid grid-cols-1 gap-4 min-[820px]:grid-cols-[1fr_auto_1fr_auto_1fr] min-[820px]:items-stretch">
            {steps.map((step, index) => (
              <React.Fragment key={step.title}>
                <article className={`rounded-2xl rounded-t-none border border-slate-200 border-t-4 ${step.accent} bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md`}>
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">{step.eyebrow}</p>
                  <h3 className="mt-2 text-center text-[1.05rem] font-semibold text-slate-950">{step.title}</h3>
                  <p className="mt-3 text-center text-sm leading-relaxed text-slate-700">{step.body}</p>
                </article>

                {index < steps.length - 1 && (
                  <div className="hidden items-center justify-center min-[820px]:flex" aria-hidden="true">
                    <svg className="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14" />
                      <path d="m13 6 6 6-6 6" />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
