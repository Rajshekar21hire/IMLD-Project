import React, { useCallback, useEffect, useState } from 'react';
import { Activity, MapPin, AlertCircle, TrendingUp, RefreshCw } from 'lucide-react';
import { dataAPI } from '../services/api';

interface PollutionReading {
  country: string;
  city: string;
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
  aqi?: number;
  aqi_category?: string;
  measurement_date: string;
  source?: string;
  source_label?: string;
  units?: {
    pm25?: string;
    pm10?: string;
    o3?: string;
    no2?: string;
    so2?: string;
    co?: string;
  };
}

interface AQIHealth {
  level: string;
  color: string;
  bgColor: string;
  advice: string;
  icon: string;
}

const AQI_LEVELS: Record<string, AQIHealth> = {
  Good: {
    level: 'Good (0-50)',
    color: 'text-green-700',
    bgColor: 'bg-green-100 border-green-300',
    advice: 'Air quality is satisfactory. Enjoy outdoor activities!',
    icon: 'OK',
  },
  Moderate: {
    level: 'Moderate (51-100)',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100 border-yellow-300',
    advice: 'Air quality is acceptable. Sensitive people should limit outdoor activities.',
    icon: 'MID',
  },
  'Unhealthy for Sensitive Groups': {
    level: 'Unhealthy for Sensitive Groups (101-150)',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100 border-orange-300',
    advice: 'Sensitive groups should avoid outdoor activities.',
    icon: 'SG',
  },
  Unhealthy: {
    level: 'Unhealthy (151-200)',
    color: 'text-red-700',
    bgColor: 'bg-red-100 border-red-300',
    advice: 'Everyone should limit outdoor activities.',
    icon: 'UNH',
  },
  'Very Unhealthy': {
    level: 'Very Unhealthy (201-300)',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100 border-purple-300',
    advice: 'Avoid outdoor activities. Indoor air filters recommended.',
    icon: 'VU',
  },
  Hazardous: {
    level: 'Hazardous (301+)',
    color: 'text-gray-700',
    bgColor: 'bg-gray-300 border-gray-400',
    advice: 'Stay indoors and keep activity levels low.',
    icon: 'HZD',
  },
  Unknown: {
    level: 'Unknown',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100 border-gray-300',
    advice: 'Data not available',
    icon: '?',
  },
};

