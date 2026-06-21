import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, BookOpen, Bot, Copy, Globe, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import { storyAPI, dataAPI } from '../services/api';
import { storyModes, storyThemes, StoryMode, StoryTheme, StorySection } from '../data/storyThemes';
import { pollutantTrendData, pollutantColors, pollutantLabels } from '../data/pollutantTrendsData';

interface CityRankingRecord {
  rank: number;
  city: string;
  country: string;
  avg_pm25: number;
  sample_count: number;
}

interface CityRankingResult {
  headline: string;
  summary: string;
  insights: string[];
  recommendations: string[];
  ranking_type: 'best' | 'worst' | 'both';
  count: number;
  provider: string;
  worst_cities: CityRankingRecord[];
  best_cities: CityRankingRecord[];
}

interface CityDetailsResult {
  city: string;
  country: string;
  sample_count: number;
  aqi_avg: number | null;
  geo: {
    latitude: number | null;
    longitude: number | null;
  };
  pollutant_breakdown?: Array<{
    key: string;
    name: string;
    value: number;
  }>;
  top_pollutants: Array<{
    key: string;
    name: string;
    value: number;
  }>;
  reasons: string[];
  problems: string[];
  precautions: string[];
  provider: string;
}

const formatRankingRowLabel = (row: CityRankingRecord) => `${row.city}, ${row.country}`;

const buildPrompt = (theme: StoryTheme, mode: StoryMode, sections: StorySection[]) => {
  const sectionTitles = sections.length
    ? sections.map((section) => section.title).join(', ')
    : 'No source sections provided yet';

  return [
    `You are an AI storytelling agent.`,
    `Theme: ${theme.title}`,
    `Mode: ${mode === 'human' ? 'Human-curated source story' : 'AI/Ollama-generated story'}`,
    `Prompt focus: ${theme.promptFocus}`,
    `Subtopics to cover: ${sectionTitles}`,
    'Write in a clear, accessible, story-first style with short sections, strong transitions, and factual grounding.',
    'Keep the narrative aligned with the same theme and subtopic structure.',
    'Do not copy the human story wording; rewrite it in a fresh voice with different examples and transitions.',
  ].join('\n');
};

