import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Database,
  Download,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { dataAPI } from '../services/api';
import AirParticlesBackground from '../components/AirParticlesBackground';

interface AnalyticsPageProps {}

interface DataPoint {
  date: string;
  pm25?: number;
  pm10?: number;
  o3?: number;
  no2?: number;
  so2?: number;
  co?: number;
  aqi?: number;
}

interface Statistics {
  min: number;
  max: number;
  avg: number;
  count: number;
}

interface AnalyticsSummaryResult {
  provider: string;
  model: string;
  filters: {
    country: string | null;
    city: string | null;
    pollution_type: string;
    selected_pollutants: string[];
    compare_mode: boolean;
    days: number | null;
    start_date: string | null;
    end_date: string | null;
  };
  record_count: number;
  summary: {
    summary: string;
    highlights: string[];
    risks: string[];
    recommendations: string[];
    overall_assessment: string;
  };
}

type TimeUnit = 'days' | 'months' | 'years';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const pollutionTypes = [
  { value: 'aqi', label: 'Air Quality Index (AQI)' },
  { value: 'pm25', label: 'PM2.5 (Fine Particulate)' },
  { value: 'pm10', label: 'PM10 (Coarse Particulate)' },
  { value: 'o3', label: 'Ozone (O3)' },
  { value: 'no2', label: 'Nitrogen Dioxide (NO2)' },
  { value: 'so2', label: 'Sulfur Dioxide (SO2)' },
  { value: 'co', label: 'Carbon Monoxide (CO)' },
];

const chartTypes = [
  { value: 'line', label: 'Line Chart' },
  { value: 'area', label: 'Area Chart' },
  { value: 'bar', label: 'Bar Chart' },
];

