import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wind, Map, Activity, BookOpen, Zap,
  Globe, BarChart2, ChevronRight, Leaf, Database,
} from 'lucide-react';

const AQI_BANDS = [
  { color: '#22c55e', label: 'Good', range: '0–50', desc: 'Air quality is satisfactory' },
  { color: '#eab308', label: 'Moderate', range: '51–100', desc: 'Acceptable for most people' },
  { color: '#f97316', label: 'Sensitive Groups', range: '101–150', desc: 'Sensitive groups affected' },
  { color: '#ef4444', label: 'Unhealthy', range: '151–200', desc: 'Everyone may experience effects' },
  { color: '#a855f7', label: 'Very Unhealthy', range: '201–300', desc: 'Health alert for everyone' },
  { color: '#7c3aed', label: 'Hazardous', range: '300+', desc: 'Emergency conditions' },
];

function useCountUp(target: number, duration: number, trigger: boolean) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    const startTime = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
      else setVal(target);
    };
    requestAnimationFrame(tick);
  }, [trigger, target, duration]);
  return val;
}

export const HomePage: React.FC = () => {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [hoveredAqi, setHoveredAqi] = useState<number | null>(null);

  const countries = useCountUp(55, 1500, statsVisible);
  const readings = useCountUp(100, 2000, statsVisible);
  const cities = useCountUp(300, 1800, statsVisible);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-slate-950 text-white overflow-x-hidden">
      <style>{`
        @keyframes float1 {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(40px,-30px) scale(1.1)}
          66%{transform:translate(-20px,20px) scale(0.95)}
        }
        @keyframes float2 {
          0%,100%{transform:translate(0,0) scale(1)}
          33%{transform:translate(-50px,30px) scale(1.05)}
          66%{transform:translate(30px,-20px) scale(0.9)}
        }
        @keyframes float3 {
          0%,100%{transform:translate(0,0) scale(1)}
          50%{transform:translate(20px,-40px) scale(1.1)}
        }
        @keyframes pulse-glow {
          0%,100%{box-shadow:0 0 20px rgba(59,130,246,0.3)}
          50%{box-shadow:0 0 60px rgba(59,130,246,0.7),0 0 100px rgba(99,102,241,0.4)}
        }
        @keyframes fade-up {
          from{opacity:0;transform:translateY(30px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes shimmer {
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
        .blob1{animation:float1 8s ease-in-out infinite}
        .blob2{animation:float2 10s ease-in-out infinite}
        .blob3{animation:float3 12s ease-in-out infinite}
        .blob4{animation:float2 9s ease-in-out infinite}
        .glow-logo{animation:pulse-glow 3s ease-in-out infinite}
        .fu1{animation:fade-up 0.8s 0.1s ease-out both}
        .fu2{animation:fade-up 0.8s 0.2s ease-out both}
        .fu3{animation:fade-up 0.8s 0.35s ease-out both}
        .fu4{animation:fade-up 0.8s 0.55s ease-out both}
        .fu5{animation:fade-up 0.8s 0.7s ease-out both}
        .shimmer-text{
          background:linear-gradient(90deg,#60a5fa,#818cf8,#c084fc,#60a5fa);
          background-size:200% auto;
          -webkit-background-clip:text;
          background-clip:text;
          -webkit-text-fill-color:transparent;
          animation:shimmer 4s linear infinite;
        }
        .card-lift{transition:transform 0.3s ease,box-shadow 0.3s ease}
        .card-lift:hover{transform:translateY(-6px)}
        .aqi-seg{transition:transform 0.2s ease,filter 0.2s ease;position:relative}
        .aqi-seg:hover{transform:scaleY(1.25);filter:brightness(1.3);z-index:10}
      `}</style>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* animated blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob1 absolute top-20 left-10 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="blob2 absolute bottom-20 right-10 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="blob3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl" />
          <div className="blob4 absolute top-40 right-1/4 w-52 h-52 bg-cyan-500/15 rounded-full blur-2xl" />
        </div>

        {/* grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* glowing logo */}
          <div className="fu1 flex justify-center mb-8">
            <div className="glow-logo w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Wind className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* badge */}
          <div className="fu2 flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest">
              <Zap className="w-3 h-3" /> AI-Powered Air Quality Platform
            </span>
          </div>

          {/* headline */}
          <h1 className="fu3 text-6xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight">
            <span className="text-white">Breathe Smarter.</span>
            <br />
            <span className="shimmer-text">Understand Air.</span>
          </h1>

          <p className="fu4 text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            AirStory transforms raw pollution data into compelling stories. Explore global AQI trends,
            generate AI narratives, and visualize air quality worldwide.
          </p>

          {/* CTA buttons */}
          <div className="fu5 flex flex-wrap justify-center gap-4">
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-8 py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-105 text-lg"
            >
              Open Story Studio
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/live-map"
              className="group inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 text-lg"
            >
              <Globe className="w-5 h-5" /> View Live Map
            </Link>
          </div>

          {/* scroll hint */}
          <div className="mt-20 flex flex-col items-center gap-2 text-slate-600 text-xs animate-bounce">
            <span>Scroll to explore</span>
            <div className="w-px h-8 bg-gradient-to-b from-slate-600 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-20 px-6 bg-slate-900/60 border-y border-slate-800">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard
            icon={<Globe className="w-6 h-6 text-blue-400" />}
            value={`${countries}+`}
            label="Countries"
            color="blue"
          />
          <StatCard
            icon={<Database className="w-6 h-6 text-emerald-400" />}
            value={`${readings}K+`}
            label="Data Readings"
            color="emerald"
          />
          <StatCard
            icon={<Map className="w-6 h-6 text-violet-400" />}
            value={`${cities}+`}
            label="Cities Tracked"
            color="violet"
          />
          <StatCard
            icon={<Zap className="w-6 h-6 text-amber-400" />}
            value="Live"
            label="AQI Updates"
            color="amber"
          />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">What's Inside</p>
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              A complete toolkit for exploring, analyzing, and narrating air quality data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FeatureCard
              to="/dashboard"
              gradient="from-blue-600/20 to-indigo-600/20"
              border="border-blue-500/20"
              iconBg="bg-blue-500/20"
              icon={<BookOpen className="w-7 h-7 text-blue-400" />}
              title="Story Studio"
              desc="Let AI craft compelling narratives from pollution data. Customize by country, city, or pollutant and share insights in seconds."
              badge="AI Powered"
              badgeColor="text-blue-300 bg-blue-500/10 border-blue-500/20"
            />
            <FeatureCard
              to="/analytics"
              gradient="from-emerald-600/20 to-teal-600/20"
              border="border-emerald-500/20"
              iconBg="bg-emerald-500/20"
              icon={<BarChart2 className="w-7 h-7 text-emerald-400" />}
              title="Analytics"
              desc="Deep-dive into pollution trends across time and geography. Interactive charts reveal patterns hidden in raw data."
              badge="Visualizations"
              badgeColor="text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
            />
            <FeatureCard
              to="/realtime"
              gradient="from-orange-600/20 to-red-600/20"
              border="border-orange-500/20"
              iconBg="bg-orange-500/20"
              icon={<Activity className="w-7 h-7 text-orange-400" />}
              title="Real-Time Monitor"
              desc="Watch live AQI readings update dynamically. City-level granularity with instant pollutant breakdowns."
              badge="Live Data"
              badgeColor="text-orange-300 bg-orange-500/10 border-orange-500/20"
            />
            <FeatureCard
              to="/live-map"
              gradient="from-violet-600/20 to-purple-600/20"
              border="border-violet-500/20"
              iconBg="bg-violet-500/20"
              icon={<Map className="w-7 h-7 text-violet-400" />}
              title="Live AQI Map"
              desc="An interactive world map where every country's color tells its air quality story. Drag, zoom, and explore globally."
              badge="Interactive"
              badgeColor="text-violet-300 bg-violet-500/10 border-violet-500/20"
            />
          </div>
        </div>
      </section>

      {/* ── AQI SCALE ── */}
      <section className="py-28 px-6 bg-slate-900/60 border-y border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Understanding AQI
            </p>
            <h2 className="text-4xl font-bold text-white mb-4">The Air Quality Index Scale</h2>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              AQI translates complex pollution measurements into one number that tells you how clean
              or polluted the air is — and what health effects might be a concern.
            </p>
          </div>

          {/* interactive color bar */}
          <div className="flex h-16 rounded-2xl overflow-hidden mb-8 shadow-2xl">
            {AQI_BANDS.map((band, i) => (
              <div
                key={band.label}
                className="aqi-seg flex-1"
                style={{ backgroundColor: band.color }}
                onMouseEnter={() => setHoveredAqi(i)}
                onMouseLeave={() => setHoveredAqi(null)}
              />
            ))}
          </div>

          {/* band detail cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AQI_BANDS.map((band, i) => (
              <div
                key={band.label}
                className="p-4 rounded-xl border transition-all duration-300 cursor-default select-none"
                style={
                  hoveredAqi === i
                    ? {
                        borderColor: band.color + '60',
                        backgroundColor: band.color + '18',
                        boxShadow: `0 0 24px ${band.color}28`,
                        transform: 'scale(1.04)',
                      }
                    : { borderColor: 'rgba(71,85,105,0.4)', backgroundColor: 'rgba(30,41,59,0.5)' }
                }
                onMouseEnter={() => setHoveredAqi(i)}
                onMouseLeave={() => setHoveredAqi(null)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: band.color }} />
                  <span className="text-xs font-bold text-white">{band.label}</span>
                </div>
                <p className="text-xs text-slate-400 mb-1">{band.range}</p>
                <p className="text-xs text-slate-500">{band.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob1 absolute top-0 left-1/4 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl" />
          <div className="blob2 absolute bottom-0 right-1/4 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-xl shadow-blue-500/30">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
            Start Understanding<br />the Air You Breathe
          </h2>
          <p className="text-slate-400 text-xl mb-10 max-w-xl mx-auto">
            Every data point is a story. Let AI help you tell it — for awareness, research, or change.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/dashboard"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-10 py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-105 text-lg"
            >
              Get Started
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-10 py-4 rounded-xl backdrop-blur-sm transition-all duration-300 hover:scale-105 text-lg"
            >
              <BarChart2 className="w-5 h-5" /> Explore Analytics
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

function StatCard({
  icon, value, label, color,
}: {
  icon: React.ReactNode; value: string; label: string; color: string;
}) {
  const borders: Record<string, string> = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    violet: 'border-violet-500/20 bg-violet-500/5',
    amber: 'border-amber-500/20 bg-amber-500/5',
  };
  return (
    <div className={`card-lift rounded-2xl border p-6 text-center ${borders[color]}`}>
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-3xl font-extrabold text-white mb-1">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

function FeatureCard({
  to, gradient, border, iconBg, icon, title, desc, badge, badgeColor,
}: {
  to: string; gradient: string; border: string; iconBg: string;
  icon: React.ReactNode; title: string; desc: string; badge: string; badgeColor: string;
}) {
  return (
    <Link to={to} className="block group">
      <div className={`card-lift h-full bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-7`}>
        <div className="flex items-start justify-between mb-4">
          <div className={`${iconBg} p-3 rounded-xl`}>{icon}</div>
          <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badgeColor}`}>{badge}</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed mb-5">{desc}</p>
        <div className="flex items-center gap-1 text-sm font-medium text-white/50 group-hover:text-white/90 transition-colors">
          Open {title} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