export const RealtimePollutionPage: React.FC = () => {
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [readings, setReadings] = useState<PollutionReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sortBy, setSortBy] = useState<'aqi' | 'pm25' | 'pm10' | 'city'>('aqi');
  const [sourceLabel, setSourceLabel] = useState('Live Open-Meteo readings');

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await dataAPI.getCountries();
        if (response.data.success) {
          setCountries(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching countries:', err);
      }
    };

    void fetchCountries();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      if (!selectedCountry) {
        setCities([]);
        setSelectedCities([]);
        return;
      }

      try {
        const response = await dataAPI.getCities(selectedCountry);
        if (response.data.success) {
          setCities(response.data.data);
          setSelectedCities([]);
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    };

    void fetchCities();
  }, [selectedCountry]);

  const filteredCities = selectedCountry
    ? cities.filter((c) => c.country === selectedCountry).map((c) => c.city)
    : [];

  const toggleCity = (city: string) => {
    setSelectedCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  const loadReadings = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await dataAPI.getLiveReadings({
        country: selectedCountry || undefined,
        cities: selectedCities.length > 0 ? selectedCities.join(',') : undefined,
      });

      if (!response.data.success) {
        setError(response.data.error || 'Failed to load live readings');
        setReadings([]);
        return;
      }

      const liveReadings = (response.data.data as PollutionReading[]).slice();

      liveReadings.sort((a, b) => {
        if (sortBy === 'city') {
          return a.city.localeCompare(b.city);
        }

        const valueA = (a[sortBy] as number | undefined) ?? 0;
        const valueB = (b[sortBy] as number | undefined) ?? 0;
        return valueB - valueA;
      });

      setReadings(liveReadings);
      setSourceLabel(response.data.source || 'Live Open-Meteo readings');
      setLastUpdate(
        response.data.generated_at ? new Date(response.data.generated_at) : new Date()
      );

      if (Array.isArray(response.data.warnings) && response.data.warnings.length > 0) {
        console.warn('Live data warnings:', response.data.warnings);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Error loading live readings');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry, selectedCities, sortBy]);

  useEffect(() => {
    void loadReadings();
  }, [loadReadings]);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      void loadReadings();
    }, 60000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadReadings]);

  const getAQIHealth = (category?: string): AQIHealth => {
    return AQI_LEVELS[category || 'Unknown'] || AQI_LEVELS.Unknown;
  };

  const formatUnits = (reading: PollutionReading, key: keyof NonNullable<PollutionReading['units']>, fallback: string) => {
    return reading.units?.[key] || fallback;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Real-Time Pollution Dashboard</h1>
          </div>
          <p className="text-blue-100">Live air quality readings for selected locations</p>
          {lastUpdate && (
            <p className="text-sm text-blue-200 mt-2">
              Last updated: {lastUpdate.toLocaleString()}
            </p>
          )}
          <p className="text-sm text-blue-200 mt-1">Source: {sourceLabel}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="aqi">AQI (Highest)</option>
                <option value="pm25">PM2.5 (Highest)</option>
                <option value="pm10">PM10 (Highest)</option>
                <option value="city">City Name (A-Z)</option>
              </select>
            </div>
          </div>

          {selectedCountry && filteredCities.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Cities to Display (Leave empty for all)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {filteredCities.map((city) => (
                  <button
                    key={city}
                    onClick={() => toggleCity(city)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedCities.includes(city)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={loadReadings}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} />
              {loading ? 'Loading...' : 'Load Data'}
            </button>

            <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Auto-refresh (60s)</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start gap-3">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Error Loading Data</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {readings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readings.map((reading, idx) => {
              const health = getAQIHealth(reading.aqi_category);
              return (
                <div
                  key={`${reading.city}-${reading.country}-${idx}`}
                  className={`rounded-lg shadow-md border-2 overflow-hidden transition-transform hover:scale-105 ${health.bgColor}`}
                >
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-bold">{reading.city}</h3>
                        <p className="text-sm text-blue-100">{reading.country}</p>
                      </div>
                      <span className="text-sm font-bold bg-white/20 px-2 py-1 rounded">
                        {health.icon}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    {reading.aqi !== undefined && (
                      <div className="mb-4 pb-4 border-b border-gray-300">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700">AQI</span>
                          <span className={`text-2xl font-bold ${health.color}`}>
                            {reading.aqi.toFixed(0)}
                          </span>
                        </div>
                        <p className={`text-xs font-medium ${health.color}`}>{health.level}</p>
                      </div>
                    )}

                    <div className="mb-4 p-3 bg-white bg-opacity-60 rounded-lg">
                      <p className="text-xs text-gray-700">
                        <span className="font-semibold">Health Advisory:</span> {health.advice}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        {
                          label: 'PM2.5',
                          value: reading.pm25,
                          unit: formatUnits(reading, 'pm25', 'ug/m3'),
                        },
                        {
                          label: 'PM10',
                          value: reading.pm10,
                          unit: formatUnits(reading, 'pm10', 'ug/m3'),
                        },
                        { label: 'O3', value: reading.o3, unit: formatUnits(reading, 'o3', 'ug/m3') },
                        {
                          label: 'NO2',
                          value: reading.no2,
                          unit: formatUnits(reading, 'no2', 'ug/m3'),
                        },
                        {
                          label: 'SO2',
                          value: reading.so2,
                          unit: formatUnits(reading, 'so2', 'ug/m3'),
                        },
                        { label: 'CO', value: reading.co, unit: formatUnits(reading, 'co', 'mg/m3') },
                      ].map((pollutant) => (
                        <div key={pollutant.label} className="bg-white bg-opacity-70 p-2 rounded">
                          <p className="text-xs font-semibold text-gray-600">{pollutant.label}</p>
                          <p className="text-sm font-bold text-gray-800">
                            {pollutant.value !== undefined && pollutant.value !== null
                              ? `${pollutant.value.toFixed(1)} ${pollutant.unit}`
                              : 'N/A'}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <TrendingUp size={14} />
                      <span>Updated: {new Date(reading.measurement_date).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          !loading && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 text-lg">
                {selectedCountry
                  ? 'Select cities or click "Load Data" to view live pollution readings'
                  : 'Click "Load Data" to view live readings for all available locations'}
              </p>
            </div>
          )
        )}

        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">AQI Scale Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(AQI_LEVELS).map(([key, health]) => (
              <div key={key} className="flex items-center gap-3">
                <span className="text-3xl">{health.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800">{key}</p>
                  <p className="text-xs text-gray-600">{health.level}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