const timePeriodOptions: Record<TimeUnit, number[]> = {
  days: [7, 14, 30, 60, 90],
  months: [1, 3, 6, 12],
  years: [1, 2, 3, 5],
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = () => {
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedPollution, setSelectedPollution] = useState('aqi');
  const [timeUnit, setTimeUnit] = useState<TimeUnit>('days');
  const [timeValue, setTimeValue] = useState<number>(30);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [trendData, setTrendData] = useState<DataPoint[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [aqiDistribution, setAqiDistribution] = useState<Record<string, number>>({});
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedPollutants, setSelectedPollutants] = useState<string[]>(['aqi']);

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

    fetchCountries();
  }, []);

  useEffect(() => {
    const fetchCities = async () => {
      if (!selectedCountry) {
        setCities([]);
        setSelectedCity('');
        return;
      }

      try {
        const response = await dataAPI.getCities(selectedCountry);
        if (response.data.success) {
          setCities(response.data.data);
          setSelectedCity('');
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    };

    fetchCities();
  }, [selectedCountry]);

  const filteredCities = selectedCountry
    ? cities.filter((c) => c.country === selectedCountry).map((c) => c.city)
    : [];

  const selectedPollutantsForSummary = compareMode
    ? (selectedPollutants.length > 0 ? selectedPollutants : [selectedPollution])
    : [selectedPollution];

  useEffect(() => {
    const allowedValues = timePeriodOptions[timeUnit];
    if (!allowedValues.includes(timeValue)) {
      setTimeValue(allowedValues[0]);
    }
  }, [timeUnit, timeValue]);

  const getSelectedPeriodLabel = () => `${timeValue} ${timeUnit}`;

  const handleLoadData = async () => {
    setLoading(true);
    setSummaryLoading(true);
    setError('');
    setSummaryError('');

    const params = {
      country: selectedCountry || '',
      city: selectedCity || '',
      pollution_type: selectedPollution,
      days: timeUnit === 'days' ? timeValue.toString() : '',
      period_unit: timeUnit,
      period_value: timeValue.toString(),
    };

    const summaryPayload = {
      ...params,
      compare_mode: compareMode,
      selected_pollutants: selectedPollutantsForSummary,
    };

    try {
      const [statsResult, summaryResult] = await Promise.allSettled([
        dataAPI.getStatistics(params),
        dataAPI.generateAnalyticsSummary(summaryPayload),
      ]);

      if (statsResult.status === 'fulfilled') {
        const data = statsResult.value.data;
        if (data.success) {
          const trends = data.trends || {};
          const transformedData: DataPoint[] = Object.entries(trends).map(
            ([date, values]: [string, any]) => ({
              date: date.slice(-5),
              ...values,
            })
          );

          setTrendData(transformedData.slice(-30));
          setStatistics(data.statistics);
          setAqiDistribution(data.aqi_distribution || {});
        } else {
          setTrendData([]);
          setStatistics(null);
          setAqiDistribution({});
          setError(data.error || 'Failed to load data');
        }
      } else {
        setTrendData([]);
        setStatistics(null);
        setAqiDistribution({});
        setError(statsResult.reason?.message || 'Error loading data');
      }

      if (summaryResult.status === 'fulfilled') {
        const data = summaryResult.value.data;
        if (data.success) {
          setAnalyticsSummary(data.data);
        } else {
          setAnalyticsSummary(null);
          setSummaryError(data.error || 'Failed to generate summary');
        }
      } else {
        setAnalyticsSummary(null);
        setSummaryError(summaryResult.reason?.message || 'Error generating summary');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading analytics');
    } finally {
      setLoading(false);
      setSummaryLoading(false);
    }
  };

  const togglePollutant = (pollutant: string) => {
    setSelectedPollutants((prev) => {
      if (prev.includes(pollutant)) {
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((item) => item !== pollutant);
      }

      return [...prev, pollutant];
    });
  };

  const aqiDistributionData = Object.entries(aqiDistribution).map(([category, count]) => ({
    name: category,
    value: count as number,
  }));

  const renderChart = () => {
    if (trendData.length === 0) return null;

    const ChartComponent = {
      line: LineChart,
      area: AreaChart,
      bar: BarChart,
    }[chartType] as any;

    const DataComponent = {
      line: Line,
      area: Area,
      bar: Bar,
    }[chartType] as any;

    return (
      <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">
              {selectedCity || selectedCountry || 'Global'} - {selectedPollution.toUpperCase()} Trends
            </h3>
            <p className="text-sm text-slate-500">
              Trend view from the filtered CSV-backed database
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={400}>
          <ChartComponent data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {compareMode ? (
              selectedPollutantsForSummary.map((pollutant, idx) => (
                <DataComponent
                  key={pollutant}
                  type="monotone"
                  dataKey={pollutant}
                  stroke={COLORS[idx % COLORS.length]}
                  fill={COLORS[idx % COLORS.length]}
                />
              ))
            ) : (
              <DataComponent
                type="monotone"
                dataKey={selectedPollution}
                stroke="#2563eb"
                fill="#2563eb"
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent">
      <AirParticlesBackground />
      <div className="border-b border-blue-700 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-7">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-sky-300" />
            <div>
              <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
              <p className="text-sky-100 mt-1">
                Filter the CSV-backed air-quality dataset, generate an Ollama summary, and review the charts below.
              </p>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-sky-100">
            <Database className="w-4 h-4" />
            Source: waqi-airquality-master-dataset.csv loaded into the database on startup
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Filters & Options</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!selectedCountry}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">All Cities</option>
                {filteredCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Pollution Type</label>
              <select
                value={selectedPollution}
                onChange={(e) => {
                  setSelectedPollution(e.target.value);
                  setSelectedPollutants([e.target.value]);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {pollutionTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Time Period</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value as TimeUnit)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="days">Days</option>
                  <option value="months">Months</option>
                  <option value="years">Years</option>
                </select>

                <select
                  value={timeValue}
                  onChange={(e) => setTimeValue(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {timePeriodOptions[timeUnit].map((value) => (
                    <option key={value} value={value}>
                      {value} {timeUnit}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Chart Type</label>
              <div className="flex flex-wrap gap-2">
                {chartTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setChartType(type.value as any)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      chartType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compareMode}
                  onChange={(e) => setCompareMode(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm font-medium text-slate-700">Compare multiple pollutants</span>
              </label>
            </div>
          </div>

          {compareMode && (
            <div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-sm font-medium text-slate-700 mb-3">Select pollutants to compare:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {pollutionTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => togglePollutant(type.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedPollutants.includes(type.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button
              onClick={handleLoadData}
              disabled={loading || summaryLoading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading || summaryLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Running analysis...
                </>
              ) : (
                'Load Charts & Ollama Summary'
              )}
            </button>
            <p className="text-xs text-slate-500">
              This runs the same filter set against the database and asks Ollama to summarize the selected rows.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {summaryError && !analyticsSummary && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 mt-0.5" />
            <span>{summaryError}</span>
          </div>
        )}

        {analyticsSummary && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <Sparkles className="w-6 h-6 text-sky-300" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-sky-200">
                      Ollama summary for selected data
                    </p>
                    <h3 className="text-2xl font-bold">
                      {selectedCity || selectedCountry || 'Global'} analysis
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-sky-200 mb-3">
                  Time window: {getSelectedPeriodLabel()}
                </p>

                <p className="text-base leading-7 text-slate-100">
                  {analyticsSummary.summary.summary}
                </p>
              </div>

              <div className="lg:w-72 rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-sm font-semibold text-sky-100 mb-2">Model details</p>
                <div className="space-y-2 text-sm text-slate-100">
                  <p>
                    <span className="text-sky-200">Provider:</span> {analyticsSummary.provider}
                  </p>
                  <p>
                    <span className="text-sky-200">Model:</span> {analyticsSummary.model}
                  </p>
                  <p>
                    <span className="text-sky-200">Records:</span> {analyticsSummary.record_count}
                  </p>
                  <p>
                    <span className="text-sky-200">Assessment:</span> {analyticsSummary.summary.overall_assessment}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200 mb-2">Highlights</p>
                <ul className="space-y-2 text-sm text-slate-100">
                  {analyticsSummary.summary.highlights.map((item) => (
                    <li key={item} className="leading-6">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200 mb-2">Risks</p>
                <ul className="space-y-2 text-sm text-slate-100">
                  {analyticsSummary.summary.risks.map((item) => (
                    <li key={item} className="leading-6">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-white/10 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-sky-200 mb-2">Recommendations</p>
                <ul className="space-y-2 text-sm text-slate-100">
                  {analyticsSummary.summary.recommendations.map((item) => (
                    <li key={item} className="leading-6">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {summaryLoading && !analyticsSummary && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
            <div className="flex items-center gap-3 text-slate-700">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <p>Generating the Ollama summary for the selected CSV data...</p>
            </div>
          </div>
        )}

        {trendData.length > 0 ? (
          <>
            {renderChart()}

            {statistics && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm font-medium">Average</p>
                  <p className="text-3xl font-bold text-blue-600">{statistics.avg.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm font-medium">Minimum</p>
                  <p className="text-3xl font-bold text-emerald-600">{statistics.min.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm font-medium">Maximum</p>
                  <p className="text-3xl font-bold text-rose-600">{statistics.max.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                  <p className="text-slate-600 text-sm font-medium">Data Points</p>
                  <p className="text-3xl font-bold text-violet-600">{statistics.count}</p>
                </div>
              </div>
            )}

            {Object.keys(aqiDistribution).length > 0 && (
              <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 mb-6">
                <h3 className="text-xl font-bold text-slate-900 mb-4">AQI Category Distribution</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={aqiDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {aqiDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-2">
                    {aqiDistributionData.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="font-medium text-slate-700">{item.name}</span>
                        <span className="ml-auto text-slate-600">{item.value} readings</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                const csv = [
                  ['Date', selectedPollution.toUpperCase()],
                  ...trendData.map((d) => [d.date, d[selectedPollution as keyof DataPoint] || '']),
                ]
                  .map((row) => row.join(','))
                  .join('\n');

                const blob = new Blob([csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-${selectedPollution}-${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              <Download size={20} />
              Export Data (CSV)
            </button>
          </>
        ) : (
          !loading && (
            <div className="text-center py-12 bg-white rounded-2xl shadow-md border border-slate-200">
              <p className="text-slate-600 text-lg">Load data to view analytics, the Ollama summary, and charts</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
