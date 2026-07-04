import React from 'react';

const PARTICLES = [
  // Original 25 â€” sizes tripled
  { id: 1,  left: '4%',  top: '8%',  w: 15, h: 15, drift: 1, fade: 5, dDelay: 0,   fDelay: 0   },
  { id: 2,  left: '12%', top: '32%', w: 9,  h: 9,  drift: 2, fade: 6, dDelay: 1,   fDelay: 1.5 },
  { id: 3,  left: '22%', top: '18%', w: 12, h: 12, drift: 3, fade: 4, dDelay: 2.5, fDelay: 0.5 },
  { id: 4,  left: '33%', top: '55%', w: 18, h: 18, drift: 4, fade: 7, dDelay: 0.5, fDelay: 2   },
  { id: 5,  left: '45%', top: '10%', w: 9,  h: 9,  drift: 1, fade: 5, dDelay: 3,   fDelay: 1   },
  { id: 6,  left: '55%', top: '40%', w: 15, h: 15, drift: 2, fade: 6, dDelay: 1.5, fDelay: 3   },
  { id: 7,  left: '65%', top: '22%', w: 12, h: 12, drift: 3, fade: 4, dDelay: 4,   fDelay: 0   },
  { id: 8,  left: '75%', top: '60%', w: 9,  h: 9,  drift: 4, fade: 5, dDelay: 2,   fDelay: 2.5 },
  { id: 9,  left: '85%', top: '14%', w: 18, h: 18, drift: 1, fade: 7, dDelay: 0.8, fDelay: 1   },
  { id: 10, left: '92%', top: '45%', w: 12, h: 12, drift: 2, fade: 6, dDelay: 3.5, fDelay: 0.5 },
  { id: 11, left: '8%',  top: '70%', w: 15, h: 15, drift: 3, fade: 5, dDelay: 1,   fDelay: 3   },
  { id: 12, left: '18%', top: '85%', w: 9,  h: 9,  drift: 4, fade: 4, dDelay: 2,   fDelay: 1.5 },
  { id: 13, left: '28%', top: '75%', w: 12, h: 12, drift: 1, fade: 6, dDelay: 4,   fDelay: 0   },
  { id: 14, left: '40%', top: '88%', w: 18, h: 18, drift: 2, fade: 5, dDelay: 0.5, fDelay: 2   },
  { id: 15, left: '50%', top: '65%', w: 9,  h: 9,  drift: 3, fade: 7, dDelay: 3,   fDelay: 1   },
  { id: 16, left: '60%', top: '80%', w: 15, h: 15, drift: 4, fade: 4, dDelay: 1.5, fDelay: 3.5 },
  { id: 17, left: '70%', top: '72%', w: 12, h: 12, drift: 1, fade: 6, dDelay: 2.5, fDelay: 0.5 },
  { id: 18, left: '80%', top: '90%', w: 9,  h: 9,  drift: 2, fade: 5, dDelay: 0,   fDelay: 2   },
  { id: 19, left: '90%', top: '78%', w: 18, h: 18, drift: 3, fade: 7, dDelay: 3.5, fDelay: 1   },
  { id: 20, left: '38%', top: '30%', w: 12, h: 12, drift: 4, fade: 4, dDelay: 1,   fDelay: 0   },
  { id: 21, left: '52%', top: '50%', w: 15, h: 15, drift: 1, fade: 6, dDelay: 2,   fDelay: 2.5 },
  { id: 22, left: '16%', top: '50%', w: 9,  h: 9,  drift: 2, fade: 5, dDelay: 4,   fDelay: 1   },
  { id: 23, left: '78%', top: '38%', w: 12, h: 12, drift: 3, fade: 4, dDelay: 0.5, fDelay: 3   },
  { id: 24, left: '96%', top: '25%', w: 15, h: 15, drift: 4, fade: 6, dDelay: 1.5, fDelay: 0.5 },
  { id: 25, left: '2%',  top: '90%', w: 9,  h: 9,  drift: 1, fade: 5, dDelay: 3,   fDelay: 2   },
  // Extra 20 for higher frequency
  { id: 26, left: '10%', top: '25%', w: 14, h: 14, drift: 2, fade: 6, dDelay: 0.3, fDelay: 1   },
  { id: 27, left: '25%', top: '42%', w: 10, h: 10, drift: 3, fade: 5, dDelay: 1.8, fDelay: 0.7 },
  { id: 28, left: '35%', top: '12%', w: 16, h: 16, drift: 4, fade: 7, dDelay: 2.2, fDelay: 2.3 },
  { id: 29, left: '47%', top: '78%', w: 11, h: 11, drift: 1, fade: 4, dDelay: 3.7, fDelay: 0   },
  { id: 30, left: '57%', top: '28%', w: 13, h: 13, drift: 2, fade: 6, dDelay: 0.9, fDelay: 1.8 },
  { id: 31, left: '68%', top: '52%', w: 9,  h: 9,  drift: 3, fade: 5, dDelay: 4.2, fDelay: 3.1 },
  { id: 32, left: '74%', top: '85%', w: 17, h: 17, drift: 4, fade: 7, dDelay: 1.3, fDelay: 0.4 },
  { id: 33, left: '82%', top: '20%', w: 10, h: 10, drift: 1, fade: 4, dDelay: 2.7, fDelay: 2   },
  { id: 34, left: '88%', top: '62%', w: 14, h: 14, drift: 2, fade: 6, dDelay: 0.6, fDelay: 1.2 },
  { id: 35, left: '6%',  top: '48%', w: 12, h: 12, drift: 3, fade: 5, dDelay: 3.3, fDelay: 0.8 },
  { id: 36, left: '20%', top: '60%', w: 16, h: 16, drift: 4, fade: 7, dDelay: 1.7, fDelay: 3.5 },
  { id: 37, left: '31%', top: '92%', w: 9,  h: 9,  drift: 1, fade: 4, dDelay: 4.5, fDelay: 1.6 },
  { id: 38, left: '43%', top: '20%', w: 13, h: 13, drift: 2, fade: 6, dDelay: 0.4, fDelay: 0.2 },
  { id: 39, left: '62%', top: '95%', w: 11, h: 11, drift: 3, fade: 5, dDelay: 2.9, fDelay: 2.7 },
  { id: 40, left: '72%', top: '10%', w: 15, h: 15, drift: 4, fade: 7, dDelay: 1.1, fDelay: 1.4 },
  { id: 41, left: '48%', top: '35%', w: 10, h: 10, drift: 1, fade: 4, dDelay: 3.8, fDelay: 0.6 },
  { id: 42, left: '58%', top: '68%', w: 14, h: 14, drift: 2, fade: 6, dDelay: 0.7, fDelay: 3.8 },
  { id: 43, left: '94%', top: '88%', w: 12, h: 12, drift: 3, fade: 5, dDelay: 2.4, fDelay: 1.9 },
  { id: 44, left: '3%',  top: '55%', w: 16, h: 16, drift: 4, fade: 7, dDelay: 1.6, fDelay: 0.3 },
  { id: 45, left: '42%', top: '62%', w: 9,  h: 9,  drift: 1, fade: 4, dDelay: 4.1, fDelay: 2.2 },
];

