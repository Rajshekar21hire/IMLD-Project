import React, { useState, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Globe, ZoomIn, ZoomOut, RotateCcw, AlertCircle } from 'lucide-react';
import apiClient from '../services/api';

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// ISO-2 code → possible Natural Earth geo property names (multiple variants for robustness)
const ISO_TO_GEO_NAMES: Record<string, string[]> = {
  AE: ['United Arab Emirates'],
  AR: ['Argentina'],
  AT: ['Austria'],
  AU: ['Australia'],
  BA: ['Bosnia and Herz.', 'Bosnia and Herzegovina'],
  BE: ['Belgium'],
  BG: ['Bulgaria'],
  BR: ['Brazil'],
  CA: ['Canada'],
  CH: ['Switzerland'],
  CL: ['Chile'],
  CN: ['China'],
  CO: ['Colombia'],
  CY: ['Cyprus'],
  CZ: ['Czech Rep.', 'Czechia', 'Czech Republic'],
  DE: ['Germany'],
  DK: ['Denmark'],
  EC: ['Ecuador'],
  ES: ['Spain'],
  FI: ['Finland'],
  FR: ['France'],
  GB: ['United Kingdom'],
  HK: ['Hong Kong', 'Hong Kong S.A.R.'],
  HR: ['Croatia'],
  HU: ['Hungary'],
  IL: ['Israel'],
  IN: ['India'],
  IR: ['Iran', 'Iran (Islamic Republic of)'],
  IS: ['Iceland'],
  IT: ['Italy'],
  JP: ['Japan'],
  KR: ['South Korea', 'Korea, Republic of'],
  LT: ['Lithuania'],
  MK: ['North Macedonia', 'N. Macedonia', 'Macedonia'],
  MN: ['Mongolia'],
  MO: ['Macao', 'Macao S.A.R.', 'Macau'],
  MX: ['Mexico'],
  NL: ['Netherlands'],
  NO: ['Norway'],
  NZ: ['New Zealand'],
  PE: ['Peru'],
  PL: ['Poland'],
  PT: ['Portugal'],
  RE: ['Réunion', 'Reunion'],
  RO: ['Romania'],
  RS: ['Serbia'],
  RU: ['Russia', 'Russian Federation'],
  SE: ['Sweden'],
  SG: ['Singapore'],
  SK: ['Slovakia'],
  TH: ['Thailand'],
  TR: ['Turkey', 'Türkiye'],
  TW: ['Taiwan', 'Taiwan (Province of China)'],
  US: ['United States of America', 'United States'],
  VN: ['Vietnam', 'Viet Nam'],
};

// Reverse map: geo name (lowercase) → ISO-2 code (lowercase)
const GEO_TO_ISO = new Map<string, string>();
Object.entries(ISO_TO_GEO_NAMES).forEach(([iso, names]) => {
  names.forEach(name => GEO_TO_ISO.set(name.toLowerCase(), iso.toLowerCase()));
});

interface CountryAQI {
  country: string; // ISO-2 code
  avg_aqi: number;
  record_count: number;
  aqi_category: string;
}

interface Position {
  coordinates: [number, number];
  zoom: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  country: string;
  aqi: number | null;
  category: string;
  records: number;
}

const AQI_BANDS = [
  { max: 50, color: '#22c55e', label: 'Good', range: '0–50' },
  { max: 100, color: '#eab308', label: 'Moderate', range: '51–100' },
  { max: 150, color: '#f97316', label: 'Sensitive Groups', range: '101–150' },
  { max: 200, color: '#ef4444', label: 'Unhealthy', range: '151–200' },
  { max: 300, color: '#a855f7', label: 'Very Unhealthy', range: '201–300' },
  { max: Infinity, color: '#7c3aed', label: 'Hazardous', range: '300+' },
];

const NO_DATA_COLOR = '#334155';
const OCEAN_COLOR = '#0c1a2e';
const BORDER_COLOR = '#0f172a';

function aqiColor(aqi: number | null): string {
  if (aqi === null) return NO_DATA_COLOR;
  return AQI_BANDS.find(b => aqi <= b.max)?.color ?? '#7c3aed';
}

// Keys are lowercase ISO-2 codes
function buildLookup(data: CountryAQI[]): Map<string, CountryAQI> {
  const map = new Map<string, CountryAQI>();
  data.forEach(d => map.set(d.country.trim().toLowerCase(), d));
  return map;
}

// Translate geo name → ISO code → CountryAQI entry
function findCountry(geoName: string, map: Map<string, CountryAQI>): CountryAQI | undefined {
  const iso = GEO_TO_ISO.get(geoName.toLowerCase());
  if (!iso) return undefined;
  return map.get(iso);
}

const DEFAULT_POSITION: Position = { coordinates: [10, 20], zoom: 1 };

