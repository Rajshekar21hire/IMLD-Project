import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BookOpen, Copy, Layers, RefreshCw, Sparkles } from 'lucide-react';
import { Chart } from '../components/Chart';
import { dataAPI, storyAPI } from '../services/api';
import { storyModes, storyThemes, StoryMode, StoryTheme, StorySection } from '../data/storyThemes';
import { WorstCitiesPromptResponse, WorstCitiesResponse } from '../types';

const buildPrompt = (theme: StoryTheme, mode: StoryMode) => {
  const sectionTitles = theme.humanSections.length
    ? theme.humanSections.map((section) => section.title).join(', ')
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

const wordToNumber: Record<string, number> = {
  'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
  'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
  'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
  'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
};

const extractTopNFromPrompt = (prompt: string): number | null => {
  const numberPattern = '(?:\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
  const patterns = [
    new RegExp(`(?:top|best|worst|cleanest)\\s+(${numberPattern})`, 'i'),
    new RegExp(`(${numberPattern})\\s+(?:top|best|worst|cleanest|cities?|city)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (!match) {
      continue;
    }

    const rawValue = match[1].toLowerCase();
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isNaN(parsed)) {
      return Math.min(50, Math.max(1, parsed));
    }

    const numberValue = wordToNumber[rawValue];
    if (numberValue !== undefined && numberValue > 0) {
      return Math.min(50, Math.max(1, numberValue));
    }
  }

  return null;
};

export const DashboardPage: React.FC = () => {
  const [selectedThemeId, setSelectedThemeId] = useState(storyThemes[0].id);
  const [selectedMode, setSelectedMode] = useState<StoryMode>('human');
  const [worstCitiesView, setWorstCitiesView] = useState<'summary' | 'charts' | 'ranking'>('summary');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [aiStories, setAiStories] = useState<Record<string, { title: string; summary: string; sections: StorySection[]; provider?: string }>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState('');
  const [worstCities, setWorstCities] = useState<WorstCitiesResponse | null>(null);
  const [worstCitiesLoading, setWorstCitiesLoading] = useState(false);
  const [worstCitiesError, setWorstCitiesError] = useState('');
  const [worstCitiesPrompt, setWorstCitiesPrompt] = useState('');
  const [worstCitiesAnalysis, setWorstCitiesAnalysis] = useState<WorstCitiesPromptResponse | null>(null);
  const hasInitializedWorstCities = useRef(false);

  const selectedTheme = useMemo(
    () => storyThemes.find((theme) => theme.id === selectedThemeId) ?? storyThemes[0],
    [selectedThemeId]
  );

  const selectedAiStory = aiStories[selectedTheme.id];
  const activeSections = useMemo(
    () => (selectedMode === 'human' ? selectedTheme.humanSections : selectedAiStory?.sections || []),
    [selectedTheme, selectedMode, selectedAiStory]
  );
  const promptText = buildPrompt(selectedTheme, selectedMode);
  const promptLimit = useMemo(() => extractTopNFromPrompt(worstCitiesPrompt), [worstCitiesPrompt]);

  const loadWorstCities = useCallback(async () => {
    if (!promptLimit) {
      setWorstCitiesError('Please include a city count in your prompt, for example: "top six worst cities" or "worst 6 cities".');
      return;
    }

    setWorstCitiesLoading(true);
    setWorstCitiesError('');

    try {
      const response = await dataAPI.getWorstCities({ days: 30, limit: promptLimit });

      if (response.data?.success) {
        setWorstCities(response.data.data as WorstCitiesResponse);
      } else {
        throw new Error(response.data?.error || 'Failed to load worst cities');
      }
    } catch (error: any) {
      setWorstCitiesError(error.response?.data?.error || error.message || 'Failed to load worst cities');
    } finally {
      setWorstCitiesLoading(false);
    }
  }, [promptLimit]);

  const analyzeWorstCities = useCallback(async () => {
    if (!promptLimit) {
      setWorstCitiesError('Please include a city count in your prompt, for example: "top six worst cities" or "best 6 cities".');
      return;
    }

    setWorstCitiesLoading(true);
    setWorstCitiesError('');

    try {
      const response = await dataAPI.analyzeWorstCities({
        prompt: worstCitiesPrompt,
        days: 30,
        limit: promptLimit,
      });

      if (response.data?.success) {
        const analysis = response.data.data as WorstCitiesPromptResponse;
        setWorstCitiesAnalysis(analysis);
        setWorstCities(analysis);
        setWorstCitiesView(analysis.presentation?.recommended_view || 'summary');
      } else {
        throw new Error(response.data?.error || 'Failed to analyze worst cities');
      }
    } catch (error: any) {
      setWorstCitiesError(error.response?.data?.error || error.message || 'Failed to analyze worst cities');
    } finally {
      setWorstCitiesLoading(false);
    }
  }, [worstCitiesPrompt, promptLimit]);

  useEffect(() => {
    if (hasInitializedWorstCities.current) {
      return;
    }

    hasInitializedWorstCities.current = true;
    setWorstCitiesError('Write a prompt with a city count, such as "top six best cities" or "worst 6 cities", and run analysis.');
  }, [loadWorstCities, analyzeWorstCities]);

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
          sections: selectedTheme.humanSections,
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
  }, [selectedTheme]);

  useEffect(() => {
    if (selectedMode === 'ai' && selectedTheme.status === 'ready' && aiRequested[selectedTheme.id] && !selectedAiStory && !aiLoading) {
      generateAiStory();
    }
  }, [selectedMode, selectedThemeId, selectedTheme.id, selectedTheme.status, selectedAiStory, aiLoading, generateAiStory, aiRequested]);

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
                    Enter a prompt such as "Show me the top five worst cities in the dataset" or "Show me the best ten cities in the world" and the agent will rank the cities from the dataset, then return text and visualizations.
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
                          : selectedAiStory?.summary || selectedTheme.overview}
                      </p>
                      {selectedMode === 'ai' && selectedTheme.status === 'ready' && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700 border border-emerald-200">
                            Powered by {selectedAiStory?.provider || 'Ollama'}
                          </span>
                          <button
                            type="button"
                            onClick={generateAiStory}
                            disabled={aiLoading}
                            className="rounded-full bg-slate-950 px-3 py-1 font-semibold text-white disabled:opacity-60"
                          >
                            {aiLoading ? 'Generating...' : selectedAiStory ? 'Regenerate story' : 'Generate AI story'}
                          </button>
                        </div>
                      )}
                      {aiError && selectedMode === 'ai' && (
                        <p className="mt-3 text-sm text-red-600">{aiError}</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {activeSections.map((section, index) => (
                    <article
                      key={`${selectedTheme.id}-${selectedMode}-${section.title}`}
                      className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow"
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

                <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 md:p-8">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-lg mb-4">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    Prompt-driven worst cities AI agent
                  </div>

                  <p className="text-sm text-slate-600 leading-relaxed mb-6">
                    Enter a prompt such as "Show me the top five worst cities in the dataset" and the agent will rank the cities from the dataset, then return text and visualizations.
                  </p>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">AI prompt</label>
                      <textarea
                        value={worstCitiesPrompt}
                        onChange={(event) => setWorstCitiesPrompt(event.target.value)}
                        rows={6}
                        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                      />

                      <p className="mt-3 text-xs text-slate-500">
                        Add a number or number word in the prompt like "top 6", "best ten cities", or "worst five cities" and the ranking, charts, and summary cards will update automatically.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={analyzeWorstCities}
                          disabled={worstCitiesLoading}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                        >
                          <Sparkles className="w-4 h-4" />
                          {worstCitiesLoading ? 'Analyzing...' : 'Run AI analysis'}
                        </button>
                        <button
                          type="button"
                          onClick={loadWorstCities}
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <RefreshCw className={`w-4 h-4 ${worstCitiesLoading ? 'animate-spin' : ''}`} />
                          Load sample ranking
                        </button>
                      </div>

                      {worstCitiesError && (
                        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {worstCitiesError}
                        </div>
                      )}

                      {worstCitiesLoading && (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Loading city rankings...
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-2">
                      {!worstCitiesLoading && worstCitiesAnalysis && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            {(worstCitiesAnalysis.presentation?.cards || [
                              {
                                label: 'Cities ranked',
                                value: String(worstCitiesAnalysis.count),
                                detail: 'Worst-performing cities returned by the current prompt',
                              },
                            ]).map((card) => (
                              <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</div>
                                <div className="mt-2 text-lg font-bold text-slate-950">{card.value}</div>
                                <div className="mt-1 text-xs text-slate-500">{card.detail}</div>
                              </div>
                            ))}
                          </div>

                          <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-3 text-sm text-slate-700">
                            <div className="font-semibold text-slate-900">{worstCitiesAnalysis.title}</div>
                            <div className="mt-1">{worstCitiesAnalysis.interpretation || worstCitiesAnalysis.summary}</div>
                            {worstCitiesAnalysis.query_hint && (
                              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                                {worstCitiesAnalysis.query_hint}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {(['summary', 'charts', 'ranking'] as const).map((view) => (
                              <button
                                key={view}
                                type="button"
                                onClick={() => setWorstCitiesView(view)}
                                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                                  worstCitiesView === view
                                    ? 'bg-slate-950 text-white'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {view.charAt(0).toUpperCase() + view.slice(1)} view
                              </button>
                            ))}
                          </div>

                          {worstCitiesView === 'summary' && (
                            <div className="space-y-3">
                              {worstCitiesAnalysis.insights && worstCitiesAnalysis.insights.length > 0 && (
                                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                  <div className="text-sm font-semibold text-slate-900">Key insights</div>
                                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                                    {worstCitiesAnalysis.insights.map((insight) => (
                                      <li key={insight} className="flex gap-3">
                                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                                        <span>{insight}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {worstCitiesAnalysis.visualization_notes && worstCitiesAnalysis.visualization_notes.length > 0 && (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                  <div className="font-semibold text-slate-900">Visualization notes</div>
                                  <ul className="mt-2 space-y-1">
                                    {worstCitiesAnalysis.visualization_notes.map((note) => (
                                      <li key={note}>• {note}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}

                          {worstCitiesView === 'charts' && worstCitiesAnalysis.chart_data && worstCitiesAnalysis.chart_data.length > 0 && (
                            <div className="space-y-4">
                              <Chart
                                title="Composite score and AQI"
                                data={worstCitiesAnalysis.chart_data}
                                dataKeys={[
                                  { key: 'score', name: 'Composite Score', color: '#ef4444' },
                                  { key: 'aqi', name: 'AQI', color: '#0ea5e9' },
                                ]}
                                type="bar"
                              />
                              <Chart
                                title="Top pollutant signals by city"
                                data={worstCitiesAnalysis.chart_data}
                                dataKeys={[
                                  { key: 'pm25', name: 'PM2.5', color: '#f97316' },
                                  { key: 'pm10', name: 'PM10', color: '#8b5cf6' },
                                  { key: 'no2', name: 'NO2', color: '#14b8a6' },
                                ]}
                                type="bar"
                              />
                            </div>
                          )}

                          {worstCitiesView === 'ranking' && (
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                              <div className="text-sm font-semibold text-slate-900 mb-3">Ranked cities</div>
                              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {worstCitiesAnalysis.cities.map((city, index) => (
                                  <div key={`${city.city}-${city.country}`} className="rounded-2xl bg-slate-50 px-4 py-3 border border-slate-200">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
                                          Rank {index + 1}
                                        </div>
                                        <div className="mt-1 font-bold text-slate-950">
                                          {city.city}, {city.country}
                                        </div>
                                      </div>
                                      <div className="rounded-full bg-rose-50 px-3 py-1 text-sm font-bold text-rose-700">
                                        {city.score}
                                      </div>
                                    </div>
                                    <div className="mt-2 text-sm text-slate-600">{city.records} records analyzed</div>
                                    {city.drivers.length > 0 && (
                                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                        {city.drivers.map((driver) => (
                                          <span key={`${city.city}-${driver.metric}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
                                            {driver.metric.toUpperCase()} {driver.value}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {!worstCitiesLoading && !worstCitiesAnalysis && worstCities && (
                        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
                          {worstCities.summary}
                        </div>
                      )}
                    </div>
                  </div>
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
