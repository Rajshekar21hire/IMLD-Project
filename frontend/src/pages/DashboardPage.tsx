import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, Copy, Layers, Sparkles } from 'lucide-react';
import { storyAPI } from '../services/api';
import { storyModes, storyThemes, StoryMode, StoryTheme, StorySection } from '../data/storyThemes';

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

export const DashboardPage: React.FC = () => {
  const [selectedThemeId, setSelectedThemeId] = useState(storyThemes[0].id);
  const [selectedMode, setSelectedMode] = useState<StoryMode>('human');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [aiStories, setAiStories] = useState<Record<string, { title: string; summary: string; sections: StorySection[]; provider?: string }>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState('');

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