export function LiveMapPage() {
  const [countryMap, setCountryMap] = useState<Map<string, CountryAQI>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, country: '', aqi: null, category: '', records: 0,
  });

  useEffect(() => {
    apiClient.get('/data/world-aqi')
      .then(res => {
        if (res.data.success) {
          setCountryMap(buildLookup(res.data.data));
        } else {
          setError('No AQI data returned from server');
        }
      })
      .catch(() => setError('Could not load world AQI data — is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  const stats = React.useMemo(() => {
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

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <Globe className="w-7 h-7 text-blue-400" />
            <h1 className="text-3xl font-bold">Live AQI Map</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Average Air Quality Index per country from historical data.
            Drag to pan &middot; scroll or use buttons to zoom.
          </p>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <StatCard label="Countries Tracked" value={String(stats.count)} />
            <StatCard
              label="Global Avg AQI"
              value={String(stats.avg)}
              color={aqiColor(stats.avg)}
            />
            <StatCard
              label="Cleanest Air"
              value={stats.best.country.toUpperCase()}
              sub={`AQI ${Math.round(stats.best.avg_aqi)}`}
              color="#22c55e"
            />
            <StatCard
              label="Most Polluted"
              value={stats.worst.country.toUpperCase()}
              sub={`AQI ${Math.round(stats.worst.avg_aqi)}`}
              color="#ef4444"
            />
          </div>
        )}

        {/* Map container */}
        <div className="relative bg-slate-800 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
          {loading && <LoadingOverlay />}
          {error && <ErrorMessage message={error} />}

          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
            <MapButton
              icon={<ZoomIn className="w-4 h-4" />}
              onClick={() => setPosition(p => ({ ...p, zoom: Math.min(p.zoom * 1.6, 10) }))}
              title="Zoom in"
            />
            <MapButton
              icon={<ZoomOut className="w-4 h-4" />}
              onClick={() => setPosition(p => ({ ...p, zoom: Math.max(p.zoom / 1.6, 1) }))}
              title="Zoom out"
            />
            <MapButton
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setPosition(DEFAULT_POSITION)}
              title="Reset view"
            />
          </div>

          <ComposableMap
            projection="geoNaturalEarth1"
            projectionConfig={{ scale: 155 }}
            style={{ width: '100%', height: '560px', background: OCEAN_COLOR }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={setPosition}
              maxZoom={10}
              minZoom={1}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies
                    .filter(geo => geo.properties.name !== 'Antarctica')
                    .map(geo => {
                      const match = findCountry(geo.properties.name, countryMap);
                      const fill = aqiColor(match?.avg_aqi ?? null);
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={fill}
                          stroke={BORDER_COLOR}
                          strokeWidth={0.4}
                          style={{
                            default: { outline: 'none' },
                            hover: {
                              fill,
                              filter: 'brightness(1.5)',
                              outline: 'none',
                              cursor: 'pointer',
                            },
                            pressed: { outline: 'none' },
                          }}
                          onMouseEnter={evt => {
                            setTooltip({
                              visible: true,
                              x: evt.clientX,
                              y: evt.clientY,
                              country: geo.properties.name,
                              aqi: match?.avg_aqi ?? null,
                              category: match?.aqi_category ?? 'No data',
                              records: match?.record_count ?? 0,
                            });
                          }}
                          onMouseMove={evt => {
                            setTooltip(prev => ({ ...prev, x: evt.clientX, y: evt.clientY }));
                          }}
                          onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                        />
                      );
                    })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Legend */}
        <div className="mt-4 bg-slate-800 rounded-xl p-4 border border-slate-700">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            AQI Color Scale
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {AQI_BANDS.map(band => (
              <div key={band.label} className="flex items-center gap-1.5">
                <div
                  className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: band.color }}
                />
                <span className="text-xs text-slate-200">{band.range}</span>
                <span className="text-xs text-slate-500">({band.label})</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div
                className="w-3.5 h-3.5 rounded-sm flex-shrink-0"
                style={{ backgroundColor: NO_DATA_COLOR }}
              />
              <span className="text-xs text-slate-400">No data</span>
            </div>
          </div>
        </div>

      </div>

      {/* Floating tooltip */}
      {tooltip.visible && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900/95 backdrop-blur-sm border border-slate-600 rounded-xl shadow-2xl px-3.5 py-2.5"
          style={{ left: tooltip.x + 16, top: tooltip.y - 52 }}
        >
          <p className="text-sm font-semibold text-white mb-0.5">{tooltip.country}</p>
          {tooltip.aqi !== null ? (
            <>
              <p className="text-xs text-slate-300">
                AQI:{' '}
                <span className="font-bold text-base" style={{ color: aqiColor(tooltip.aqi) }}>
                  {Math.round(tooltip.aqi)}
                </span>
              </p>
              <p className="text-xs text-slate-400">{tooltip.category}</p>
              <p className="text-xs text-slate-500 mt-0.5">{tooltip.records.toLocaleString()} records</p>
            </>
          ) : (
            <p className="text-xs text-slate-400">No data available</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold truncate" style={{ color: color ?? 'white' }}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MapButton({ icon, onClick, title }: { icon: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="bg-slate-700/90 hover:bg-slate-600 text-white p-2 rounded-lg shadow transition-colors"
    >
      {icon}
    </button>
  );
}

function LoadingOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 z-10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-400 border-t-transparent mx-auto mb-3" />
        <p className="text-slate-300 text-sm">Loading AQI data...</p>
      </div>
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 z-10">
      <div className="text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-red-300 text-sm">{message}</p>
      </div>
    </div>
  );
}
