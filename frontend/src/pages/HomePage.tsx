import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Wind, Map as MapIcon, Activity, BookOpen, Zap,
  Globe, ChevronRight, Leaf, Database,
  ZoomIn, ZoomOut, RotateCcw, AlertCircle,
} from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import apiClient from '../services/api';
import CloudBackground from '../components/CloudBackground';

const AQI_BANDS = [
  { color: '#22c55e', label: 'Good', range: '0–50', desc: 'Air quality is satisfactory' },
  { color: '#eab308', label: 'Moderate', range: '51–100', desc: 'Acceptable for most people' },
  { color: '#f97316', label: 'Sensitive Groups', range: '101–150', desc: 'Sensitive groups affected' },
  { color: '#ef4444', label: 'Unhealthy', range: '151–200', desc: 'Everyone may experience effects' },
  { color: '#a855f7', label: 'Very Unhealthy', range: '201–300', desc: 'Health alert for everyone' },
  { color: '#7c3aed', label: 'Hazardous', range: '300+', desc: 'Emergency conditions' },
];

// ── Map types ─────────────────────────────────────────────────────────────
interface CountryAQI { country: string; avg_aqi: number; record_count: number; aqi_category: string; }
interface CityAQI { city: string; country: string; latitude: number; longitude: number; avg_aqi: number; record_count: number; aqi_category: string; }
interface MapPosition { coordinates: [number, number]; zoom: number; }
interface MapTooltip { visible: boolean; x: number; y: number; country: string; aqi: number | null; category: string; records: number; }

// ── Map constants ─────────────────────────────────────────────────────────
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json';
const MAP_AQI_BANDS = [
  { max: 50,       color: '#22c55e', label: 'Good',             range: '0\u201350'   },
  { max: 100,      color: '#eab308', label: 'Moderate',         range: '51\u2013100' },
  { max: 150,      color: '#f97316', label: 'Sensitive Groups', range: '101\u2013150'},
  { max: 200,      color: '#ef4444', label: 'Unhealthy',        range: '151\u2013200'},
  { max: 300,      color: '#a855f7', label: 'Very Unhealthy',   range: '201\u2013300'},
  { max: Infinity, color: '#7c3aed', label: 'Hazardous',        range: '300+'   },
];
const MAP_NO_DATA_COLOR = '#334155';
const MAP_OCEAN_COLOR   = '#95BFEE';
const MAP_BORDER_COLOR  = '#0f172a';
const MAP_DEFAULT_POSITION: MapPosition = { coordinates: [10, 20], zoom: 1 };
function aqiColor(aqi: number | null): string {
  if (aqi === null) return MAP_NO_DATA_COLOR;
  return MAP_AQI_BANDS.find(b => aqi <= b.max)?.color ?? '#7c3aed';
}
const ISO_TO_GEO_NAMES: Record<string, string[]> = {
  AE:['United Arab Emirates'],AF:['Afghanistan'],AR:['Argentina'],AT:['Austria'],AU:['Australia'],
  BA:['Bosnia and Herz.','Bosnia and Herzegovina'],BD:['Bangladesh'],BE:['Belgium'],BG:['Bulgaria'],BH:['Bahrain'],
  BO:['Bolivia'],BR:['Brazil'],CA:['Canada'],CH:['Switzerland'],CI:["C\u00f4te d'Ivoire","Cote d'Ivoire",'Ivory Coast'],
  CL:['Chile'],CN:['China'],CO:['Colombia'],CR:['Costa Rica'],CW:['Cura\u00e7ao','Curacao'],CY:['Cyprus'],
  CZ:['Czech Rep.','Czechia','Czech Republic'],DE:['Germany'],DK:['Denmark'],DZ:['Algeria'],EC:['Ecuador'],
  EE:['Estonia'],ES:['Spain'],ET:['Ethiopia'],FI:['Finland'],FR:['France'],GB:['United Kingdom'],
  GE:['Georgia'],GH:['Ghana'],GN:['Guinea'],GR:['Greece'],GT:['Guatemala'],HK:['Hong Kong','Hong Kong S.A.R.'],
  HR:['Croatia'],HU:['Hungary'],ID:['Indonesia'],IE:['Ireland'],IL:['Israel'],IN:['India'],IQ:['Iraq'],
  IR:['Iran','Iran (Islamic Republic of)'],IS:['Iceland'],IT:['Italy'],JO:['Jordan'],JP:['Japan'],
  KG:['Kyrgyzstan'],KR:['South Korea','Korea, Republic of'],KW:['Kuwait'],KZ:['Kazakhstan'],
  LA:['Laos','Lao PDR'],LK:['Sri Lanka'],LT:['Lithuania'],MK:['North Macedonia','N. Macedonia','Macedonia'],
  ML:['Mali'],MM:['Myanmar'],MN:['Mongolia'],MO:['Macao','Macao S.A.R.','Macau'],MX:['Mexico'],MY:['Malaysia'],
  NL:['Netherlands'],NO:['Norway'],NP:['Nepal'],NZ:['New Zealand'],PE:['Peru'],PH:['Philippines'],
  PK:['Pakistan'],PL:['Poland'],PR:['Puerto Rico'],PT:['Portugal'],RE:['R\u00e9union','Reunion'],
  RO:['Romania'],RS:['Serbia'],RU:['Russia','Russian Federation'],SA:['Saudi Arabia'],SE:['Sweden'],
  SG:['Singapore'],SK:['Slovakia'],SV:['El Salvador'],TH:['Thailand'],TJ:['Tajikistan'],TM:['Turkmenistan'],
  TR:['Turkey','T\u00fcrkiye'],TW:['Taiwan','Taiwan (Province of China)'],UA:['Ukraine'],UG:['Uganda'],
  US:['United States of America','United States'],UZ:['Uzbekistan'],VN:['Vietnam','Viet Nam'],
  XK:['Kosovo'],ZA:['South Africa'],
};
const GEO_TO_ISO = new Map<string, string>();
Object.entries(ISO_TO_GEO_NAMES).forEach(([iso, names]) => {
  names.forEach(name => GEO_TO_ISO.set(name.toLowerCase(), iso.toLowerCase()));
});
function buildCountryLookup(data: CountryAQI[]): Map<string, CountryAQI> {
  const m = new Map<string, CountryAQI>();
  data.forEach(d => m.set(d.country.trim().toLowerCase(), d));
  return m;
}
function findCountryByGeo(geoName: string, m: Map<string, CountryAQI>): CountryAQI | undefined {
  const iso = GEO_TO_ISO.get(geoName.toLowerCase());
  return iso ? m.get(iso) : undefined;
}

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

