import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, BookOpen, Bot, Copy, Globe, Layers, ShieldCheck, Sparkles, Users, Wind, HeartPulse, Megaphone, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from 'recharts';
import { storyAPI, dataAPI } from '../services/api';
import { storyModes, storyThemes, StoryMode, StoryTheme, StorySection, StoryCategoryBlock } from '../data/storyThemes';
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

interface StoryThreeTestimonial {
  id: string;
  quote: string;
  author: string;
  details: string;
}

const toSafeText = (value: any): string => {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value && typeof value === 'object') {
    const candidate = value.text ?? value.label ?? value.value ?? value.name ?? value.title ?? value.description;
    if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
      return String(candidate).trim();
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }
  return '';
};

const toSafeTextList = (input: any, fallback: string[]): string[] => {
  if (!Array.isArray(input)) {
    return fallback;
  }

  const cleaned = input
    .map((item) => toSafeText(item))
    .filter((item) => item.length > 0);

  return cleaned.length > 0 ? cleaned : fallback;
};

// JSON key names that Ollama sometimes emits as literal bullet strings
const AI_JUNK_BULLETS = new Set([
  'title', 'data', 'value', 'values', 'unit', 'units', 'text', 'body',
  'label', 'labels', 'name', 'names', 'key', 'keys', 'type', 'types',
  'description', 'content', 'summary', 'info', 'details', 'detail',
  'item', 'items', 'entry', 'entries', 'field', 'fields', 'metric',
  'metrics', 'note', 'notes', 'point', 'points', '%', '-', '–', '—',
]);

const isMeaningfulBullet = (text: string): boolean => {
  const lower = text.trim().toLowerCase();
  if (lower.length < 8) return false;
  if (AI_JUNK_BULLETS.has(lower)) return false;
  // filter bare single-word JSON keys (no spaces, no digits, short)
  if (!/[\s\d]/.test(lower) && lower.length < 20) return false;
  return true;
};

const normalizeStorySections = (input: any, fallback: StorySection[] = []): StorySection[] => {
  const source = Array.isArray(input) ? input : fallback;

  return source.map((section: any, index: number) => {
    const fallbackSection = fallback[index];
    const safeTitle = toSafeText(section?.title) || fallbackSection?.title || `Section ${index + 1}`;
    const safeBody = toSafeText(section?.body) || fallbackSection?.body || '';
    const safeBullets = Array.isArray(section?.bullets)
      ? section.bullets
          .map((item: any) => toSafeText(item))
          .filter((item: string) => item.length > 0 && isMeaningfulBullet(item))
      : fallbackSection?.bullets;

    return {
      ...section,
      title: safeTitle,
      body: safeBody,
      bullets: safeBullets,
    } as StorySection;
  });
};

const formatRankingRowLabel = (row: CityRankingRecord) => `${row.city}, ${row.country}`;