const COLORS = ['#60a5fa', '#93c5fd', '#7dd3fc', '#a5b4fc', '#bfdbfe'];

const AirParticlesBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, rgba(219,234,254,0.55) 0%, rgba(239,246,255,0.45) 45%, rgba(224,242,254,0.55) 100%)' }}
    >
      <style>{`
        @keyframes ap-drift1 {
          0%,100% { transform: translate(0,0); }
          33%      { transform: translate(28px,-18px); }
          66%      { transform: translate(-14px,22px); }
        }
        @keyframes ap-drift2 {
          0%,100% { transform: translate(0,0); }
          33%      { transform: translate(-22px,16px); }
          66%      { transform: translate(18px,-28px); }
        }
        @keyframes ap-drift3 {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(14px,-32px); }
        }
        @keyframes ap-drift4 {
          0%,100% { transform: translate(0,0); }
          33%      { transform: translate(36px,10px); }
          66%      { transform: translate(-18px,-18px); }
        }
        @keyframes ap-fade {
          0%,100% { opacity: 0.35; }
          50%      { opacity: 0.8; }
        }
      `}</style>

      {PARTICLES.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.left,
            top: p.top,
            width: p.w,
            height: p.h,
            borderRadius: '50%',
            background: COLORS[(p.id - 1) % COLORS.length],
            animation: `ap-drift${p.drift} ${10 + p.id % 8}s ease-in-out ${p.dDelay}s infinite,
                        ap-fade ${p.fade}s ease-in-out ${p.fDelay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

export default AirParticlesBackground;