// ── Pollutant data ────────────────────────────────────────────────────────
const POLLUTANTS = [
  {
    key: 'pm25', label: 'PM2.5', color: '#b91c1c', bg: 'bg-red-800',
    guideline: '5 µg/m³ annual mean (WHO 2021)',
    description: 'Fine particulate matter - particles under 2.5 micrometres in diameter. The single most lethal air pollutant tracked globally.',
    sources: 'Vehicle exhaust, coal combustion, wildfires, agricultural burning, industrial processes.',
    health: 'Penetrates deep into lung tissue and enters the bloodstream, driving cardiovascular disease, stroke, lung cancer, diabetes, and cognitive decline - no safe level has been identified.',
    hazard: 'Very high',
    hazardColor: '#b91c1c',
  },
  {
    key: 'pm10', label: 'PM10', color: '#c2410c', bg: 'bg-orange-700',
    guideline: '15 µg/m³ annual mean (WHO 2021)',
    description: 'Coarse particles between 2.5 and 10 micrometres, trapped in the nose and upper airways.',
    sources: 'Road dust, construction, pollen, sea salt, agricultural operations.',
    health: 'Nasal and throat irritation, bronchitis, and aggravated asthma: largely filtered before reaching the lungs, unlike PM2.5.',
    hazard: 'Moderate',
    hazardColor: '#c2410c',
  },
  {
    key: 'no2', label: 'NO₂', color: '#a16207', bg: 'bg-yellow-700',
    guideline: '10 µg/m³ annual mean (WHO 2021)',
    description: 'Nitrogen dioxide, a reddish-brown gas formed when fuel burns at high temperatures which is a major marker of traffic pollution.',
    sources: 'Vehicle engines, power plants, industrial boilers, gas appliances.',
    health: 'Inflames the lining of the airways, reducing lung function and worsening asthma; long-term exposure is linked to development of asthma in children.',
    hazard: 'High near roads',
    hazardColor: '#a16207',
  },
  {
    key: 'o3', label: 'O₃', color: '#15803d', bg: 'bg-green-700',
    guideline: '100 µg/m³ peak season daily max (WHO 2021)',
    description: 'Ground-level ozone, formed when NO₂ and volatile organic compounds react in sunlight - not emitted directly, peaks on hot, sunny, stagnant days.',
    sources: 'Vehicle exhaust + industrial VOCs + sunlight.',
    health: 'Irritates the respiratory system, triggers asthma attacks, reduces lung capacity, and damages crops and ecosystems as well as human health.',
    hazard: 'High in summer heat',
    hazardColor: '#15803d',
  },
  {
    key: 'so2', label: 'SO₂', color: '#0f766e', bg: 'bg-teal-700',
    guideline: '40 µg/m³ 24-hour mean (WHO 2021)',
    description: 'Sulphur dioxide, a sharp-smelling gas released primarily by burning high-sulphur coal and heavy oil: a major cause of acid rain.',
    sources: 'Coal-fired power plants, oil refineries, metal smelters, volcanoes.',
    health: 'Constricts airways immediately on inhalation, is a major driver of COPD near industrial zones, and combines with water vapour to form sulphuric acid in the lungs.',
    hazard: 'High near industry',
    hazardColor: '#0f766e',
  },
  {
    key: 'co', label: 'CO', color: '#1d4ed8', bg: 'bg-blue-700',
    guideline: '4 mg/m³ 24-hour mean (WHO 2021)',
    description: 'Carbon monoxide, a colourless, odourless gas produced by incomplete combustion, binding to haemoglobin 200× more readily than oxygen.',
    sources: 'Vehicle exhaust, gas appliances, open fires, industrial combustion.',
    health: 'At high concentrations causes headache, confusion, and death by oxygen deprivation; chronic low-level exposure impairs neurological function.',
    hazard: 'High indoors/traffic',
    hazardColor: '#1d4ed8',
  },
];