const buildPrompt = (theme: StoryTheme, mode: StoryMode, sections: StorySection[]) => {
  const sourceSections = sections.length
    ? sections
        .map((section, index) => {
          const lines = [`${index + 1}. ${section.title}`];

          if (section.body) {
            lines.push(`Body: ${section.body}`);
          }

          if (section.categoryBlocks && section.categoryBlocks.length > 0) {
            lines.push('Categories:');
            section.categoryBlocks.forEach((group) => {
              lines.push(`  - ${group.label}`);
              group.cards.forEach((card) => {
                lines.push(`    * ${card.title}`);
                lines.push(`      Body: ${card.body}`);
                lines.push(`      Footer: ${card.footer}`);
              });
            });
          }

          if (section.bullets && section.bullets.length > 0) {
            lines.push('Bullets:');
            section.bullets.forEach((bullet) => lines.push(`  - ${bullet}`));
          }

          return lines.join('\n');
        })
        .join('\n\n')
    : 'No source sections provided yet';

  return [
    `You are an AI storytelling agent.`,
    `Theme: ${theme.title}`,
    `Mode: ${mode === 'human' ? 'Human-curated source story' : mode === 'agentic' ? 'Agentic AI-generated story' : 'AI/Ollama-generated story'}`,
    `Prompt focus: ${theme.promptFocus}`,
    `Subtopics to cover: ${sections.length ? sections.map((section) => section.title).join(', ') : 'No source sections provided yet'}`,
    `Source details:\n${sourceSections}`,
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
  const [aiLoading, setAiLoading] = useState(false);
  const [aiRequested, setAiRequested] = useState<Record<string, boolean>>({});
  const [aiError, setAiError] = useState('');
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
  const [storyFourAiCategory, setStoryFourAiCategory] = useState('Personal');
  const [storyFourAiVoiceIndex, setStoryFourAiVoiceIndex] = useState(0);
  const [storyFourOutcomeFilter, setStoryFourOutcomeFilter] = useState<'All' | 'Health' | 'Economy' | 'Environment' | 'Technology'>('All');
  const [storyFourCaseStudyId, setStoryFourCaseStudyId] = useState('china-pm25');

  const [storyThreeAiTestimonials, setStoryThreeAiTestimonials] = useState<StoryThreeTestimonial[]>([]);
  const [storyThreeTestimonialsLoading, setStoryThreeTestimonialsLoading] = useState(false);
  const [storyThreeTestimonialsError, setStoryThreeTestimonialsError] = useState('');
  const [storyThreeTestimonialsProvider, setStoryThreeTestimonialsProvider] = useState('');
  const [storyThreeHumanTestimonialsRequested, setStoryThreeHumanTestimonialsRequested] = useState(false);

  const selectedTheme = useMemo(
    () => storyThemes.find((theme) => theme.id === selectedThemeId) ?? storyThemes[0],
    [selectedThemeId]
  );

  const selectedAiStory = aiStories[selectedTheme.id];
  const normalizedAiSections = useMemo(
    () => normalizeStorySections(selectedAiStory?.sections, selectedTheme.humanSections),
    [selectedAiStory?.sections, selectedTheme.humanSections]
  );
  const selectedAiSummary = toSafeText(selectedAiStory?.summary) || selectedTheme.overview;
  const selectedAiProvider = toSafeText(selectedAiStory?.provider) || 'Ollama';
  const hasGeneratedAiStory = Boolean(aiRequested[selectedTheme.id] || selectedAiStory);
  const activeSections = useMemo(
    () => {
      if (selectedMode === 'human') {
        return selectedTheme.humanSections;
      }
      return normalizedAiSections;
    },
    [selectedTheme, selectedMode, normalizedAiSections]
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
    selectedMode !== 'human' ? aiGenerationSections : selectedTheme.humanSections
  );
  const isAiLikeMode = selectedMode !== 'human';
  const isStoryThreeAiView = selectedTheme.id === 'aqi-and-decisions' && isAiLikeMode;
  const canShowStoryThreeAiSections = isStoryThreeAiView && (aiLoading || hasGeneratedAiStory);
  const isPollutionHealthAiView = selectedTheme.id === 'pollution-and-health' && isAiLikeMode;
  const isStoryFourHumanView = selectedTheme.id === 'measurement-and-governance' && selectedMode === 'human';
  const isStoryFourAiView = selectedTheme.id === 'measurement-and-governance' && isAiLikeMode;
  const storyFourCategoryStyles: Record<string, { labelClass: string; headerClass: string; cardClass: string; footerClass: string }> = {
    Personal: {
      labelClass: 'text-blue-700',
      headerClass: 'bg-blue-600 text-white',
      cardClass: 'bg-[#cdd6ee]',
      footerClass: 'text-[#1f5d8f]',
    },
    Household: {
      labelClass: 'text-green-700',
      headerClass: 'bg-green-600 text-white',
      cardClass: 'bg-[#dfead7]',
      footerClass: 'text-[#5f8c3d]',
    },
    Policy: {
      labelClass: 'text-orange-500',
      headerClass: 'bg-orange-500 text-white',
      cardClass: 'bg-[#f9dfd4]',
      footerClass: 'text-[#f28b2c]',
    },
    Community: {
      labelClass: 'text-amber-500',
      headerClass: 'bg-amber-400 text-white',
      cardClass: 'bg-[#fdeac9]',
      footerClass: 'text-[#f7b500]',
    },
  };
  const storyFourAiCategories = useMemo(() => {
    const generatedSource = normalizedAiSections.find((section) => section.categoryBlocks && section.categoryBlocks.length > 0);
    const source = generatedSource || selectedTheme.humanSections[0];
    const blocks: StoryCategoryBlock[] = source?.categoryBlocks ?? [];
    return blocks.reduce<Record<string, StoryCategoryBlock>>((accumulator, block) => {
      accumulator[block.label] = block;
      return accumulator;
    }, {} as Record<string, StoryCategoryBlock>);
  }, [normalizedAiSections, selectedTheme]);
  const storyFourAiCategoryData = storyFourAiCategories[storyFourAiCategory] || storyFourAiCategories.Personal;
  const storyFourAiCategoriesList = ['Personal', 'Household', 'Community', 'Policy'] as const;
  const storyFourAiVoices = useMemo(() => {
    const generatedVoiceSection = normalizedAiSections[1];
    const humanVoiceSection = selectedTheme.humanSections[1];
    const sourceBullets = generatedVoiceSection?.bullets && generatedVoiceSection.bullets.length >= 3
      ? generatedVoiceSection.bullets
      : humanVoiceSection?.bullets || [];

    const issueDefaults = [
      'Childhood asthma and urban air pollution',
      'Indoor smoke exposure from traditional cooking',
      'Winter PM2.5 exposure and respiratory harm',
    ];
    const outcomeDefaults = [
      'Campaigning for clean-air legislation',
      'Community-built clean cookstove adoption',
      'Youth-led climate and clean-air advocacy',
    ];

    return sourceBullets.map((bullet, index) => {
      const match = bullet.match(/^“([^”]+)”\s*-\s*([^\.]+)\.\s*(.*)$/);
      const quote = match?.[1] ? `“${match[1]}”` : bullet;
      const person = match?.[2]?.trim() || `Voice ${index + 1}`;
      const narrative = match?.[3]?.trim() || bullet;

      return {
        id: person.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        person,
        quote,
        preview: narrative.length > 170 ? `${narrative.slice(0, 170)}...` : narrative,
        narrative,
        issue: issueDefaults[index] || 'Air pollution exposure and health equity',
        outcome: outcomeDefaults[index] || 'Community action and policy visibility',
        affectedPopulation: index === 0 ? 'Children with asthma in high-traffic zones' : index === 1 ? 'Low-income households relying on biomass fuels' : 'Urban families exposed to winter smog',
        pollutant: index === 0 ? 'PM2.5 / NO2' : index === 1 ? 'Indoor PM2.5' : 'PM2.5',
        healthConsequence: index === 0 ? 'Severe asthma events and early-life respiratory risk' : index === 1 ? 'Frequent respiratory infections in children' : 'Maternal and child respiratory complications',
        actionTaken: index === 0 ? 'Legal advocacy and public campaigning' : index === 1 ? 'Locally built smokeless cookstove training' : 'Climate storytelling and youth mobilization',
      };
    });
  }, [normalizedAiSections, selectedTheme]);

  useEffect(() => {
    if (storyFourAiVoiceIndex >= storyFourAiVoices.length) {
      setStoryFourAiVoiceIndex(0);
    }
  }, [storyFourAiVoices, storyFourAiVoiceIndex]);

  const selectedStoryFourAiVoice = storyFourAiVoices[storyFourAiVoiceIndex];
  const storyThreeHumanTestimonials = useMemo(() => {
    const storyThreeTheme = storyThemes.find((theme) => theme.id === 'aqi-and-decisions');
    const voiceSection = storyThreeTheme?.humanSections?.find((section) => section.title === 'Human Stories from the Air We Breathe');
    const sourceBullets = voiceSection?.bullets || [];

    return sourceBullets.map((bullet) => {
      const quoteMatch = bullet.match(/^“([^”]+)”\s*[-–—]\s*([^\.]+)\.\s*(.*)$/);
      const quote = quoteMatch?.[1] ? `"${quoteMatch[1]}"` : bullet;
      const author = quoteMatch?.[2]?.trim() || 'Community member';
      const details = quoteMatch?.[3]?.trim() || '';

      return {
        id: `${author}-${quote}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        quote,
        author,
        details,
      };
    });
  }, []);
  const storyFourOutcomeCards = useMemo(() => {
    return [
      {
        id: 'lives-saved',
        icon: '🫁',
        metric: '3.7 Million Lives Saved Per Year',
        category: 'Health',
        explanation: 'Meeting WHO clean-air targets could prevent millions of premature deaths globally.',
        example: 'WHO global mortality modeling',
        timeline: '2030 target horizon',
      },
      {
        id: 'visible-change',
        icon: '🏙',
        metric: 'Visible Change Within 5 Years',
        category: 'Environment',
        explanation: 'China reduced urban PM2.5 by 35% through strict industrial controls and enforcement.',
        example: 'China PM2.5 reduction program',
        timeline: '5 years',
      },
      {
        id: 'indoor-air',
        icon: '🏠',
        metric: 'Immediate Indoor Air Improvement',
        category: 'Health',
        explanation: 'Clean cooking technologies can cut indoor PM2.5 exposure by more than 90%.',
        example: 'UNEP and clean cooking initiatives',
        timeline: 'Immediate to 12 months',
      },
      {
        id: 'forecasting',
        icon: '🤖',
        metric: '72-Hour Air Quality Forecasting',
        category: 'Technology',
        explanation: 'Machine-learning systems now predict high-pollution episodes before they occur.',
        example: 'City-level AI forecasting pilots',
        timeline: '1-3 years',
      },
      {
        id: 'asthma',
        icon: '👶',
        metric: 'Reduced Childhood Asthma',
        category: 'Health',
        explanation: 'Low Emission Zones and transport policies reduce pediatric respiratory admissions.',
        example: 'London ULEZ and EEA analyses',
        timeline: '2-4 years',
      },
      {
        id: 'healthcare-cost',
        icon: '💸',
        metric: 'Lower Healthcare Costs',
        category: 'Economy',
        explanation: 'Reduced pollution burden lowers emergency visits and long-term treatment costs.',
        example: 'OECD and World Bank policy impact studies',
        timeline: '3-8 years',
      },
      {
        id: 'productivity',
        icon: '🏭',
        metric: 'Higher Worker Productivity',
        category: 'Economy',
        explanation: 'Cleaner air supports fewer sick days and stronger labor output in major cities.',
        example: 'World Bank urban productivity analysis',
        timeline: '2-6 years',
      },
      {
        id: 'heat-stress',
        icon: '🌳',
        metric: 'Reduced Urban Heat Stress',
        category: 'Environment',
        explanation: 'Urban greening and low-emission transport reduce both PM exposure and heat burden.',
        example: 'Copenhagen and city greening programs',
        timeline: '3-10 years',
      },
      {
        id: 'monitoring',
        icon: '📡',
        metric: 'Fewer Pollution Emergency Days',
        category: 'Technology',
        explanation: 'Smart monitoring networks improve targeting and response to high-risk episodes.',
        example: 'Multi-city AQ monitoring modernization',
        timeline: '1-4 years',
      },
    ] as const;
  }, []);

  const filteredStoryFourOutcomeCards = useMemo(() => {
    if (storyFourOutcomeFilter === 'All') {
      return storyFourOutcomeCards;
    }
    return storyFourOutcomeCards.filter((card) => card.category === storyFourOutcomeFilter);
  }, [storyFourOutcomeFilter, storyFourOutcomeCards]);

  const storyFourCaseStudies = useMemo(() => {
    return [
      {
        id: 'china-pm25',
        title: 'China PM2.5 reduction program',
        policy: 'Industrial emission controls with strict enforcement',
        pollutant: 'PM2.5',
        outcome: '35% reduction in major urban PM2.5 concentrations',
        period: '2014-2019',
      },
      {
        id: 'london-ulez',
        title: 'London ULEZ',
        policy: 'Low Emission Zone and transport pricing',
        pollutant: 'NO2 / PM2.5',
        outcome: 'Substantial roadside NO2 reductions and cleaner vehicle fleet mix',
        period: '2019-present',
      },
      {
        id: 'shenzhen-bus',
        title: 'Shenzhen electric bus fleet',
        policy: 'Electrified public transport rollout',
        pollutant: 'PM2.5 / NO2',
        outcome: 'Strong corridor-level pollution reductions from fleet electrification',
        period: '2010s rollout',
      },
      {
        id: 'copenhagen-cycling',
        title: 'Copenhagen cycling infrastructure',
        policy: 'Active mobility and street redesign',
        pollutant: 'Traffic PM / NO2',
        outcome: 'Lower transport emissions and sustained modal shift',
        period: 'Long-term infrastructure program',
      },
      {
        id: 'california-regulations',
        title: 'California clean-air regulations',
        policy: 'Vehicle and industrial standards with enforcement',
        pollutant: 'Ozone precursors / PM2.5',
        outcome: 'Long-run regional air-quality and health improvements',
        period: 'Multi-decade program',
      },
      {
        id: 'singapore-emissions',
        title: 'Singapore emissions management',
        policy: 'Integrated monitoring, controls, and compliance systems',
        pollutant: 'Multiple pollutants',
        outcome: 'Efficient episode management and data-driven interventions',
        period: 'Continuous modernization',
      },
    ] as const;
  }, []);

  const selectedStoryFourCaseStudy = storyFourCaseStudies.find((caseStudy) => caseStudy.id === storyFourCaseStudyId) || storyFourCaseStudies[0];

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
        const normalizedGeneratedSections = normalizeStorySections(story?.sections, selectedTheme.humanSections);
        setAiStories((current) => ({
          ...current,
          [selectedTheme.id]: {
            title: toSafeText(story?.title) || selectedTheme.title,
            summary: toSafeText(story?.summary) || selectedTheme.overview,
            sections: normalizedGeneratedSections,
            provider: toSafeText(response.data.data.provider) || 'Ollama',
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

  const generateCityRankings = useCallback(async (overrideRankingType?: 'best' | 'worst' | 'both') => {
    const effectiveRankingType = overrideRankingType ?? rankingType;
    setRankingLoading(true);
    setRankingError('');
    setStoryThreeAiTestimonials([]);
    setStoryThreeTestimonialsError('');
    setStoryThreeTestimonialsProvider('');
    setSelectedCityLabel('');
    setSelectedCityBucket(null);
    setCityDetails(null);
    setCityDetailsError('');

    try {
      const response = await storyAPI.generateCityRankings({
        count: rankingCount,
        ranking_type: effectiveRankingType,
      });

      if (response.data?.success) {
        const payload = response.data.data || {};
        const normalizeRows = (rows: any) => (
          Array.isArray(rows)
            ? rows
                .map((row: any, index: number) => {
                  const rank = Number(row?.rank);
                  const avgPm25 = Number(row?.avg_pm25);
                  const sampleCount = Number(row?.sample_count);

                  return {
                    rank: Number.isFinite(rank) ? rank : index + 1,
                    city: toSafeText(row?.city) || 'Unknown city',
                    country: toSafeText(row?.country) || 'Unknown',
                    avg_pm25: Number.isFinite(avgPm25) ? avgPm25 : 0,
                    sample_count: Number.isFinite(sampleCount) ? sampleCount : 0,
                  };
                })
                .filter((row: CityRankingRecord) => row.city.length > 0)
            : []
        );

        const normalizedRankingType = ['best', 'worst', 'both'].includes(String(payload?.ranking_type))
          ? (payload.ranking_type as 'best' | 'worst' | 'both')
          : effectiveRankingType;

        const normalizedRankingResult: CityRankingResult = {
          headline: toSafeText(payload?.headline) || `Top ${rankingCount} ${normalizedRankingType} cities by average PM2.5`,
          summary: toSafeText(payload?.summary) || 'AI-assisted city ranking summary is currently unavailable.',
          insights: toSafeTextList(payload?.insights, [
            'Higher average PM2.5 indicates persistent exposure pressure.',
            'Comparing worst and best cities helps identify policy and emission differences.',
            'Sample count provides confidence context for each ranking row.',
          ]),
          recommendations: toSafeTextList(payload?.recommendations, [
            'Prioritize action in high-burden cities first.',
            'Track changes over time to verify intervention impact.',
          ]),
          ranking_type: normalizedRankingType,
          count: Number.isFinite(Number(payload?.count)) ? Number(payload.count) : rankingCount,
          provider: toSafeText(payload?.provider) || 'fallback',
          worst_cities: normalizeRows(payload?.worst_cities),
          best_cities: normalizeRows(payload?.best_cities),
        };

        setRankingResult(normalizedRankingResult);
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

  const generateStoryThreeTestimonials = useCallback(async () => {
    if (!rankingResult) {
      setStoryThreeTestimonialsError('Run Story 3 ranking first to generate city-linked testimonials.');
      return;
    }

    const sourceCities = rankingResult.worst_cities.slice(0, 6);
    if (!sourceCities.length) {
      setStoryThreeTestimonialsError('No worst-city rows available to generate testimonials.');
      return;
    }

    const localFallbackTestimonials: StoryThreeTestimonial[] = sourceCities.map((row, index) => ({
      id: `local-testimonial-${index}-${row.city}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      quote: `In ${row.city}, air-quality alerts have become part of daily planning for families and commuters.`,
      author: `Resident voice, ${row.city}, ${row.country}`,
      details: `Average PM2.5 is ${row.avg_pm25.toFixed(2)} based on ${row.sample_count} records, and residents describe adjusting school, commute, and outdoor routines around high-pollution days.`,
    }));

    setStoryThreeTestimonialsLoading(true);
    setStoryThreeTestimonialsError('');

    try {
      const response = await storyAPI.generateCityTestimonials({
        cities: sourceCities,
      });

      if (response.data?.success) {
        const testimonials = (response.data.data?.testimonials || []) as Array<{ quote?: string; author?: string; details?: string }>;
        const mappedTestimonials = testimonials
          .map((item, index) => {
            const quote = String(item.quote || '').trim();
            const author = String(item.author || '').trim();
            const details = String(item.details || '').trim();
            if (!quote || !author) {
              return null;
            }
            return {
              id: `ai-testimonial-${index}-${author}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              quote,
              author,
              details,
            };
          })
          .filter(Boolean) as StoryThreeTestimonial[];

        if (!mappedTestimonials.length) {
          throw new Error('AI returned empty testimonials');
        }

        setStoryThreeAiTestimonials(mappedTestimonials);
        setStoryThreeTestimonialsProvider(response.data.data?.provider || 'Ollama');
      } else {
        throw new Error(response.data?.error || 'Failed to generate testimonials');
      }
    } catch (error: any) {
      setStoryThreeAiTestimonials(localFallbackTestimonials);
      setStoryThreeTestimonialsProvider('local-fallback');
      setStoryThreeTestimonialsError('');
    } finally {
      setStoryThreeTestimonialsLoading(false);
    }
  }, [rankingResult]);

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
        const payload = response.data.data || {};
        const normalizedCityDetails: CityDetailsResult = {
          city: toSafeText(payload?.city) || row.city,
          country: toSafeText(payload?.country) || row.country,
          sample_count: Number.isFinite(Number(payload?.sample_count)) ? Number(payload.sample_count) : 0,
          aqi_avg: Number.isFinite(Number(payload?.aqi_avg)) ? Number(payload.aqi_avg) : null,
          geo: {
            latitude: Number.isFinite(Number(payload?.geo?.latitude)) ? Number(payload.geo.latitude) : null,
            longitude: Number.isFinite(Number(payload?.geo?.longitude)) ? Number(payload.geo.longitude) : null,
          },
          pollutant_breakdown: Array.isArray(payload?.pollutant_breakdown)
            ? payload.pollutant_breakdown
            : [],
          top_pollutants: Array.isArray(payload?.top_pollutants)
            ? payload.top_pollutants
            : [],
          reasons: toSafeTextList(payload?.reasons, ['No city-specific reasons are available yet.']),
          problems: toSafeTextList(payload?.problems, ['No city-specific risk summary is available yet.']),
          precautions: toSafeTextList(payload?.precautions, ['No city-specific precautions are available yet.']),
          provider: toSafeText(payload?.provider) || 'fallback',
        };

        setCityDetails(normalizedCityDetails);
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
    if (isAiLikeMode && selectedTheme.status === 'ready' && aiRequested[selectedTheme.id] && !selectedAiStory && !aiLoading) {
      generateAiStory();
    }
  }, [isAiLikeMode, selectedMode, selectedThemeId, selectedTheme.id, selectedTheme.status, selectedAiStory, aiLoading, generateAiStory, aiRequested]);

  useEffect(() => {
    setRankingError('');
    setSelectedCityLabel('');
    setSelectedCityBucket(null);
    setCityDetails(null);
    setCityDetailsError('');
    setStoryThreeAiTestimonials([]);
    setStoryThreeTestimonialsError('');
    setStoryThreeTestimonialsProvider('');
    setStoryThreeHumanTestimonialsRequested(false);
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
                          : hasGeneratedAiStory
                          ? selectedAiSummary
                          : 'Click Generate AI story to reveal the Ollama-generated version for this theme.'}
                      </p>
                      {isAiLikeMode && selectedTheme.status === 'ready' && (
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                          {hasGeneratedAiStory && (
                            <span className="rounded-full px-3 py-1 font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                              Generated by {selectedAiProvider}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={generateAiStory}
                            disabled={aiLoading || hasGeneratedAiStory}
                            className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {aiLoading ? 'Generating...' : hasGeneratedAiStory ? 'Generated AI' : 'Generate AI'}
                          </button>
                          {selectedMode === 'agentic' && hasGeneratedAiStory && (
                            <button
                              type="button"
                              className="rounded-full border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              Humanize AI
                            </button>
                          )}
                        </div>
                      )}
                      {aiError && isAiLikeMode && (
                        <div className="mt-3 space-y-2">
                          {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
                      <div className="grid grid-cols-3 gap-2">
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

                <div className={`grid grid-cols-1 gap-5 ${isPollutionHealthAiView || isStoryFourHumanView || isStoryFourAiView ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
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

                      {selectedMode === 'human' && section.categoryBlocks && isStoryFourHumanView && index === 0 ? (
                        <div className="mt-4 space-y-8">
                          {section.categoryBlocks.map((group) => {
                            const style = storyFourCategoryStyles[group.label] || storyFourCategoryStyles.Personal;

                            return (
                              <section key={group.label} className="space-y-4">
                                <div className={`text-2xl font-semibold ${style.labelClass}`}>{group.label}</div>
                                <div
                                  className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4"
                                  style={{ gridTemplateColumns: `repeat(${Math.min(group.cards.length, 4)}, minmax(0, 1fr))` }}
                                >
                                  {group.cards.map((card) => (
                                    <div key={card.title} className={`overflow-hidden ${style.cardClass} shadow-sm`}>
                                      <div className={`px-4 py-3 text-center text-lg font-bold leading-tight ${style.headerClass}`}>
                                        {card.title}
                                      </div>
                                      <div className="px-4 py-4 text-[17px] leading-snug text-slate-900">
                                        {card.body}
                                      </div>
                                      <div className={`px-4 pb-4 pt-2 text-center text-lg font-bold leading-tight ${style.footerClass}`}>
                                        {card.footer}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            );
                          })}
                        </div>
                      ) : isStoryFourAiView && index === 0 ? (
                        hasGeneratedAiStory ? (
                          <motion.div
                            key={storyFourAiCategory}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.35, ease: 'easeOut' }}
                            className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="space-y-5">
                              <div>
                                <h4 className="mt-3 text-2xl font-black text-slate-950">The air can get better. Here&apos;s how.</h4>
                                <p className="mt-2 text-lg font-semibold text-slate-700">4 categories, 12 proven interventions.</p>
                              </div>

                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {storyFourAiCategoriesList.map((category) => {
                                  const active = storyFourAiCategory === category;
                                  const categoryStyle = storyFourCategoryStyles[category];

                                  return (
                                    <motion.button
                                      key={category}
                                      type="button"
                                      whileTap={{ scale: 0.98 }}
                                      onClick={() => setStoryFourAiCategory(category)}
                                      className={`rounded-2xl border px-4 py-4 text-left transition ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100'}`}
                                    >
                                      <div className={`text-lg font-bold ${active ? 'text-white' : categoryStyle.labelClass}`}>{category}</div>
                                      <div className={`mt-2 text-sm ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                                        {category === 'Personal' && 'Choices for individuals and families'}
                                        {category === 'Household' && 'Actions that improve indoor air immediately'}
                                        {category === 'Community' && 'Neighbourhood action and civic pressure'}
                                        {category === 'Policy' && 'System-level interventions with the largest reach'}
                                      </div>
                                    </motion.button>
                                  );
                                })}
                              </div>

                              <div className="space-y-4">
                                <AnimatePresence mode="wait">
                                  {(storyFourAiCategoryData?.cards || []).map((card) => (
                                    <motion.div
                                      key={card.title}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -8 }}
                                      transition={{ duration: 0.25 }}
                                      className={`overflow-hidden rounded-3xl border border-slate-200 ${storyFourCategoryStyles[storyFourAiCategory]?.cardClass || 'bg-white'} shadow-sm`}
                                    >
                                      <div className={`px-4 py-3 text-center text-lg font-bold ${storyFourCategoryStyles[storyFourAiCategory]?.headerClass || 'bg-slate-600 text-white'}`}>
                                        {card.title}
                                      </div>
                                      <div className="space-y-4 p-4">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                                          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Pollutant affected</div>
                                            <div className="mt-2 text-lg font-bold text-slate-950">{card.pollutant}</div>
                                          </div>
                                          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Reduction</div>
                                            <div className="mt-2 text-lg font-bold text-slate-950">{card.reduction}</div>
                                          </div>
                                          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Impact score</div>
                                            <div className="mt-3 flex items-center gap-3">
                                              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200">
                                                <motion.div
                                                  initial={{ width: 0 }}
                                                  animate={{ width: `${card.impactScore}%` }}
                                                  transition={{ duration: 0.7, ease: 'easeOut' }}
                                                  className="h-full rounded-full bg-slate-950"
                                                />
                                              </div>
                                              <div className="text-lg font-black text-slate-950">{card.impactScore}</div>
                                            </div>
                                          </div>
                                          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Impact chart</div>
                                            <div className="mt-3 h-28">
                                              <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={[{ name: card.title, value: card.impactScore }]}>
                                                  <XAxis dataKey="name" hide />
                                                  <YAxis hide domain={[0, 100]} />
                                                  <Tooltip formatter={(value: number) => [`${value}%`, 'Relative reduction']} />
                                                  <Bar dataKey="value" radius={[12, 12, 0, 0]} fill="#0f172a" />
                                                </BarChart>
                                              </ResponsiveContainer>
                                            </div>
                                          </div>
                                          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Radial impact</div>
                                            <div className="mt-3 h-28">
                                              <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                  <Pie data={[{ name: 'impact', value: card.impactScore }, { name: 'rest', value: 100 - card.impactScore }]} dataKey="value" innerRadius={24} outerRadius={42} startAngle={90} endAngle={-270}>
                                                    <Cell fill="#0f172a" />
                                                    <Cell fill="#e2e8f0" />
                                                  </Pie>
                                                  <Tooltip formatter={(value: number) => [`${value}%`, 'Impact']} />
                                                </PieChart>
                                              </ResponsiveContainer>
                                            </div>
                                          </div>
                                        </div>

                                        <p className="text-[17px] leading-relaxed text-slate-900">{card.body}</p>

                                        <div className="space-y-3">
                                          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Real-world evidence</div>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-700">{card.evidence}</p>
                                          </div>
                                          <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                                            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Example</div>
                                            <p className="mt-2 text-sm leading-relaxed text-slate-700">{card.example}</p>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                                </AnimatePresence>
                              </div>

                              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Impact visualization</div>
                                <p className="mt-2 text-sm text-slate-600">
                                  Compare the relative pollution reduction of each intervention as you switch categories.
                                </p>
                                <div className="mt-5 h-72">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={(storyFourAiCategoryData?.cards || []).map((card) => ({ name: card.title, value: card.impactScore }))} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis type="number" domain={[0, 100]} />
                                      <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 12 }} />
                                      <Tooltip formatter={(value: number) => [`${value}`, 'Impact score']} />
                                      <Bar dataKey="value" radius={[0, 12, 12, 0]} fill="#0f172a" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              <div className="rounded-3xl bg-white p-4 shadow-sm">
                                <div className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Storytelling summary</div>
                                <p className="mt-2 text-base leading-relaxed text-slate-700">
                                  Individual actions improve exposure. Community actions improve neighbourhoods. Policy actions create the largest population-wide impact.
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ) : null
                      ) : isStoryFourAiView && index === 1 ? (
                        hasGeneratedAiStory && storyFourAiVoices.length > 0 ? (
                          <div className="mt-4 space-y-5">
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                              {storyFourAiVoices.map((voice, voiceIndex) => {
                                const active = voiceIndex === storyFourAiVoiceIndex;

                                return (
                                  <motion.button
                                    key={voice.id}
                                    type="button"
                                    onClick={() => setStoryFourAiVoiceIndex(voiceIndex)}
                                    whileTap={{ scale: 0.98 }}
                                    className={`rounded-2xl border p-4 text-left transition ${active ? 'border-slate-950 bg-slate-950 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300'}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                        {voice.person.charAt(0)}
                                      </div>
                                      <div>
                                        <div className="text-base font-bold">{voice.person}</div>
                                        <div className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>Read Story</div>
                                      </div>
                                    </div>
                                    <p className={`mt-3 text-sm leading-relaxed ${active ? 'text-slate-200' : 'text-slate-600'}`}>{voice.preview}</p>
                                  </motion.button>
                                );
                              })}
                            </div>

                            <AnimatePresence mode="wait">
                              {selectedStoryFourAiVoice && (
                                <motion.div
                                  key={selectedStoryFourAiVoice.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -8 }}
                                  transition={{ duration: 0.3, ease: 'easeOut' }}
                                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                                >
                                  <div className="flex items-start gap-3">
                                    <Quote className="mt-1 h-5 w-5 text-sky-600" />
                                    <p className="text-xl font-bold leading-relaxed text-slate-950">{selectedStoryFourAiVoice.quote}</p>
                                  </div>

                                  <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                                    <div className="space-y-3">
                                      <p className="text-sm leading-relaxed text-slate-700">{selectedStoryFourAiVoice.narrative}</p>
                                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                                        <span className="font-bold text-slate-900">Issue: </span>{selectedStoryFourAiVoice.issue}
                                      </div>
                                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-700">
                                        <span className="font-bold text-slate-900">Outcome: </span>{selectedStoryFourAiVoice.outcome}
                                      </div>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="rounded-2xl border border-slate-200 p-3">
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Story impact</div>
                                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                                          <div className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 text-sky-600" /><span><strong>Affected:</strong> {selectedStoryFourAiVoice.affectedPopulation}</span></div>
                                          <div className="flex items-start gap-2"><Wind className="mt-0.5 h-4 w-4 text-sky-600" /><span><strong>Pollutant:</strong> {selectedStoryFourAiVoice.pollutant}</span></div>
                                          <div className="flex items-start gap-2"><HeartPulse className="mt-0.5 h-4 w-4 text-sky-600" /><span><strong>Health:</strong> {selectedStoryFourAiVoice.healthConsequence}</span></div>
                                          <div className="flex items-start gap-2"><Megaphone className="mt-0.5 h-4 w-4 text-sky-600" /><span><strong>Action:</strong> {selectedStoryFourAiVoice.actionTaken}</span></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Timeline</div>
                                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
                                      {['Exposure', 'Health Impact', 'Personal Response', 'Community Action', 'Wider Change'].map((step, stepIndex) => (
                                        <motion.div
                                          key={step}
                                          initial={{ opacity: 0, y: 8 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.25, delay: stepIndex * 0.05 }}
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700"
                                        >
                                          {step}
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="mt-4 rounded-2xl bg-slate-950 p-4 text-slate-100">
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Why this story matters</div>
                                    <p className="mt-2 text-sm leading-relaxed">
                                      Personal experience makes air-quality metrics actionable by connecting exposure data to health outcomes, intervention choices, and policy accountability.
                                    </p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ) : null
                      ) : isStoryFourAiView && index === 2 ? (
                        hasGeneratedAiStory ? (
                          <div className="mt-4 space-y-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                            <div>
                              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Future Outcomes and Pathways to Progress</div>
                              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                                Explore what successful government action can achieve through evidence-backed outcomes, policy timelines, and measurable air-quality improvements.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {(['All', 'Health', 'Economy', 'Environment', 'Technology'] as const).map((filter) => (
                                <button
                                  key={filter}
                                  type="button"
                                  onClick={() => setStoryFourOutcomeFilter(filter)}
                                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${storyFourOutcomeFilter === filter ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
                                >
                                  {filter}
                                </button>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                              <AnimatePresence mode="popLayout">
                                {filteredStoryFourOutcomeCards.map((card) => (
                                  <motion.div
                                    key={card.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 8 }}
                                    transition={{ duration: 0.25 }}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                  >
                                    <div className="text-2xl">{card.icon}</div>
                                    <h5 className="mt-2 text-lg font-bold text-slate-950">{card.metric}</h5>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{card.explanation}</p>
                                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                                      <div><span className="font-semibold text-slate-800">Example:</span> {card.example}</div>
                                      <div><span className="font-semibold text-slate-800">Timeline:</span> {card.timeline}</div>
                                    </div>
                                  </motion.div>
                                ))}
                              </AnimatePresence>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Government Success Stories</div>
                              <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                                <div className="space-y-2">
                                  {storyFourCaseStudies.map((caseStudy) => (
                                    <button
                                      key={caseStudy.id}
                                      type="button"
                                      onClick={() => setStoryFourCaseStudyId(caseStudy.id)}
                                      className={`w-full rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${storyFourCaseStudyId === caseStudy.id ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                                    >
                                      {caseStudy.title}
                                    </button>
                                  ))}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                  <div><span className="font-bold text-slate-900">Policy implemented:</span> {selectedStoryFourCaseStudy.policy}</div>
                                  <div className="mt-2"><span className="font-bold text-slate-900">Pollutant targeted:</span> {selectedStoryFourCaseStudy.pollutant}</div>
                                  <div className="mt-2"><span className="font-bold text-slate-900">Measurable outcome:</span> {selectedStoryFourCaseStudy.outcome}</div>
                                  <div className="mt-2"><span className="font-bold text-slate-900">Implementation period:</span> {selectedStoryFourCaseStudy.period}</div>
                                </div>
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">What Clean Air Looks Like in 2035</div>
                              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                {[
                                  { label: 'Public health', value: '+18% better respiratory outcomes' },
                                  { label: 'Urban air quality', value: '-35% PM2.5 in high-risk corridors' },
                                  { label: 'Life expectancy', value: '+2.4 years in high-burden regions' },
                                  { label: 'Healthcare savings', value: '$180B avoided annual costs' },
                                  { label: 'Sustainability', value: 'Fewer emergency pollution days' },
                                ].map((item, index) => (
                                  <motion.div
                                    key={item.label}
                                    initial={{ opacity: 0, y: 8 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, amount: 0.5 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                  >
                                    <div className="text-xs uppercase tracking-[0.15em] text-slate-500">{item.label}</div>
                                    <div className="mt-2 text-sm font-semibold text-slate-900">{item.value}</div>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null
                      ) : section.bullets && section.bullets.length > 0 && !isAiLikeMode && !(isPollutionHealthAiView && (index === 0 || index === 1)) && (
                        isStoryFourHumanView && index === 1 ? (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-300 bg-white">
                            <div className="grid grid-cols-[0.34fr_0.66fr] border-b border-slate-300 bg-slate-50 text-sm font-bold text-slate-900">
                              <div className="border-r border-slate-300 px-4 py-3">Human voice</div>
                              <div className="px-4 py-3">Story details</div>
                            </div>
                            <div className="divide-y divide-slate-300">
                              {section.bullets.map((bullet) => {
                                const quoteMatch = bullet.match(/^“([^”]+)”\s*[-–—]\s*([^\.]+)\.\s*(.*)$/);
                                const quote = quoteMatch?.[1] ? `“${quoteMatch[1]}”` : bullet;
                                const author = quoteMatch?.[2]?.trim() || '';
                                const details = quoteMatch?.[3]?.trim() || '';
                                const [leadSentence, ...rest] = details.split('. ');
                                const body = rest.length > 0 ? `${leadSentence}. ${rest.join('. ')}` : leadSentence;

                                return (
                                  <div key={bullet} className="grid grid-cols-[0.34fr_0.66fr]">
                                    <div className="border-r border-slate-300 bg-white px-4 py-4 align-top text-sm text-slate-900">
                                      <p className="font-semibold leading-relaxed">{quote}</p>
                                      {author && <p className="mt-2 text-center text-sm text-slate-600">- {author}</p>}
                                    </div>
                                    <div className="bg-white px-4 py-4 text-sm leading-relaxed text-slate-800">
                                      <p>{body}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : isPollutionHealthAiView && index === 2 ? (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="grid grid-cols-1 gap-px bg-slate-200 md:grid-cols-2 xl:grid-cols-4">
                              {section.bullets.map((bullet) => {
                                const [headline, ...rest] = bullet.split(':');
                                const detail = rest.join(':').trim();

                                return (
                                  <div key={bullet} className="min-h-full bg-white p-4 text-sm text-slate-700">
                                    <div className="text-base font-bold text-slate-950">{headline.trim()}</div>
                                    <p className="mt-3 leading-relaxed text-slate-600">{detail || headline.trim()}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <ul className="mt-4 space-y-2">
                            {section.bullets.map((bullet) => (
                              <li key={bullet} className="flex gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-sky-500" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        )
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

                  {canShowStoryThreeAiSections && (
                    <>
                    <div className="mt-6 rounded-2xl border border-sky-200 bg-white p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">
                            <Bot className="h-3.5 w-3.5" />
                            Story 3
                          </div>
                          <h4 className="mt-3 text-xl font-bold text-slate-950">Best and worst cities by AQI</h4>
                          <p className="mt-2 text-sm text-slate-600">
                            Enter how many cities to rank, choose worst, best, or both, then generate AI-powered results.
                          </p>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-auto">
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
                              onChange={(event) => {
                                const nextRankingType = event.target.value as 'best' | 'worst' | 'both';
                                setRankingType(nextRankingType);
                                if (rankingResult) {
                                  void generateCityRankings(nextRankingType);
                                }
                              }}
                              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="worst">Top worst cities</option>
                              <option value="best">Top best cities</option>
                              <option value="both">Worst and best cities</option>
                            </select>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              void generateCityRankings();
                            }}
                            disabled={rankingLoading}
                            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                          >
                            <BarChart3 className="h-4 w-4" />
                            {rankingLoading ? 'Generating...' : 'Run Story 3'}
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
                                      <Bar dataKey="avg_pm25" fill={rankingType === 'best' ? '#16a34a' : '#dc2626'} radius={[8, 8, 0, 0]}>
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
                                        <Bar dataKey="avg_pm25" fill="#16a34a" radius={[8, 8, 0, 0]} />
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

                          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                            <h5 className="text-lg font-bold text-slate-950">City Ranking Details</h5>
                            <p className="mt-1 text-sm text-slate-600">Explore ranked city rows and open city-level profiles in one place.</p>

                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
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
                        </div>
                      )}

                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
                        <h5 className="text-lg font-bold text-slate-950">Human Stories from the Air We Breathe</h5>

                        <button
                          type="button"
                          onClick={() => {
                            setStoryThreeHumanTestimonialsRequested(true);
                            if (!storyThreeAiTestimonials.length && !storyThreeTestimonialsLoading) {
                              void generateStoryThreeTestimonials();
                            }
                          }}
                          disabled={storyThreeTestimonialsLoading}
                          className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {storyThreeTestimonialsLoading ? 'Generating Testimonials...' : 'Generate Human Testimonials'}
                        </button>

                        {storyThreeHumanTestimonialsRequested && storyThreeTestimonialsProvider && storyThreeAiTestimonials.length > 0 && (
                          <div className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Testimonials provider: {storyThreeTestimonialsProvider}
                          </div>
                        )}

                        {storyThreeHumanTestimonialsRequested && storyThreeTestimonialsError && (
                          <p className="mt-3 text-sm text-red-600">{storyThreeTestimonialsError}</p>
                        )}

                        {storyThreeHumanTestimonialsRequested && storyThreeAiTestimonials.length > 0 && (
                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {storyThreeAiTestimonials.map((testimonial) => (
                              <article key={testimonial.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
                                <p className="text-sm text-slate-700">{testimonial.quote}</p>
                                {testimonial.details && (
                                  <p className="mt-2 text-sm text-slate-600">{testimonial.details}</p>
                                )}
                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{testimonial.author}</p>
                              </article>
                            ))}
                          </div>
                        )}
                    </div>
                    </>
                  )}
                </div>

                {selectedTheme.status === 'awaiting-source' && (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
                    Story content for this theme has not been added yet. Send the source text when you are ready,
                    and I will split it into subtopics plus a matching AI/Ollama version.
                  </div>
                )}

                {isAiLikeMode && selectedTheme.status === 'ready' && aiLoading && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
                    Generating a new AI/Ollama story for this theme... this can take a moment on a local model.
                  </div>
                )}

                {isAiLikeMode && selectedTheme.status === 'ready' && !aiLoading && !hasGeneratedAiStory && !aiError && (
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