export const DashboardPage: React.FC = () => {
  const standardPm25Value = 5;
  const [selectedThemeId, setSelectedThemeId] = useState(storyThemes[0].id);
  const [selectedMode, setSelectedMode] = useState<StoryMode>('human');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [aiStories, setAiStories] = useState<Record<string, { title: string; summary: string; sections: StorySection[]; provider?: string }>>({});
  const [humanizedStories, setHumanizedStories] = useState<Record<string, { title: string; summary: string; sections: StorySection[]; provider?: string }>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [humanizeLoading, setHumanizeLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState('');
  const [humanizeError, setHumanizeError] = useState('');
  const [rankingCount, setRankingCount] = useState(5);
  const [rankingType, setRankingType] = useState<'best' | 'worst' | 'both'>('worst');
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState('');
  const [rankingResult, setRankingResult] = useState<CityRankingResult | null>(null);
  const [selectedCityLabel, setSelectedCityLabel] = useState('');
  const [selectedCityBucket, setSelectedCityBucket] = useState<'best' | 'worst' | null>(null);
  const [cityDetails, setCityDetails] = useState<CityDetailsResult | null>(null);
  const [cityDetailsLoading, setCityDetailsLoading] = useState(false);
  const [cityDetailsError, setCityDetailsError] = useState('');
  const [yearlyTrends, setYearlyTrends] = useState<any | null>(null);
  const [selectedTrendPollutant, setSelectedTrendPollutant] = useState<'pm25' | 'pm10' | 'o3' | 'no2' | 'so2' | 'co'>('pm25');
  const [inequalityLens, setInequalityLens] = useState<'geography' | 'exposure'>('geography');

  const selectedTheme = useMemo(
    () => storyThemes.find((theme) => theme.id === selectedThemeId) ?? storyThemes[0],
    [selectedThemeId]
  );

  const selectedAiStory = aiStories[selectedTheme.id];
  const selectedHumanizedStory = humanizedStories[selectedTheme.id];
  const activeSections = useMemo(
    () => {
      if (selectedMode === 'human') {
        return selectedTheme.humanSections;
      }
      // Prefer humanized story if available, otherwise use raw AI story
      const displayStory = selectedHumanizedStory || selectedAiStory;
      return displayStory?.sections || [];
    },
    [selectedTheme, selectedMode, selectedAiStory, selectedHumanizedStory]
  );
  const aiGenerationSections = useMemo(() => {
    if (selectedTheme.id === 'pollution-and-health') {
      return selectedTheme.humanSections.filter((section) => section.label !== 'live-map');
    }
    return selectedTheme.humanSections;
  }, [selectedTheme]);

  const promptText = buildPrompt(
    selectedTheme,
    selectedMode,
    selectedMode === 'ai' ? aiGenerationSections : selectedTheme.humanSections
  );
  const isStoryThreeAiView = selectedTheme.id === 'aqi-and-decisions' && selectedMode === 'ai';
  const isPollutionHealthAiView = selectedTheme.id === 'pollution-and-health' && selectedMode === 'ai';

  const trendOptions = [
    { key: 'pm25', label: 'PM2.5' },
    { key: 'pm10', label: 'PM10' },
    { key: 'o3', label: 'Ozone' },
    { key: 'no2', label: 'NO2' },
    { key: 'so2', label: 'SO2' },
    { key: 'co', label: 'CO' },
  ] as const;

  const trendChartData = useMemo(() => {
    if (!yearlyTrends?.years) return [];
    return yearlyTrends.years.map((year:any, index:number) => ({
      year,
      pm25: yearlyTrends.pm25[index],
      pm10: yearlyTrends.pm10[index],
      o3: yearlyTrends.o3[index],
      no2: yearlyTrends.no2[index],
      so2: yearlyTrends.so2[index],
      co: yearlyTrends.co[index],
    }));
  }, [yearlyTrends]);

  const inequalityBarData = useMemo(() => {
    return [
      { name: 'Geography gap', value: 70 },
      { name: 'Exposure gap', value: 30 },
    ];
  }, []);

  const inequalityTable = useMemo(() => {
    if (inequalityLens === 'geography') {
      return [
        { label: 'Primary driver', value: 'Between-country gap (~70% of global inequality)' },
        { label: 'Highest exposure zone', value: 'Central & South Asia + Sub-Saharan Africa' },
        { label: 'Lowest exposure zone', value: 'Iceland, Australia, Estonia, New Zealand' },
      ];
    }

    return [
      { label: 'Primary driver', value: 'Income, neighbourhood siting, and local sources' },
      { label: 'Highest exposure zone', value: 'Low-income/minority neighbourhoods near roads and industry' },
      { label: 'Lowest exposure zone', value: 'High-income, majority-white suburban/rural areas' },
    ];
  }, [inequalityLens]);

  const activeRankingRows = useMemo(() => {
    if (!rankingResult) {
      return [] as Array<CityRankingRecord & { label: string }>;
    }

    const sourceRows =
      rankingType === 'best'
        ? rankingResult.best_cities
        : rankingType === 'worst'
        ? rankingResult.worst_cities
        : rankingResult.worst_cities;

    return sourceRows.map((row) => ({
      ...row,
      label: formatRankingRowLabel(row),
      standard_pm25: standardPm25Value,
    }));
  }, [rankingResult, rankingType, standardPm25Value]);

  const worstRankingRows = useMemo(() => {
    if (!rankingResult) {
      return [] as Array<CityRankingRecord & { label: string; standard_pm25: number }>;
    }

    return rankingResult.worst_cities.map((row) => ({
      ...row,
      label: formatRankingRowLabel(row),
      standard_pm25: standardPm25Value,
    }));
  }, [rankingResult, standardPm25Value]);

  const bestRankingRows = useMemo(() => {
    if (!rankingResult) {
      return [] as Array<CityRankingRecord & { label: string; standard_pm25: number }>;
    }

    return rankingResult.best_cities.map((row) => ({
      ...row,
      label: formatRankingRowLabel(row),
      standard_pm25: standardPm25Value,
    }));
  }, [rankingResult, standardPm25Value]);

  const generateAiStory = useCallback(async () => {
    if (selectedTheme.status !== 'ready') {
      setAiError('This theme is waiting for source story content before AI generation is enabled.');
      return;
    }

    setAiLoading(true);
    setAiError('');

    try {
      const response = await storyAPI.generateThemeStory({
        mode: 'ai',
        theme: {
          id: selectedTheme.id,
          title: selectedTheme.title,
          overview: selectedTheme.overview,
          promptFocus: selectedTheme.promptFocus,
          sections: aiGenerationSections,
        },
      });

      if (response.data?.success) {
        const story = response.data.data.story;
        setAiStories((current) => ({
          ...current,
          [selectedTheme.id]: {
            title: story.title || selectedTheme.title,
            summary: story.summary || selectedTheme.overview,
            sections: story.sections || selectedTheme.humanSections,
            provider: response.data.data.provider,
          },
        }));
        setAiRequested((current) => ({
          ...current,
          [selectedTheme.id]: true,
        }));
      } else {
        throw new Error(response.data?.error || 'Failed to generate AI story');
      }
    } catch (error: any) {
      setAiError(error.response?.data?.error || error.message || 'Failed to generate AI story');
    } finally {
      setAiLoading(false);
    }
  }, [selectedTheme, aiGenerationSections]);

  const humanizeAiStory = useCallback(async () => {
    if (!selectedAiStory) {
      setHumanizeError('No AI story generated yet. Generate one first.');
      return;
    }

    setHumanizeLoading(true);
    setHumanizeError('');

    try {
      const response = await storyAPI.humanizeStory({
        story: selectedAiStory,
        theme: {
          id: selectedTheme.id,
          title: selectedTheme.title,
          overview: selectedTheme.overview,
          promptFocus: selectedTheme.promptFocus,
        },
      });

      if (response.data?.success) {
        const story = response.data.data.story;
        setHumanizedStories((current) => ({
          ...current,
          [selectedTheme.id]: {
            title: story.title || selectedTheme.title,
            summary: story.summary || selectedTheme.overview,
            sections: story.sections || selectedAiStory.sections,
            provider: response.data.data.provider,
          },
        }));
      } else {
        throw new Error(response.data?.error || 'Failed to humanize story');
      }
    } catch (error: any) {
      setHumanizeError(error.response?.data?.error || error.message || 'Failed to humanize story');
    } finally {
      setHumanizeLoading(false);
    }
  }, [selectedTheme, selectedAiStory]);

  const generateCityRankings = useCallback(async () => {
    setRankingLoading(true);
    setRankingError('');
    setSelectedCityLabel('');
    setSelectedCityBucket(null);
    setCityDetails(null);
    setCityDetailsError('');

    try {
      const response = await storyAPI.generateCityRankings({
        count: rankingCount,
        ranking_type: rankingType,
      });

      if (response.data?.success) {
        setRankingResult(response.data.data as CityRankingResult);
      } else {
        throw new Error(response.data?.error || 'Failed to generate city rankings');
      }
    } catch (error: any) {
      setRankingError(error.response?.data?.error || error.message || 'Failed to generate city rankings');
      setRankingResult(null);
    } finally {
      setRankingLoading(false);
    }
  }, [rankingCount, rankingType]);

  const loadCityDetails = useCallback(async (row: CityRankingRecord, bucket: 'best' | 'worst') => {
    setSelectedCityLabel(formatRankingRowLabel(row));
    setSelectedCityBucket(bucket);
    setCityDetailsLoading(true);
    setCityDetailsError('');

    try {
      const response = await storyAPI.getCityDetails({
        city: row.city,
        country: row.country,
      });

      if (response.data?.success) {
        setCityDetails(response.data.data as CityDetailsResult);
      } else {
        throw new Error(response.data?.error || 'Failed to load city details');
      }
    } catch (error: any) {
      setCityDetails(null);
      setCityDetailsError(error.response?.data?.error || error.message || 'Failed to load city details');
    } finally {
      setCityDetailsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedMode === 'ai' && selectedTheme.status === 'ready' && aiRequested[selectedTheme.id] && !selectedAiStory && !aiLoading) {
      generateAiStory();
    }
  }, [selectedMode, selectedThemeId, selectedTheme.id, selectedTheme.status, selectedAiStory, aiLoading, generateAiStory, aiRequested]);

  useEffect(() => {
    setRankingError('');
    setSelectedCityLabel('');
    setSelectedCityBucket(null);
    setCityDetails(null);
    setCityDetailsError('');
  }, [selectedThemeId, selectedMode]);

  useEffect(() => {
    // Fetch analytics only for the pollution-and-health theme
    const fetchAnalytics = async () => {
      if (selectedTheme.id !== 'pollution-and-health') return;
      try {
        const trendsResp = await dataAPI.getYearlyTrends({ start_year: 2015, end_year: 2026 });
        setYearlyTrends(trendsResp.data?.data || trendsResp.data || null);
      } catch (e) {
        console.error('Analytics fetch failed', e);
      }
    };

    fetchAnalytics();
  }, [selectedTheme.id]);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 1500);
    } catch (error) {
      console.error('Failed to copy prompt:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(180deg,_#0f172a_0%,_#111827_45%,_#f8fafc_45%,_#f8fafc_100%)]">
      <div className="max-w-7xl mx-auto px-4 py-10 lg:py-14">
        <div className="rounded-3xl bg-slate-950/90 text-white border border-white/10 shadow-2xl overflow-hidden">
          <div className="p-6 md:p-10 border-b border-white/10 bg-gradient-to-r from-sky-950 via-slate-950 to-indigo-950">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold tracking-wide text-sky-100">
                  <Sparkles className="w-4 h-4" />
                  Theme-based storytelling dashboard
                </div>
                <h1 className="mt-5 text-4xl md:text-5xl font-black tracking-tight">
                  Story studio for human and AI-generated air narratives
                </h1>
                <p className="mt-4 text-base md:text-lg text-slate-300 leading-relaxed">
                  Choose one of the four story themes, switch between the human version and the AI/Olamala version,
                  and drill into subtopics that keep the same subject structure across both modes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm min-w-[260px]">
                <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                  <div className="text-slate-300">Themes</div>
                  <div className="text-3xl font-bold mt-1">{storyThemes.length}</div>
                </div>
                <div className="rounded-2xl bg-white/10 p-4 border border-white/10">
                  <div className="text-slate-300">Modes</div>
                  <div className="text-3xl font-bold mt-1">{storyModes.length}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10 bg-slate-50 text-slate-900">
            <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
              <aside className="space-y-6">
                <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                    <Layers className="w-5 h-5 text-sky-600" />
                    Story themes
                  </div>
                  <div className="mt-4 space-y-3">
                    {storyThemes.map((theme) => {
                      const active = theme.id === selectedThemeId;

                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedThemeId(theme.id)}
                          className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${
                            active
                              ? 'border-sky-500 bg-sky-50 shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                                {theme.badge}
                              </div>
                              <div className="mt-1 font-bold text-slate-900">{theme.title}</div>
                            </div>
                            <div className={`mt-1 h-3 w-3 rounded-full ${active ? 'bg-sky-500' : 'bg-slate-300'}`} />
                          </div>
                          <p className="mt-2 text-sm text-slate-600">{theme.shortDescription}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl bg-slate-950 text-white p-5 shadow-lg">
                  <div className="flex items-center gap-2 font-bold text-lg">
                    <BookOpen className="w-5 h-5 text-sky-300" />
                    AI prompt
                  </div>
                  <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                    This is the prompt you can send to your AI agent to generate a similar story for the same theme
                    and subtopic structure.
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {copyState === 'copied' ? 'Prompt copied' : 'Copy prompt'}
                  </button>
                  <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-white/5 p-4 text-xs leading-6 text-slate-200 border border-white/10">
                    {promptText}
                  </pre>
                </div>
              </aside>

              <main className="space-y-6">
                <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl">
                      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
                        {selectedTheme.badge}
                      </div>
                      <h2 className="mt-4 text-3xl font-black text-slate-950">{selectedTheme.title}</h2>
                      <p className="mt-3 text-slate-600 leading-relaxed">
                        {selectedTheme.status === 'awaiting-source'
                          ? 'This theme is waiting for the story text you will send next.'
                          : selectedMode === 'human'
                          ? selectedTheme.overview
                          : selectedHumanizedStory?.summary || selectedAiStory?.summary || selectedTheme.overview}
                      </p>
                      {selectedMode === 'ai' && selectedTheme.status === 'ready' && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          <span className={`rounded-full px-3 py-1 font-semibold border ${selectedHumanizedStory ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                            {selectedHumanizedStory ? 'Humanized' : 'Raw'} by {selectedHumanizedStory?.provider || selectedAiStory?.provider || 'Ollama'}
                          </span>
                          <button
                            type="button"
                            onClick={generateAiStory}
                            disabled={aiLoading}
                            className="rounded-full bg-slate-950 px-3 py-1 font-semibold text-white disabled:opacity-60"
                          >
                            {aiLoading ? 'Generating...' : selectedAiStory ? 'Regenerate story' : 'Generate AI story'}
                          </button>
                          {selectedAiStory && (
                            <button
                              type="button"
                              onClick={humanizeAiStory}
                              disabled={humanizeLoading}
                              className="rounded-full bg-blue-600 px-3 py-1 font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                            >
                              {humanizeLoading ? 'Humanizing...' : 'Humanize AI'}
                            </button>
                          )}
                        </div>
                      )}
                      {(aiError || humanizeError) && selectedMode === 'ai' && (
                        <div className="mt-3 space-y-2">
                          {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                          {humanizeError && <p className="text-sm text-red-600">{humanizeError}</p>}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
                      <div className="grid grid-cols-2 gap-2">
                        {storyModes.map((mode) => {
                          const active = mode.id === selectedMode;

                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setSelectedMode(mode.id)}
                              className={`rounded-xl px-4 py-3 text-left transition-all ${
                                active
                                  ? 'bg-slate-950 text-white shadow-md'
                                  : 'bg-transparent text-slate-600 hover:bg-white'
                              }`}
                            >
                              <div className="font-semibold">{mode.label}</div>
                              <div className={`mt-1 text-xs leading-4 ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                                {mode.description}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`grid grid-cols-1 gap-5 ${selectedTheme.id === 'pollution-and-health' && selectedMode === 'ai' ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                  {activeSections.map((section, index) => (
                    <article
                      key={`${selectedTheme.id}-${selectedMode}-${section.title}`}
                      className={`rounded-3xl bg-white border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow ${
                        selectedTheme.id === 'pollution-and-health' && activeSections.length === 3 && index === 2 ? 'md:col-span-2' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                            Subtopic {index + 1}
                          </div>
                          <h3 className="mt-2 text-xl font-bold text-slate-950">{section.title}</h3>
                        </div>
                        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                          {selectedMode === 'human' ? 'Human story' : 'AI/Ollama story'}
                        </div>
                      </div>

                      <p className="mt-4 text-slate-700 leading-relaxed">{section.body}</p>

                      {section.chart && section.chart.dataSourceKey === 'pollutantTrends' && (
                        <div className="mt-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-4 border border-slate-200">
                          <h4 className="mb-4 text-sm font-semibold text-slate-700">Global Pollutant Trends (2015–2026)</h4>
                          <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={pollutantTrendData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                              <XAxis 
                                dataKey="year" 
                                stroke="rgba(0,0,0,0.4)"
                                style={{ fontSize: '12px' }}
                              />
                              <YAxis 
                                stroke="rgba(0,0,0,0.4)"
                                style={{ fontSize: '12px' }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'white', 
                                  border: '1px solid #e5e7eb',
                                  borderRadius: '8px'
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="pm25" 
                                stroke={pollutantColors.pm25}
                                name={pollutantLabels.pm25}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="pm10" 
                                stroke={pollutantColors.pm10}
                                name={pollutantLabels.pm10}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="no2" 
                                stroke={pollutantColors.no2}
                                name={pollutantLabels.no2}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="o3" 
                                stroke={pollutantColors.o3}
                                name={pollutantLabels.o3}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="so2" 
                                stroke={pollutantColors.so2}
                                name={pollutantLabels.so2}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="co" 
                                stroke={pollutantColors.co}
                                name={pollutantLabels.co}
                                strokeWidth={2}
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          <p className="mt-3 text-xs text-slate-600 text-center">
                            Average concentration in µg/m³ globally (2015–2026)
                          </p>
                        </div>
                      )}

                      {selectedTheme.id === 'pollution-and-health' && section.label === 'live-map' && (
                        <div className="mt-5">
                          <Link
                            to="/live-map"
                            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
                          >
                            <Globe className="h-4 w-4" />
                            View live air quality map
                          </Link>
                        </div>
                      )}

                      {isPollutionHealthAiView && index === 0 && yearlyTrends && (
                        <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h6 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Trends over time</h6>
                              <p className="mt-1 text-sm text-slate-600">
                                Explore 2015–2026 pollutant trends and compare which emissions are improving or worsening.
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {trendOptions.map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  onClick={() => setSelectedTrendPollutant(option.key)}
                                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                                    selectedTrendPollutant === option.key
                                      ? 'bg-slate-950 text-white border-slate-950'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                            <div className="rounded-3xl bg-white p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Trend chart</div>
                                  <h5 className="mt-2 text-lg font-bold text-slate-950">{trendOptions.find((opt) => opt.key === selectedTrendPollutant)?.label}</h5>
                                </div>
                                <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  2015–2026
                                </div>
                              </div>
                              <div className="mt-4 h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={trendChartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                                    <YAxis tickFormatter={(value) => value.toFixed(2)} width={48} />
                                    <Tooltip formatter={(value:any) => (typeof value === 'number' ? value.toFixed(2) : value)} />
                                    <Line type="monotone" dataKey={selectedTrendPollutant} stroke="#2563eb" strokeWidth={3} dot={false} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </div>

                            <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-sm">
                              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Trend insight</div>
                              <h5 className="mt-3 text-xl font-bold">Regional patterns</h5>
                              <p className="mt-3 text-sm leading-relaxed text-slate-200">
                                Focus on the selected pollutant and observe whether key regions are moving toward cleaner air or farther from the WHO guideline.
                              </p>
                              <div className="mt-4 space-y-3">
                                <div className="rounded-2xl bg-slate-900 p-3">
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">What to look for</div>
                                  <p className="mt-2 text-sm text-slate-200">A rising line signals worsening exposure, while a downward slope means progress in reducing concentrations.</p>
                                </div>
                                <div className="rounded-2xl bg-slate-900 p-3">
                                  <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Why this matters</div>
                                  <p className="mt-2 text-sm text-slate-200">This visualization helps connect the data story to policy and health outcomes by making trends visible at a glance.</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isPollutionHealthAiView && index === 1 && (
                        <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h6 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Inequality lens</h6>
                              <p className="mt-1 text-sm text-slate-600">
                                Switch between geography and exposure level to reveal how inequality shows up at different scales.
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setInequalityLens('geography')}
                                className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                                  inequalityLens === 'geography'
                                    ? 'bg-slate-950 text-white border-slate-950'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                Geography
                              </button>
                              <button
                                type="button"
                                onClick={() => setInequalityLens('exposure')}
                                className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                                  inequalityLens === 'exposure'
                                    ? 'bg-slate-950 text-white border-slate-950'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                Exposure level
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="rounded-3xl bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-between gap-3">
                                <h5 className="text-lg font-bold text-slate-950">Current lens</h5>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {inequalityLens === 'geography' ? 'Geography' : 'Exposure'}
                                </span>
                              </div>
                              <div className="mt-4 space-y-3">
                                {inequalityTable.map((row) => (
                                  <div key={row.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{row.label}</div>
                                    <p className="mt-2 text-sm text-slate-700">{row.value}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Inequality chart</div>
                                    <h5 className="mt-2 text-lg font-bold text-slate-950">Relative gap mix</h5>
                                  </div>
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{inequalityLens === 'geography' ? 'Country gap' : 'Community gap'}</span>
                                </div>
                                <div className="mt-4 h-56">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={inequalityBarData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                      <YAxis tickFormatter={(value) => `${value}%`} width={48} />
                                      <Tooltip formatter={(value:any) => `${value}%`} />
                                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                        {inequalityBarData.map((entry) => (
                                          <Cell key={entry.name} fill={entry.name === 'Geography gap' ? '#2563eb' : '#f59e0b'} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-3xl bg-white p-4 shadow-sm">
                              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">What this means</div>
                              <p className="mt-3 text-sm leading-relaxed text-slate-700">
                                The selected lens highlights whether the biggest inequality is driven by cross-country gaps or by local exposure differences within the same place.
                              </p>
                              <div className="mt-4 space-y-3">
                                <div className="rounded-2xl bg-slate-50 p-3">
                                  <p className="text-sm text-slate-700">
                                    Geography helps identify the regions with the worst national averages, while exposure shows the communities within countries that face the greatest pollution burden.
                                  </p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 p-3">
                                  <p className="text-sm text-slate-700">
                                    Use these two views together to make the story more actionable for both global policy and local justice efforts.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {section.bullets && section.bullets.length > 0 && (
                        <ul className="mt-4 space-y-2">
                          {section.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  ))}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-6 md:p-8">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-3xl">
                      <h3 className="text-2xl font-black text-slate-950">Prompt handoff for the AI agent</h3>
                      <p className="mt-2 text-slate-600 leading-relaxed">
                        Send the prompt on the left to your agent whenever you want a similar story generated for the
                        selected theme. The structure stays consistent, so human and AI stories can be compared
                        side-by-side.
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Current view</div>
                      <div className="mt-1 text-lg font-bold">
                        {selectedTheme.badge} {selectedMode === 'human' ? 'Human' : 'AI'} mode
                      </div>
                    </div>
                  </div>

                  {isStoryThreeAiView && (
                    <div className="mt-6 rounded-2xl border border-sky-200 bg-white p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                            <Bot className="h-3.5 w-3.5" />
                            AI Agent 1
                          </div>
                          <h4 className="mt-3 text-xl font-bold text-slate-950">Best and worst cities by PM2.5</h4>
                          <p className="mt-2 text-sm text-slate-600">
                            Enter how many cities to rank, choose worst, best, or both, then generate AI-powered results.
                          </p>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:w-auto">
                          <label className="flex flex-col text-sm font-semibold text-slate-700">
                            City count
                            <input
                              type="number"
                              min={1}
                              max={25}
                              value={rankingCount}
                              onChange={(event) => setRankingCount(Math.min(25, Math.max(1, Number(event.target.value) || 1)))}
                              className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            />
                          </label>

                          <label className="flex flex-col text-sm font-semibold text-slate-700">
                            Ranking mode
                            <select
                              value={rankingType}
                              onChange={(event) => setRankingType(event.target.value as 'best' | 'worst' | 'both')}
                              className="mt-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="worst">Top worst cities</option>
                              <option value="best">Top best cities</option>
                              <option value="both">Worst and best cities</option>
                            </select>
                          </label>

                          <button
                            type="button"
                            onClick={generateCityRankings}
                            disabled={rankingLoading}
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            <BarChart3 className="h-4 w-4" />
                            {rankingLoading ? 'Generating...' : 'Run AI Agent 1'}
                          </button>
                        </div>
                      </div>

                      {rankingError && <p className="mt-4 text-sm text-red-600">{rankingError}</p>}

                      {rankingResult && (
                        <div className="mt-6 space-y-6">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 border border-emerald-200">
                                Provider: {rankingResult.provider || 'Ollama'}
                              </span>
                              <span className="rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700 border border-sky-200">
                                Top {rankingResult.count} {rankingResult.ranking_type}
                              </span>
                            </div>
                            <h5 className="mt-3 text-lg font-bold text-slate-950">{rankingResult.headline}</h5>
                            <p className="mt-2 text-sm text-slate-700">{rankingResult.summary}</p>
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <h6 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                                PM2.5 vs standard comparison
                              </h6>
                              {rankingType !== 'both' ? (
                                <div className="mt-3 h-96 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activeRankingRows} margin={{ top: 8, right: 16, left: 16, bottom: 78 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis
                                        dataKey="city"
                                        angle={-35}
                                        textAnchor="end"
                                        interval={0}
                                        height={92}
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value)}
                                      />
                                      <YAxis />
                                      <ReferenceLine
                                        y={standardPm25Value}
                                        stroke="#0f172a"
                                        strokeDasharray="4 4"
                                      />
                                      <Tooltip
                                        formatter={(value: number, name: string) => {
                                          if (name === 'standard_pm25') {
                                            return [`${value.toFixed(2)} ug/m3`, 'Standard PM2.5'];
                                          }
                                          return [`${value.toFixed(2)} ug/m3`, 'City average PM2.5'];
                                        }}
                                        labelFormatter={(label) => `City: ${label}`}
                                      />
                                      <Legend
                                        formatter={(value) => (value === 'avg_pm25' ? 'City average PM2.5' : 'Standard PM2.5')}
                                      />
                                      <Bar dataKey="avg_pm25" fill="#dc2626" radius={[8, 8, 0, 0]}>
                                        {activeRankingRows.map((row) => (
                                          <Cell
                                            key={row.label}
                                            fill={rankingType === 'best' ? '#16a34a' : '#dc2626'}
                                          />
                                        ))}
                                      </Bar>
                                      <Bar dataKey="standard_pm25" fill="#2563eb" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    <div className="inline-flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />
                                      Standard PM2.5
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#dc2626]" />
                                      Worst city PM2.5
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#16a34a]" />
                                      Best city PM2.5
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                  <div className="h-96 w-full rounded-xl border border-red-100 p-2">
                                    <div className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Worst cities</div>
                                    <ResponsiveContainer width="100%" height="92%">
                                      <BarChart data={worstRankingRows} margin={{ top: 8, right: 16, left: 12, bottom: 78 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="city"
                                          angle={-35}
                                          textAnchor="end"
                                          interval={0}
                                          height={92}
                                          tick={{ fontSize: 11 }}
                                          tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value)}
                                        />
                                        <YAxis />
                                        <ReferenceLine y={standardPm25Value} stroke="#0f172a" strokeDasharray="4 4" />
                                        <Tooltip
                                          formatter={(value: number, name: string) => {
                                            if (name === 'standard_pm25') {
                                              return [`${value.toFixed(2)} ug/m3`, 'Standard PM2.5'];
                                            }
                                            return [`${value.toFixed(2)} ug/m3`, 'Worst city PM2.5'];
                                          }}
                                        />
                                        <Bar dataKey="avg_pm25" fill="#dc2626" radius={[8, 8, 0, 0]} />
                                        <Bar dataKey="standard_pm25" fill="#2563eb" radius={[8, 8, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>

                                  <div className="h-96 w-full rounded-xl border border-emerald-100 p-2">
                                    <div className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Best cities</div>
                                    <ResponsiveContainer width="100%" height="92%">
                                      <BarChart data={bestRankingRows} margin={{ top: 8, right: 16, left: 12, bottom: 78 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                          dataKey="city"
                                          angle={-35}
                                          textAnchor="end"
                                          interval={0}
                                          height={92}
                                          tick={{ fontSize: 11 }}
                                          tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value)}
                                        />
                                        <YAxis />
                                        <ReferenceLine y={standardPm25Value} stroke="#0f172a" strokeDasharray="4 4" />
                                        <Tooltip
                                          formatter={(value: number, name: string) => {
                                            if (name === 'standard_pm25') {
                                              return [`${value.toFixed(2)} ug/m3`, 'Standard PM2.5'];
                                            }
                                            return [`${value.toFixed(2)} ug/m3`, 'Best city PM2.5'];
                                          }}
                                        />
                                        <Bar dataKey="avg_pm25" fill="#dc2626" radius={[8, 8, 0, 0]} />
                                        <Bar dataKey="standard_pm25" fill="#2563eb" radius={[8, 8, 0, 0]} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                </div>
                              )}
                          </div>

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <h6 className="text-base font-bold text-slate-900">AI insights</h6>
                              <ul className="mt-3 space-y-2">
                                {rankingResult.insights.map((insight) => (
                                  <li key={insight} className="flex gap-2 text-sm text-slate-700">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                                    <span>{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <h6 className="text-base font-bold text-slate-900">Recommendations</h6>
                              <ul className="mt-3 space-y-2">
                                {rankingResult.recommendations.map((item) => (
                                  <li key={item} className="flex gap-2 text-sm text-slate-700">
                                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            {(rankingType === 'worst' || rankingType === 'both') && (
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h6 className="text-base font-bold text-slate-900">Worst city ranking details</h6>
                                <p className="mt-1 text-xs text-slate-500">Click a city row to view detailed city profile.</p>
                                <div className="mt-3 overflow-x-auto">
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                                        <th className="px-2 py-2">Rank</th>
                                        <th className="px-2 py-2">City</th>
                                        <th className="px-2 py-2">Avg PM2.5</th>
                                        <th className="px-2 py-2">Samples</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rankingResult.worst_cities.map((row) => (
                                        <tr
                                          key={`worst-${row.rank}-${formatRankingRowLabel(row)}`}
                                          onClick={() => loadCityDetails(row, 'worst')}
                                          className={`cursor-pointer border-b border-slate-100 text-slate-700 transition-colors hover:bg-sky-50 ${
                                            selectedCityLabel === formatRankingRowLabel(row) ? 'bg-sky-50' : ''
                                          }`}
                                        >
                                          <td className="px-2 py-2 font-semibold">#{row.rank}</td>
                                          <td className="px-2 py-2">{formatRankingRowLabel(row)}</td>
                                          <td className="px-2 py-2 font-medium text-red-700">{row.avg_pm25.toFixed(2)}</td>
                                          <td className="px-2 py-2">{row.sample_count}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}

                            {(rankingType === 'best' || rankingType === 'both') && (
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h6 className="text-base font-bold text-slate-900">Best city ranking details</h6>
                                <p className="mt-1 text-xs text-slate-500">Click a city row to view detailed city profile.</p>
                                <div className="mt-3 overflow-x-auto">
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                                        <th className="px-2 py-2">Rank</th>
                                        <th className="px-2 py-2">City</th>
                                        <th className="px-2 py-2">Avg PM2.5</th>
                                        <th className="px-2 py-2">Samples</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rankingResult.best_cities.map((row) => (
                                        <tr
                                          key={`best-${row.rank}-${formatRankingRowLabel(row)}`}
                                          onClick={() => loadCityDetails(row, 'best')}
                                          className={`cursor-pointer border-b border-slate-100 text-slate-700 transition-colors hover:bg-sky-50 ${
                                            selectedCityLabel === formatRankingRowLabel(row) ? 'bg-sky-50' : ''
                                          }`}
                                        >
                                          <td className="px-2 py-2 font-semibold">#{row.rank}</td>
                                          <td className="px-2 py-2">{formatRankingRowLabel(row)}</td>
                                          <td className="px-2 py-2 font-medium text-emerald-700">{row.avg_pm25.toFixed(2)}</td>
                                          <td className="px-2 py-2">{row.sample_count}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>

                          {(selectedCityLabel || cityDetailsLoading || cityDetails || cityDetailsError) && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <h6 className="text-lg font-bold text-slate-900">
                                  City details {selectedCityLabel ? `- ${selectedCityLabel}` : ''}
                                </h6>
                                {cityDetails?.provider && (
                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                    Guidance provider: {cityDetails.provider}
                                  </span>
                                )}
                              </div>

                              {cityDetailsLoading && (
                                <p className="mt-4 text-sm text-slate-600">Loading city profile...</p>
                              )}

                              {cityDetailsError && (
                                <p className="mt-4 text-sm text-red-600">{cityDetailsError}</p>
                              )}

                              {cityDetails && (
                                <div className="mt-4 space-y-5">
                                  {/** Use all pollutants for chart display and keep top list for reasoning logic. */}
                                  {(() => {
                                    const chartPollutants = cityDetails.pollutant_breakdown && cityDetails.pollutant_breakdown.length > 0
                                      ? cityDetails.pollutant_breakdown
                                      : cityDetails.top_pollutants;

                                    return (
                                      <>
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Average AQI</div>
                                      <div className="mt-1 text-2xl font-bold text-slate-900">
                                        {cityDetails.aqi_avg !== null ? cityDetails.aqi_avg.toFixed(2) : 'N/A'}
                                      </div>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Data samples</div>
                                      <div className="mt-1 text-2xl font-bold text-slate-900">{cityDetails.sample_count}</div>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <h6 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                                      All pollutants (top 3 highlighted)
                                    </h6>
                                    <div className="mt-3 h-72">
                                      <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartPollutants} margin={{ top: 8, right: 20, left: 10, bottom: 24 }}>
                                          <CartesianGrid strokeDasharray="3 3" />
                                          <XAxis dataKey="name" />
                                          <YAxis />
                                          <Tooltip formatter={(value: number) => [value.toFixed(2), 'Average concentration']} />
                                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                            {chartPollutants.map((pollutant, index) => (
                                              <Cell
                                                key={`${pollutant.key}-${pollutant.value}`}
                                                fill={index < 3 ? '#0284c7' : '#94a3b8'}
                                              />
                                            ))}
                                          </Bar>
                                        </BarChart>
                                      </ResponsiveContainer>
                                    </div>
                                  </div>

                                  {selectedCityBucket !== 'best' && (
                                    <div className="space-y-4">
                                      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                        <div className="flex items-center gap-2 text-base font-bold text-rose-800">
                                          <AlertTriangle className="h-4 w-4" />
                                          Reasons this city is highly polluted
                                        </div>
                                        <ul className="mt-3 space-y-2">
                                          {cityDetails.reasons.map((reason) => (
                                            <li key={reason} className="flex gap-2 text-sm text-rose-900">
                                              <span className="mt-1 h-2 w-2 rounded-full bg-rose-500" />
                                              <span>{reason}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>

                                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                        <div className="flex items-center gap-2 text-base font-bold text-amber-800">
                                          <AlertTriangle className="h-4 w-4" />
                                          Possible problems
                                        </div>
                                        <ul className="mt-3 space-y-2">
                                          {cityDetails.problems.map((problem) => (
                                            <li key={problem} className="flex gap-2 text-sm text-amber-900">
                                              <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                                              <span>{problem}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>

                                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                                        <div className="flex items-center gap-2 text-base font-bold text-emerald-800">
                                          <ShieldCheck className="h-4 w-4" />
                                          Precautions
                                        </div>
                                        <ul className="mt-3 space-y-2">
                                          {cityDetails.precautions.map((item) => (
                                            <li key={item} className="flex gap-2 text-sm text-emerald-900">
                                              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                              <span>{item}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      </div>
                                    </div>
                                  )}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h5 className="text-lg font-bold text-slate-950">Human Stories from the Air We Breathe</h5>
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <p className="text-sm text-slate-700">
                              "My son keeps a rescue inhaler in his school bag now; winter smog turned a simple cough into repeated clinic visits."
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Parent, Delhi (Gulf News report)</p>
                          </article>

                          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <p className="text-sm text-slate-700">
                              "I plan errands around the air index and skip evening walks when the haze is thick, even with daily asthma medication."
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Asthma patient, UAE resident (Gulf News)</p>
                          </article>

                          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <p className="text-sm text-slate-700">
                              "We close windows all day and run a purifier at night, but my daughter still wakes up wheezing after high-pollution days."
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Mother, Lahore (regional coverage)</p>
                          </article>

                          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <p className="text-sm text-slate-700">
                              "I retired early with emphysema; now oxygen support and bad-air alerts decide whether I can step outside."
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Older adult, U.S. COPD support community (lung.org)</p>
                          </article>

                          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <p className="text-sm text-slate-700">
                              "I cannot afford to move, so we mask up indoors and outdoors when smoke and traffic pollution settle over the neighborhood."
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Resident, California wildfire zone (state testimony)</p>
                          </article>

                          <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                            <p className="text-sm text-slate-700">
                              "Our grandson stopped outdoor football in peak smog months; he says breathing feels like running with a cloth over his face."
                            </p>
                            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Grandparent, North India (local interview)</p>
                          </article>
                        </div>
                        <p className="mt-4 text-sm text-slate-600">
                          Across locations and age groups, the pattern is the same: chronic exposure turns ordinary routines into daily risk management.
                          For many families, there is no easy escape from polluted air, only long-term adaptation.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedTheme.status === 'awaiting-source' && (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
                    Story content for this theme has not been added yet. Send the source text when you are ready,
                    and I will split it into subtopics plus a matching AI/Ollama version.
                  </div>
                )}

                {selectedMode === 'ai' && selectedTheme.status === 'ready' && aiLoading && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
                    Generating a new AI/Ollama story for this theme... this can take a moment on a local model.
                  </div>
                )}

                {selectedMode === 'ai' && selectedTheme.status === 'ready' && !aiLoading && !selectedAiStory && !aiError && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
                    No AI story has been generated yet. Click the button above when you want Ollama to generate one.
                  </div>
                )}
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