const PollutantExplorer: React.FC = () => {
  return (
    <div>
      <style>{`
        .flip-card { perspective: 1000px; }
        .flip-card-inner { position: relative; width: 100%; height: 400px; transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(0.4,0.2,0.2,1); }
        .flip-card:hover .flip-card-inner { transform: rotateY(180deg); }
        .flip-card-front, .flip-card-back { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 16px; }
        .flip-card-back { transform: rotateY(180deg); }
      `}</style>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {POLLUTANTS.map((p) => (
          <div key={p.key} className="flip-card cursor-pointer">
            <div className="flip-card-inner">
              {/* FRONT */}
              <div className="flip-card-front flex flex-col items-center justify-center border"
                style={{ backgroundColor: p.color + '15', borderColor: p.color + '55' }}
              >
                <div className="text-3xl font-black mb-2" style={{ color: p.color }} dangerouslySetInnerHTML={{ __html: p.label }} />
                <div className="text-xs uppercase tracking-widest text-slate-500 mt-1">Hover to explore</div>
                <div className="mt-4 w-10 h-1 rounded-full" style={{ backgroundColor: p.color }} />
              </div>
              <div
                className="flip-card-back flex flex-col justify-between p-6 border"
                style={{ backgroundColor: p.color + '18', borderColor: p.color + '70' }}
              >
                <div>
                  <div className="text-xl font-black text-slate-900 mb-3" dangerouslySetInnerHTML={{ __html: p.label }} />
                  <p className="text-base text-slate-700 leading-relaxed mb-4">{p.description}</p>
                  <div className="text-base text-slate-600 mb-3"><span className="font-bold text-slate-900">Sources: </span>{p.sources}</div>
                  <div className="text-base text-slate-600"><span className="font-bold text-slate-900">Effects: </span>{p.health}</div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-500">{p.guideline}</span>
                  <span className="rounded px-3 py-1.5 text-sm font-bold text-white" style={{ backgroundColor: p.color }}>{p.hazard}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HomePage: React.FC = () => {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);
  const [hoveredAqi, setHoveredAqi] = useState<number | null>(null);
  const [sliderAqi, setSliderAqi] = useState(0);
  const sliderBandIndex = sliderAqi <= 50 ? 0 : sliderAqi <= 100 ? 1 : sliderAqi <= 150 ? 2 : sliderAqi <= 200 ? 3 : sliderAqi <= 300 ? 4 : 5;
  const activeBandIndex = hoveredAqi !== null ? hoveredAqi : sliderBandIndex;

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

  // ── Map state ────────────────────────────────────────────────────────────
  const [countryMap, setCountryMap] = useState<Map<string, CountryAQI>>(new Map());
  const [citiesData, setCitiesData] = useState<CityAQI[]>([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapPosition, setMapPosition] = useState<MapPosition>(MAP_DEFAULT_POSITION);
  const [showCityMarkers, setShowCityMarkers] = useState(false);
  const [mapTooltip, setMapTooltip] = useState<MapTooltip>({
    visible: false, x: 0, y: 0, country: '', aqi: null, category: '', records: 0,
  });
  const mapStats = React.useMemo(() => {
    if (!countryMap.size) return null;
    const vals = Array.from(countryMap.values());
    const sorted = [...vals].sort((a, b) => a.avg_aqi - b.avg_aqi);
    return {
      count: vals.length,
      avg: Math.round(vals.reduce((s, v) => s + v.avg_aqi, 0) / vals.length),
      best: sorted[0],
      worst: sorted[sorted.length - 1],
    };
  }, [countryMap]);
  useEffect(() => {
    Promise.all([apiClient.get('/data/world-aqi'), apiClient.get('/data/cities-aqi')])
      .then(([countryRes, citiesRes]) => {
        if (countryRes.data.success) setCountryMap(buildCountryLookup(countryRes.data.data));
        else setMapError('No AQI data returned from server');
        if (citiesRes.data.success) setCitiesData(citiesRes.data.data);
      })
      .catch(() => setMapError('Could not load AQI data \u2014 is the backend running?'))
      .finally(() => setMapLoading(false));
  }, []);

  return (
    <div className="bg-transparent text-slate-900 overflow-x-hidden">
      <CloudBackground />
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
        .aqi-scale-text{
          background:linear-gradient(90deg,#22c55e 0%,#eab308 35%,#f97316 65%,#ef4444 100%);
          -webkit-background-clip:text;
          background-clip:text;
          -webkit-text-fill-color:transparent;
          background-size:100% auto;
        }
        .teal-shimmer-text{
          background-image:linear-gradient(90deg,#0c447c 0%,#1d9e75 35%,#378add 70%,#0c447c 100%);
          background-size:300% 100%;
          -webkit-background-clip:text;
          background-clip:text;
          -webkit-text-fill-color:transparent;
          color:transparent;
          animation:tealShimmer 6s ease-in-out infinite;
        }
        @keyframes tealShimmer{
          0%{background-position:0% 50%}
          50%{background-position:100% 50%}
          100%{background-position:0% 50%}
        }
        .card-lift{transition:transform 0.3s ease,box-shadow 0.3s ease}
        .card-lift:hover{transform:translateY(-6px)}
        .aqi-seg{transition:transform 0.2s ease,filter 0.2s ease;position:relative}
        .aqi-seg:hover{transform:scaleY(1.25);filter:brightness(1.3);z-index:10}
      `}</style>

      {/* ── HERO ── */}
      <section className="relative flex items-center justify-center overflow-hidden py-14 md:py-20">
        {/* animated blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="blob1 absolute top-20 left-10 w-80 h-80 bg-[#CBD5E1]/50 rounded-full blur-3xl" />
          <div className="blob2 absolute bottom-20 right-10 w-96 h-96 bg-[#A3B1C6]/40 rounded-full blur-3xl" />
          <div className="blob3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#EEF3F8]/80 rounded-full blur-3xl" />
          <div className="blob4 absolute top-40 right-1/4 w-52 h-52 bg-[#E2E8F0]/60 rounded-full blur-2xl" />
        </div>

        {/* grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,0,0,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.07) 1px,transparent 1px)',
            backgroundSize: '52px 52px',
          }}
        />

        <div className="relative z-10 max-w-screen-2xl mx-auto px-6 text-center">
          {/* glowing logo */}
          <div className="fu1 flex justify-center mb-8">
            <div className="glow-logo w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
              <Wind className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* badge */}
          <div className="fu2 flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-600/30 text-blue-700 text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-widest">
              <Zap className="w-3 h-3" /> AI-Powered Air Quality Platform
            </span>
          </div>

          {/* headline */}
          <h1 className="fu3 text-7xl md:text-8xl font-extrabold mb-6 leading-tight tracking-tight">
            <span className="text-slate-900">Breathe Smarter.</span>
            <br />
            <span className="shimmer-text">Understand Air.</span>
          </h1>

          <p className="fu4 text-4xl font-bold leading-snug tracking-tight shimmer-text mb-10 max-w-6xl mx-auto">
            Air is the invisible, odorless, and tasteless mixture of gases surrounding the Earth that forms our atmosphere.
            It is the fundamental baseline for almost all terrestrial life, providing the vital oxygen required for respiration.
          </p>


        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} className="py-20 px-6 border-t border-white/40">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard
            icon={<Globe className="w-6 h-6 text-[#6A9FB5]" />}
            value={`${countries}+`}
            label="Countries"
            color="blue1"
          />
          <StatCard
            icon={<Database className="w-6 h-6 text-[#6A9FB5]" />}
            value={`${readings}K+`}
            label="Data Readings"
            color="blue2"
          />
          <StatCard
            icon={<MapIcon className="w-6 h-6 text-[#6A9FB5]" />}
            value={`${cities}+`}
            label="Cities Tracked"
            color="blue3"
          />
          <StatCard
            icon={<Zap className="w-6 h-6 text-[#6A9FB5]" />}
            value="Live"
            label="AQI Updates"
            color="blue4"
          />
        </div>
        <p className="mt-8 text-center text-slate-500 text-2xl w-full mx-auto">
          Data sourced from the World Air Quality Index (WAQI) project - a global network of over 12,000 air quality monitoring stations across 1,000+ cities, covering PM2.5, PM10, NO₂, O₃, SO₂, and CO pollutants.
        </p>
      </section>

      {/* ── WORLDWIDE AQI ── */}
      <section className="py-16 px-6" id="worldwide-aqi">
        <div className="max-w-screen-2xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-center gap-3 mb-1">
              <Globe className="w-7 h-7 text-blue-400" />
              <h2 className="text-6xl font-extrabold shimmer-text">Worldwide Air Quality</h2>
            </div>
            <br />
            <p className="text-slate-600 text-2xl mt-2">
              Explore the average Air Quality Index (AQI) for each country based on historical data. Drag to pan, and scroll or use the buttons to zoom.
            </p>
          </div>

          {mapStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <MapStatCard label="Countries Tracked" value={String(mapStats.count)} />
              <MapStatCard label="Global Avg AQI" value={String(mapStats.avg)} color={aqiColor(mapStats.avg)} />
              <MapStatCard label="Cleanest Air" value={mapStats.best.country.toUpperCase()} sub={`AQI ${Math.round(mapStats.best.avg_aqi)}`} color="#22c55e" />
              <MapStatCard label="Most Polluted" value={mapStats.worst.country.toUpperCase()} sub={`AQI ${Math.round(mapStats.worst.avg_aqi)}`} color="#ef4444" />
            </div>
          )}

          <div className="relative bg-white rounded-2xl overflow-hidden border border-[#CBD5E1] shadow-lg">
            {mapLoading && <LoadingOverlay />}
            {mapError && <ErrorMessage message={mapError} />}
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
              <MapButton icon={<ZoomIn className="w-4 h-4" />} onClick={() => setMapPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.6, 10) }))} title="Zoom in" />
              <MapButton icon={<ZoomOut className="w-4 h-4" />} onClick={() => setMapPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.6, 1) }))} title="Zoom out" />
              <MapButton icon={<RotateCcw className="w-4 h-4" />} onClick={() => setMapPosition(MAP_DEFAULT_POSITION)} title="Reset view" />
              <button
                onClick={() => setShowCityMarkers(v => !v)}
                className={showCityMarkers ? 'p-2 rounded-lg transition bg-blue-600 hover:bg-blue-500 text-white shadow-lg' : 'p-2 rounded-lg transition bg-slate-700 hover:bg-slate-600 text-white shadow-lg'}
                title={showCityMarkers ? 'Hide city markers' : 'Show city markers'}
              >
                <span className="text-xs font-bold">Cities</span>
              </button>
            </div>
            <ComposableMap
              projection="geoNaturalEarth1"
              projectionConfig={{ scale: 155 }}
              style={{ width: '100%', height: '560px', background: MAP_OCEAN_COLOR }}
            >
              <ZoomableGroup
                zoom={mapPosition.zoom}
                center={mapPosition.coordinates}
                onMoveEnd={setMapPosition}
                maxZoom={10}
                minZoom={1}
              >
                <Geographies geography={GEO_URL}>
                  {({ geographies }) =>
                    geographies
                      .filter(geo => geo.properties.name !== 'Antarctica')
                      .map(geo => {
                        const match = findCountryByGeo(geo.properties.name, countryMap);
                        const fill = aqiColor(match?.avg_aqi ?? null);
                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill={fill}
                            stroke={MAP_BORDER_COLOR}
                            strokeWidth={0.75}
                            style={{
                              default: { fill, stroke: MAP_BORDER_COLOR, strokeWidth: 0.75, outline: 'none', cursor: 'pointer' },
                              hover:   { fill, stroke: MAP_BORDER_COLOR, strokeWidth: 0.75, outline: 'none', cursor: 'pointer', filter: 'brightness(1.3)' },
                              pressed: { fill, stroke: MAP_BORDER_COLOR, strokeWidth: 0.75, outline: 'none' },
                            }}
                            onMouseEnter={e => {
                              if (match) setMapTooltip({ visible: true, x: e.clientX, y: e.clientY, country: match.country, aqi: match.avg_aqi, category: match.aqi_category, records: match.record_count });
                            }}
                            onMouseLeave={() => setMapTooltip(t => ({ ...t, visible: false }))}
                          />
                        );
                      })
                  }
                </Geographies>
                {showCityMarkers && citiesData.map(city => (
                  <Marker key={`${city.city}-${city.country}`} coordinates={[city.longitude, city.latitude]}>
                    <circle
                      r={3}
                      fill={aqiColor(city.avg_aqi)}
                      stroke="white"
                      strokeWidth={0.5}
                      opacity={0.8}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => setMapTooltip({ visible: true, x: e.clientX, y: e.clientY, country: `${city.city}, ${city.country}`, aqi: city.avg_aqi, category: city.aqi_category, records: city.record_count })}
                      onMouseLeave={() => setMapTooltip(t => ({ ...t, visible: false }))}
                    />
                  </Marker>
                ))}
              </ZoomableGroup>
            </ComposableMap>
          </div>

          <div className="mt-4 bg-white rounded-xl p-4 border border-[#CBD5E1] shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">AQI Color Scale</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {MAP_AQI_BANDS.map(band => (
                <div key={band.label} className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: band.color }} />
                  <span className="text-base text-slate-700">{band.range}</span>
                  <span className="text-base text-slate-500">({band.label})</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-sm flex-shrink-0" style={{ backgroundColor: MAP_NO_DATA_COLOR }} />
                <span className="text-base text-slate-400">No data</span>
              </div>
            </div>
          </div>
        </div>

        {mapTooltip.visible && (
          <div
            className="fixed z-50 pointer-events-none bg-white/95 backdrop-blur-sm border border-[#CBD5E1] rounded-xl shadow-2xl px-3.5 py-2.5"
            style={{ left: mapTooltip.x + 16, top: mapTooltip.y - 52 }}
          >
            <p className="text-sm font-semibold text-slate-900 mb-0.5">{mapTooltip.country}</p>
            {mapTooltip.aqi !== null ? (
              <>
                <p className="text-xs text-slate-600">AQI: <span className="font-bold text-base" style={{ color: aqiColor(mapTooltip.aqi) }}>{Math.round(mapTooltip.aqi)}</span></p>
                <p className="text-xs text-slate-500">{mapTooltip.category}</p>
                <p className="text-xs text-slate-400 mt-0.5">{mapTooltip.records.toLocaleString()} records</p>
              </>
            ) : (
              <p className="text-xs text-slate-500">No data available</p>
            )}
          </div>
        )}
      </section>

      {/* ── DIVIDER ── */}
      <div className="border-t border-white/40 mx-6" />

      {/* ── WHAT ARE WE BREATHING ── */}
      <section className="py-20 px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-5xl font-bold mb-6" style={{ color: '#1e3a5f' }}>What Exactly Are We Breathing?</h3>
          </div>

          {/* Pollutant flip cards */}
          <p className="text-slate-600 text-2xl leading-relaxed mb-4 text-center">
            Air can be polluted in two major ways: Human-made air pollution and Nature released pollution.
          </p>
          <p className="text-slate-600 text-2xl leading-relaxed mb-10 text-center">
            So air quality is determined by six key pollutants tracked by the WHO and national agencies. Each has different sources, different behaviour in the atmosphere, and different health effects. Hover any card to explore.
          </p>

          <PollutantExplorer />
        </div>
      </section>

      {/* ── AQI SCALE ── */}
      <section className="py-28 px-6 border-y border-white/40">
        <div className="max-w-screen-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-base font-semibold uppercase tracking-widest mb-3">
              Understanding AQI
            </p>
            <h2 className="text-5xl font-bold mb-4" style={{ color: '#1e3a5f' }}>The Air Quality Index Scale</h2>
            <p className="text-slate-600 max-w-5xl mx-auto text-2xl">
              Clean air is essential for healthy living, but according to the World Health Organization, almost 99% of the global population breathes air exceeding their guideline limits of air pollution.
              AQI translates complex pollution measurements into one number that tells you how clean
              or polluted the air is and what health effects might be a concern.
            </p>
          </div>

          {/* color bar with live position marker */}
          <div className="relative mb-1">
            <div className="flex h-16 rounded-2xl overflow-hidden shadow-2xl">
              {AQI_BANDS.map((band, i) => (
                <div
                  key={band.label}
                  className="aqi-seg flex-1 transition-opacity duration-300"
                  style={{
                    backgroundColor: band.color,
                    opacity: activeBandIndex === i ? 1 : 0.45,
                  }}
                  onMouseEnter={() => setHoveredAqi(i)}
                  onMouseLeave={() => setHoveredAqi(null)}
                />
              ))}
            </div>

          </div>

          {/* AQI slider */}
          <div className="mb-8 px-0.5">
            <style>{`
              .aqi-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 6px; border-radius: 9999px; outline: none; cursor: pointer;
                background: linear-gradient(to right,#22c55e 0%,#22c55e 10%,#eab308 10%,#eab308 20%,#f97316 20%,#f97316 30%,#ef4444 30%,#ef4444 40%,#a855f7 40%,#a855f7 60%,#7c3aed 60%,#7c3aed 100%); }
              .aqi-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid ${AQI_BANDS[sliderBandIndex].color}; box-shadow: 0 0 8px ${AQI_BANDS[sliderBandIndex].color}80; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s; }
              .aqi-slider::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid ${AQI_BANDS[sliderBandIndex].color}; box-shadow: 0 0 8px ${AQI_BANDS[sliderBandIndex].color}80; cursor: pointer; }
            `}</style>
            <input
              type="range"
              min={0}
              max={500}
              value={sliderAqi}
              onChange={(e) => { setSliderAqi(Number(e.target.value)); setHoveredAqi(null); }}
              className="aqi-slider"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1 px-0.5">
              {['0','50','100','150','200','300','500'].map((v) => <span key={v}>{v}</span>)}
            </div>
          </div>

          {/* band detail cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {AQI_BANDS.map((band, i) => {
              const isActive = activeBandIndex === i;
              const isSliderActive = sliderBandIndex === i;
              return (
                <div
                  key={band.label}
                  className="rounded-2xl border transition-all duration-300 cursor-default select-none flex flex-col justify-between"
                  style={
                    isActive
                      ? {
                          borderColor: band.color + '80',
                          backgroundColor: band.color + '22',
                          boxShadow: `0 0 32px ${band.color}55`,
                          transform: 'scale(1.05)',
                          padding: '32px',
                          minHeight: '220px',
                        }
                      : { borderColor: 'rgba(203,213,225,0.8)', backgroundColor: 'rgba(255,255,255,0.9)', padding: '28px', minHeight: '220px' }
                  }
                  onMouseEnter={() => setHoveredAqi(i)}
                  onMouseLeave={() => setHoveredAqi(null)}
                >
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div
                        className="rounded-sm flex-shrink-0 transition-all duration-300"
                        style={{ backgroundColor: band.color, width: isActive ? '18px' : '16px', height: isActive ? '18px' : '16px' }}
                      />
                    <span className={`font-bold text-slate-900 transition-all duration-300 ${isActive ? 'text-xl' : 'text-lg'}`}>{band.label}</span>
                  </div>
                  <p className={`text-center text-slate-600 mb-2 transition-all duration-300 ${isActive ? 'text-lg' : 'text-base'}`}>{band.range}</p>
                  <p className={`text-center text-slate-600 leading-relaxed transition-all duration-300 ${isActive ? 'text-base' : 'text-sm'}`}>{band.desc}</p>
                  </div>
                  {isSliderActive && (
                    <div
                      className="mt-5 rounded-lg px-3 py-2 text-sm font-semibold text-center"
                      style={{ backgroundColor: band.color + '30', color: band.color }}
                    >
                      AQI {sliderAqi} falls here
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-28 px-6">
        <div className="max-w-screen-2xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-base font-semibold uppercase tracking-widest mb-3" style={{ color: '#1e3a5f' }}>What's Inside</p>
            <h2 className="text-5xl font-bold mb-4" style={{ color: '#1e3a5f' }}>Data Analytics and More</h2>
            <p className="mt-8 text-4xl font-bold" style={{ color: '#1e3a5f' }}>Interested In How We Can <span className="teal-shimmer-text">Improve Air Quality</span>?</p>
            <Link
              to="/dashboard#story-studio-top"
              className="group mt-5 inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-10 py-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-105 text-lg"
            >
              Explore
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
            <FeatureCard
              to="/realtime"
              gradient="from-blue-600/20 to-sky-600/20"
              border="border-blue-500/20"
              iconBg="bg-blue-500/20"
              icon={<Activity className="w-7 h-7 text-blue-400" />}
              title="Real-Time Monitor"
              desc="Watch live AQI readings update dynamically. City-level granularity with instant pollutant breakdowns."
              badge="Live Data"
              badgeColor="text-[#2E4A62] font-semibold bg-blue-100/60 border-blue-400/40"
            />
            <FeatureCard
              to="/analytics"
              gradient="from-blue-600/20 to-indigo-600/20"
              border="border-blue-500/20"
              iconBg="bg-blue-500/20"
              icon={<Database className="w-7 h-7 text-blue-400" />}
              title="Analytics Dashboard"
              desc="Explore trends, compare pollutants, and generate AI summaries from the historical dataset."
              badge="Insights"
              badgeColor="text-[#2E4A62] font-semibold bg-blue-100/60 border-blue-400/40"
            />
          </div>
        </div>
      </section>

    </div>
  );
};

function MapStatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 border border-blue-200 bg-blue-50 shadow-sm text-center">
      <p className="text-sm text-slate-500 uppercase tracking-wide mb-1 text-center">{label}</p>
      <p className="text-2xl font-bold truncate text-center" style={{ color: color ?? '#1e293b' }}>{value}</p>
      {sub && <p className="text-sm text-slate-500 mt-0.5 text-center">{sub}</p>}
    </div>
  );
}
function MapButton({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button onClick={onClick} title={title} className="bg-white/90 hover:bg-[#EEF3F8] text-slate-700 p-2 rounded-lg shadow border border-[#CBD5E1] transition-colors">
      {icon}
    </button>
  );
}
function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-3" />
        <p className="text-slate-600 text-sm">Loading AQI data...</p>
      </div>
    </div>
  );
}
function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-600 text-sm">{message}</p>
      </div>
    </div>
  );
}

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
    violet1: 'border-violet-200 bg-violet-50',
    violet2: 'border-purple-200 bg-purple-100',
    violet3: 'border-violet-300 bg-violet-100',
    violet4: 'border-purple-300 bg-purple-50',
    blue1: 'border-blue-200 bg-blue-50',
    blue2: 'border-blue-200 bg-blue-50',
    blue3: 'border-blue-200 bg-blue-50',
    blue4: 'border-blue-200 bg-blue-50',
  };
  return (
    <div className={`card-lift rounded-2xl border p-6 text-center shadow-sm ${borders[color]}`}>
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-4xl font-extrabold mb-1" style={{ color: '#1e3a5f' }}>{value}</p>
      <p className="text-base text-slate-500">{label}</p>
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
        <h3 className="text-2xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-slate-600 text-base leading-relaxed mb-5">{desc}</p>
        <div className="flex items-center gap-1 text-base font-medium text-slate-500 group-hover:text-slate-900 transition-colors">
          Open {title} <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
