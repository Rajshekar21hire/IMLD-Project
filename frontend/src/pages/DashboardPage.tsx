import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe, Users, Wind, HeartPulse, Megaphone, Quote, MessageSquare } from 'lucide-react';
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
import { storyAPI } from '../services/api';
import { storyModes } from '../data/storyModes';
import { FEEDBACK_LINKS } from '../data/feedbackLinks';
import { storyThemes } from '../data/storyThemeData';
import { StoryMode, StoryTheme, StorySection, StoryCategoryBlock } from '../data/storyTypes';
import { DotPlot } from '../components/BubbleMatrix';
import SkyBackground from '../components/SkyBackground';
import { AirshedHeroSection } from '../components/AirshedHeroSection';
import { BestWorstAirQualitySection } from '../components/BestWorstAirQualitySection';
import { RootCauseExplorerSection } from '../components/RootCauseExplorerSection';
import { ReadingPatternSection } from '../components/ReadingPatternSection';
import { DeepDiveFlowSection } from '../components/DeepDiveFlowSection';
import { AgenticAiSection } from '../components/AgenticAiSection';
import { DeepDivesWorstAffectedSection } from '../components/DeepDivesWorstAffectedSection';
import { AirCanGetBetterSection } from '../components/AirCanGetBetterSection';

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

interface StoryThreeTestimonial {
  id: string;
  quote: string;
  author: string;
  details: string;
}

type StoryFourHumanCategory = 'Personal' | 'Household' | 'Policy' | 'Community';

interface DeepDiveNarrative {
  intro: string[];
  pattern_cards: { eyebrow: string; title: string; body: string }[];
  intervention_intro: string;
  impact_intro: string;
}

interface DeepDiveInterventionText {
  id: string;
  stat: string;
  detail: string;
}

interface DeepDiveImpactText {
  id: string;
  detail: string;
}

interface ThreeDBarShapeProps {
  fill?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

function shiftHexColor(hex: string, amount: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return hex;

  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const read = (index: number) => parseInt(normalized.slice(index, index + 2), 16);
  const write = (value: number) => clamp(value).toString(16).padStart(2, '0');

  return `#${write(read(0) + amount)}${write(read(2) + amount)}${write(read(4) + amount)}`;
}

function ThreeDBarShape({ fill = '#60a5fa', x = 0, y = 0, width = 0, height = 0 }: ThreeDBarShapeProps) {
  if (width <= 0 || height <= 0) return null;
  if (width < 10 || height < 10) {
    return <rect x={x} y={y} width={width} height={height} rx={4} ry={4} fill={fill} />;
  }

  const depth = Math.min(12, Math.max(6, width * 0.24, height * 0.08));
  const frontWidth = Math.max(0, width - depth);
  const frontHeight = Math.max(0, height - depth);
  const frontY = y + depth;
  const topPoints = [
    `${x},${frontY}`,
    `${x + depth},${y}`,
    `${x + width},${y}`,
    `${x + frontWidth},${frontY}`,
  ].join(' ');
  const sidePoints = [
    `${x + frontWidth},${frontY}`,
    `${x + width},${y}`,
    `${x + width},${y + frontHeight}`,
    `${x + frontWidth},${y + height}`,
  ].join(' ');

  return (
    <g>
      <polygon points={topPoints} fill={shiftHexColor(fill, 55)} />
      <polygon points={sidePoints} fill={shiftHexColor(fill, -60)} />
      <rect x={x} y={frontY} width={frontWidth} height={frontHeight} rx={7} ry={7} fill={fill} />
      <rect
        x={x + Math.max(2, frontWidth * 0.12)}
        y={frontY + Math.max(3, frontHeight * 0.05)}
        width={Math.max(4, frontWidth * 0.16)}
        height={Math.max(10, frontHeight * 0.82)}
        rx={4}
        ry={4}
        fill="rgba(255,255,255,0.24)"
      />
    </g>
  );
}

interface StoryFourHumanIntervention {
  id: string;
  category: StoryFourHumanCategory;
  title: string;
  stat: string;
  detail: string;
  iconKey:
    | 'ev'
    | 'bike'
    | 'induction'
    | 'flame-out'
    | 'purifier'
    | 'solar'
    | 'factory'
    | 'bus'
    | 'field'
    | 'tree'
    | 'zone'
    | 'monitor';
}

interface StoryFourImpactStat {
  id: string;
  value: string;
  label: string;
  detail: string;
}

const storyFourHumanInterventions: StoryFourHumanIntervention[] = [
  {
    id: 'personal-ev',
    category: 'Personal',
    title: 'Switch to an electric or hybrid vehicle',
    stat: 'NO2 cut 60 to 100% per vehicle',
    detail:
      'Road transport is the largest single contributor to urban NO2. Switching from petrol removes tailpipe PM2.5 entirely. If you cannot switch, walk, cycle, or use public transport.',
    iconKey: 'ev',
  },
  {
    id: 'personal-bike',
    category: 'Personal',
    title: 'Choose cycling or walking for short trips',
    stat: 'Zero tailpipe emissions per trip',
    detail:
      'Every trip shifted from car to bike removes a vehicle from the road and removes you as a pollution source. It also lowers time spent in traffic exposure zones.',
    iconKey: 'bike',
  },
  {
    id: 'household-induction',
    category: 'Household',
    title: 'Replace gas cooking with induction',
    stat: 'Indoor NO2 cut up to 40%',
    detail:
      'Gas hobs release NO2 and PM2.5 directly into the kitchen. Induction cooking is zero emission at point of use and lowers indoor exposure quickly.',
    iconKey: 'induction',
  },
  {
    id: 'household-flame',
    category: 'Household',
    title: 'Stop burning wood or waste indoors',
    stat: 'Indoor PM2.5 cut 50 to 90%',
    detail:
      'Open fires and wood stoves are a major source of indoor PM2.5. Move to certified low emission alternatives or remove combustion heating where possible.',
    iconKey: 'flame-out',
  },
  {
    id: 'household-purifier',
    category: 'Household',
    title: 'Use a HEPA air purifier indoors',
    stat: 'Indoor PM2.5 cut 70 to 90%',
    detail:
      'A HEPA purifier in a bedroom lowers overnight PM2.5 exposure. This is one of the strongest personal health improvements during sleep hours.',
    iconKey: 'purifier',
  },
  {
    id: 'household-solar',
    category: 'Household',
    title: 'Switch to solar or renewable electricity',
    stat: 'SO2 and PM demand eliminated',
    detail:
      'Coal power remains a leading source of SO2 globally. Shifting demand to renewable supply reduces pressure on the most polluting generation sources.',
    iconKey: 'solar',
  },
  {
    id: 'policy-factory',
    category: 'Policy',
    title: 'Industrial emission standards with enforcement',
    stat: 'PM2.5 cut 35%, China, 5 years',
    detail:
      'Mandatory scrubbers, fuel switching, and real time stack checks with penalties can produce fast results. China reduced PM2.5 by 35% from 2014 to 2019.',
    iconKey: 'factory',
  },
  {
    id: 'policy-bus',
    category: 'Policy',
    title: 'Electrify urban bus fleets',
    stat: 'PM2.5 cut 48% in corridors',
    detail:
      'Shenzhen deployed about 16,000 electric buses and reduced bus linked PM2.5 in major travel corridors by 48%, with gains for high traffic neighborhoods.',
    iconKey: 'bus',
  },
  {
    id: 'policy-field',
    category: 'Policy',
    title: 'End agricultural burning, with alternatives',
    stat: 'Delhi winter AQI down 30% potential',
    detail:
      'Seasonal stubble burning drives severe winter events. Incentives for mechanical harvesters and payments for no burn practices work better than bans alone.',
    iconKey: 'field',
  },
  {
    id: 'community-tree',
    category: 'Community',
    title: 'Plant trees on busy streets',
    stat: 'PM2.5 cut 15 to 25% on tree lined streets',
    detail:
      'Street trees absorb NO2 through leaf stomata and trap particulates on canopy surfaces. Correct species and maintenance improve local street level protection.',
    iconKey: 'tree',
  },
  {
    id: 'community-zone',
    category: 'Community',
    title: 'Advocate for a low emission zone in your city',
    stat: 'NO2 cut 30 to 50% in zone',
    detail:
      'London ULEZ lowered roadside NO2 by 44% and helped reduce asthma hospitalizations. More than 320 low emission zones now operate across Europe.',
    iconKey: 'zone',
  },
  {
    id: 'community-monitor',
    category: 'Community',
    title: 'Demand real time AQI monitoring and data',
    stat: 'Foundation for all other action',
    detail:
      'Cities cannot manage what they do not measure. Public monitoring and transparent data make interventions visible, enforceable, and trusted by communities.',
    iconKey: 'monitor',
  },
];

const storyFourImpactStats: StoryFourImpactStat[] = [
  {
    id: 'lives',
    value: '3.7M',
    label: 'lives saved per year',
    detail:
      'Meeting WHO 2030 clean air targets could remove most population level pollution deaths. South Asia could gain around five years of life expectancy in the highest burden regions.',
  },
  {
    id: 'years',
    value: '5 yrs',
    label: 'to see visible change',
    detail:
      'China cut PM2.5 by 35% within five years through industrial regulation and enforcement. London ULEZ also produced major roadside NO2 cuts in a similarly short time frame.',
  },
  {
    id: 'indoor',
    value: '90%',
    label: 'less indoor PM2.5, immediately',
    detail:
      'Moving from wood fire to clean cookstoves can lower indoor PM2.5 by more than 90% from day one. Children in clean households report far fewer respiratory infections.',
  },
  {
    id: 'warning',
    value: '48 hrs',
    label: 'of advance warning now possible',
    detail:
      'Machine learning systems now forecast city level AQI up to 72 hours ahead with high accuracy. This enables schools and health systems to act before hazardous episodes peak.',
  },
];

const StoryFourIcon: React.FC<{ iconKey: StoryFourHumanIntervention['iconKey'] }> = ({ iconKey }) => {
  switch (iconKey) {
    case 'ev':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="16" y="34" width="72" height="22" rx="7" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M24 34 L34 22 H66 L76 34" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="34" cy="60" r="8" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-spin" />
          <circle cx="72" cy="60" r="8" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-spin" />
          <path d="M94 26 L106 26 L98 39 H108" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-pulse" />
        </svg>
      );
    case 'bike':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <circle cx="28" cy="58" r="10" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-spin" />
          <circle cx="82" cy="58" r="10" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-spin" />
          <path d="M28 58 L48 38 L62 58 L48 58 Z" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M62 58 L72 40 H88" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M43 34 H54" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-sway" />
        </svg>
      );
    case 'induction':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="26" y="46" width="68" height="16" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="40" cy="54" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="60" cy="54" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="80" cy="54" r="5" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M44 40 C42 33, 46 28, 44 21" fill="none" stroke="currentColor" strokeWidth="2.5" className="s4h-rise" />
          <path d="M60 40 C58 33, 62 28, 60 21" fill="none" stroke="currentColor" strokeWidth="2.5" className="s4h-rise s4h-delay-1" />
          <path d="M76 40 C74 33, 78 28, 76 21" fill="none" stroke="currentColor" strokeWidth="2.5" className="s4h-rise s4h-delay-2" />
        </svg>
      );
    case 'flame-out':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <path d="M60 58 C76 58,80 42,68 31 C67 39,58 41,60 58 Z" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-flicker" />
          <path d="M57 58 C44 58,40 43,48 35 C48 41,55 45,57 58 Z" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-flicker s4h-delay-1" />
          <path d="M36 22 L86 68" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case 'purifier':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="26" y="20" width="52" height="44" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="52" cy="42" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" className="s4h-spin" />
          <path d="M52 32 L52 52 M42 42 L62 42" stroke="currentColor" strokeWidth="2.5" className="s4h-spin" />
          <circle cx="90" cy="28" r="2.5" fill="currentColor" className="s4h-drift" />
          <circle cx="98" cy="40" r="2" fill="currentColor" className="s4h-drift s4h-delay-1" />
          <circle cx="88" cy="52" r="2" fill="currentColor" className="s4h-drift s4h-delay-2" />
        </svg>
      );
    case 'solar':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="30" y="40" width="54" height="22" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M30 47 H84 M30 54 H84 M43 40 V62 M56 40 V62 M69 40 V62" stroke="currentColor" strokeWidth="2" />
          <circle cx="94" cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M94 8 V13 M94 31 V36 M80 22 H85 M103 22 H108 M84 12 L88 16 M100 28 L104 32 M84 32 L88 28 M100 16 L104 12" stroke="currentColor" strokeWidth="2" className="s4h-spin-slow" />
          <rect x="34" y="43" width="10" height="4" fill="currentColor" className="s4h-glint" />
        </svg>
      );
    case 'factory':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <path d="M24 58 H96 V34 L80 42 V34 L62 42 V28 H24 Z" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="34" y="18" width="9" height="18" fill="none" stroke="currentColor" strokeWidth="3" />
          <circle cx="38" cy="13" r="3" fill="currentColor" className="s4h-smoke" />
          <circle cx="46" cy="10" r="2.5" fill="currentColor" className="s4h-smoke s4h-delay-1" />
          <circle cx="32" cy="8" r="2" fill="currentColor" className="s4h-smoke s4h-delay-2" />
        </svg>
      );
    case 'bus':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="22" y="26" width="72" height="30" rx="8" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M30 34 H86" stroke="currentColor" strokeWidth="2" />
          <circle cx="40" cy="58" r="7" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-spin" />
          <circle cx="76" cy="58" r="7" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-spin" />
          <path d="M98 28 L108 28 L102 39 H110" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-pulse" />
        </svg>
      );
    case 'field':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <path d="M20 58 C36 52, 52 64, 68 58 C84 52, 96 60, 104 57" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M20 66 C36 60, 52 72, 68 66 C84 60, 96 68, 104 65" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M58 47 C66 47,70 39,64 33 C63 36,58 39,58 47 Z" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-flicker" />
          <path d="M50 25 L72 55" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case 'tree':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="56" y="44" width="8" height="18" rx="3" fill="currentColor" />
          <circle cx="60" cy="34" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="s4h-breathe" />
          <circle cx="46" cy="38" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" className="s4h-sway" />
          <circle cx="74" cy="38" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" className="s4h-sway s4h-delay-1" />
        </svg>
      );
    case 'zone':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="46" y="34" width="28" height="22" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M36 44 H46 M74 44 H84 M60 24 V34 M60 56 V66" stroke="currentColor" strokeWidth="3" />
          <circle cx="60" cy="45" r="18" fill="none" stroke="currentColor" strokeWidth="2" className="s4h-ring" />
          <circle cx="60" cy="45" r="26" fill="none" stroke="currentColor" strokeWidth="2" className="s4h-ring s4h-delay-1" />
        </svg>
      );
    case 'monitor':
      return (
        <svg viewBox="0 0 120 80" className="s4h-icon-svg" aria-hidden="true">
          <rect x="24" y="20" width="72" height="44" rx="7" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="38" y="48" width="8" height="10" rx="2" fill="currentColor" className="s4h-bar" />
          <rect x="52" y="42" width="8" height="16" rx="2" fill="currentColor" className="s4h-bar s4h-delay-1" />
          <rect x="66" y="36" width="8" height="22" rx="2" fill="currentColor" className="s4h-bar s4h-delay-2" />
          <circle cx="84" cy="30" r="3" fill="currentColor" className="s4h-blink" />
        </svg>
      );
    default:
      return null;
  }
};

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

const STORY_STUDIO_SIDEBAR_THEME_IDS = ['aqi-and-decisions'] as const;

export const DashboardPage: React.FC = () => {
  const standardPm25Value = 5;
  const sidebarThemes = useMemo(
    () => storyThemes.filter((theme) => theme.id === STORY_STUDIO_SIDEBAR_THEME_IDS[0]),
    []
  );
  const defaultThemeId = sidebarThemes[0]?.id || storyThemes[0]?.id;
  const [selectedThemeId, setSelectedThemeId] = useState(defaultThemeId);
  const [selectedMode, setSelectedMode] = useState<StoryMode>('human');
  const [aiStories] = useState<Record<string, { title: string; summary: string; sections: StorySection[]; provider?: string }>>({});
  const [rankingCount, setRankingCount] = useState(5);
  const [rankingType, setRankingType] = useState<'best' | 'worst' | 'both'>('worst');
  const [rankingCache, setRankingCache] = useState<Record<string, CityRankingResult>>({});
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState('');
  const [rankingResult, setRankingResult] = useState<CityRankingResult | null>(null);
  const [storyFourAiCategory, setStoryFourAiCategory] = useState('Personal');
  const [storyFourAiVoiceIndex, setStoryFourAiVoiceIndex] = useState(0);
  const [storyFourOutcomeFilter, setStoryFourOutcomeFilter] = useState<'All' | 'Health' | 'Economy' | 'Environment' | 'Technology'>('All');
  const [storyFourCaseStudyId, setStoryFourCaseStudyId] = useState('china-pm25');
  const [storyFourHumanCategory, setStoryFourHumanCategory] = useState<StoryFourHumanCategory>('Personal');
  const [storyFourFlippedCards, setStoryFourFlippedCards] = useState<Record<string, boolean>>({});
  const [storyFourExpandedImpactId, setStoryFourExpandedImpactId] = useState<string | null>(null);

  const [deepDiveCategory, setDeepDiveCategory] = useState<StoryFourHumanCategory>('Personal');
  const [deepDiveFlippedCards, setDeepDiveFlippedCards] = useState<Record<string, boolean>>({});
  const [deepDiveExpandedImpactId, setDeepDiveExpandedImpactId] = useState<string | null>(null);
  const [deepDiveNarrative, setDeepDiveNarrative] = useState<Partial<Record<'ai' | 'agentic', DeepDiveNarrative>>>({});
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState('');
  const [deepDiveInterventions, setDeepDiveInterventions] = useState<Partial<Record<'ai' | 'agentic', DeepDiveInterventionText[]>>>({});
  const [deepDiveInterventionsLoading, setDeepDiveInterventionsLoading] = useState(false);
  const [deepDiveInterventionsError, setDeepDiveInterventionsError] = useState('');
  const [deepDiveImpactTexts, setDeepDiveImpactTexts] = useState<Partial<Record<'ai' | 'agentic', DeepDiveImpactText[]>>>({});
  const [deepDiveImpactLoading, setDeepDiveImpactLoading] = useState(false);
  const [deepDiveImpactError, setDeepDiveImpactError] = useState('');

  const [storyThreeAiTestimonials, setStoryThreeAiTestimonials] = useState<StoryThreeTestimonial[]>([]);
  const [storyThreeTestimonialsLoading, setStoryThreeTestimonialsLoading] = useState(false);
  const [storyThreeTestimonialsError, setStoryThreeTestimonialsError] = useState('');
  const [storyThreeTestimonialsProvider, setStoryThreeTestimonialsProvider] = useState('');
  const [storyThreeHumanTestimonialsRequested, setStoryThreeHumanTestimonialsRequested] = useState(false);

  const selectedTheme = useMemo(
    () => sidebarThemes.find((theme) => theme.id === selectedThemeId) ?? sidebarThemes[0] ?? storyThemes[0],
    [selectedThemeId, sidebarThemes]
  );
  const selectedAiStory = aiStories[selectedTheme.id];
  const normalizedAiSections = useMemo(
    () => normalizeStorySections(selectedAiStory?.sections, selectedTheme.humanSections),
    [selectedAiStory?.sections, selectedTheme.humanSections]
  );
  const selectedAiSummary = toSafeText(selectedAiStory?.summary) || selectedTheme.overview;
  const hasGeneratedAiStory = true;
  const isAiLikeMode = selectedMode !== 'human';
  const isStoryThreeAiView = selectedTheme.id === 'aqi-and-decisions' && isAiLikeMode;
  const canShowStoryThreeAiSections = isStoryThreeAiView;
  const activeSections = useMemo(
    () => {
      if (selectedMode === 'human') {
        if (selectedTheme.id === 'measurement-and-governance') {
          // Story 4 human mode uses a dedicated editorial layout rendered below.
          return [];
        }
        return selectedTheme.humanSections;
      }
      if (isStoryThreeAiView && !canShowStoryThreeAiSections) {
        return [];
      }
      if (selectedTheme.id === 'aqi-and-decisions') {
        // Story 3 AI/Agentic view shows only the ranking panel below, not the subtopic cards.
        return [];
      }
      if (selectedTheme.id === 'measurement-and-governance') {
        // Story 4 AI view always shows exactly three subtopics; pad with human sections if AI returned fewer.
        const padded = [0, 1, 2].map(
          (i) => normalizedAiSections[i] ?? selectedTheme.humanSections[i]
        );
        return padded.map((section, index) => {
          if (index === 1) {
            return {
              ...section,
              title: 'Human element - resident testimonials, health worker interviews',
            };
          }
          if (index === 2) {
            return {
              ...section,
              title: 'What governments must do',
            };
          }
          return section;
        });
      }
      return normalizedAiSections;
    },
    [selectedTheme, selectedMode, normalizedAiSections, isStoryThreeAiView, canShowStoryThreeAiSections]
  );
  const hasComparisonGrid = useMemo(
    () => activeSections.some((section: StorySection) => Boolean(section.table)),
    [activeSections]
  );
  const isDeepDivesTheme = selectedTheme.id === 'aqi-and-decisions' && hasComparisonGrid;

  const isStoryThreeHumanView = selectedTheme.id === 'aqi-and-decisions' && selectedMode === 'human';
  const storyThreeTestimonialIntroIndex = useMemo(() => {
    if (!isStoryThreeHumanView) {
      return -1;
    }
    const introIndex = selectedTheme.humanSections.findIndex(
      (section) => section.title === 'Human stories: Real lives shaped by air quality'
    );
    return introIndex >= 0 ? introIndex : 1;
  }, [isStoryThreeHumanView, selectedTheme]);
  const storyThreeTestimonials = useMemo<StorySection[]>(() => {
    if (!isStoryThreeHumanView) {
      return [];
    }
    return selectedTheme.humanSections.filter((section, index) => {
      if (index <= storyThreeTestimonialIntroIndex) {
        return false;
      }
      // Keep the final summary section in the main grid, not in testimonial cards.
      if (index === selectedTheme.humanSections.length - 1) {
        return false;
      }
      return Boolean(section.body?.trim());
    });
  }, [isStoryThreeHumanView, selectedTheme, storyThreeTestimonialIntroIndex]);
  const isStoryFourHumanView = selectedTheme.id === 'measurement-and-governance' && selectedMode === 'human';
  const isStoryFourAiView = selectedTheme.id === 'measurement-and-governance' && isAiLikeMode;
  const storyFourHumanCategoryTabs = useMemo(
    () => [
      { id: 'Personal' as const, emoji: '🚲' },
      { id: 'Household' as const, emoji: '🏠' },
      { id: 'Policy' as const, emoji: '🏛️' },
      { id: 'Community' as const, emoji: '🌳' },
    ],
    []
  );
  const storyFourHumanCards = useMemo(
    () => storyFourHumanInterventions.filter((item) => item.category === storyFourHumanCategory),
    [storyFourHumanCategory]
  );
  const storyFourHumanPalette: Record<
    StoryFourHumanCategory,
    { accent: string; tint: string; text: string; glowA: string; glowB: string; glowC: string }
  > = {
    Personal: {
      accent: '#2A5FA5',
      tint: '#E7EFF8',
      text: '#173764',
      glowA: '#3B82F6',
      glowB: '#06B6D4',
      glowC: '#A78BFA',
    },
    Household: {
      accent: '#B8720F',
      tint: '#FBF0DD',
      text: '#6A4308',
      glowA: '#F97316',
      glowB: '#F59E0B',
      glowC: '#FB7185',
    },
    Policy: {
      accent: '#6A4A9E',
      tint: '#EFEAF7',
      text: '#3E2A60',
      glowA: '#8B5CF6',
      glowB: '#EC4899',
      glowC: '#22D3EE',
    },
    Community: {
      accent: '#357A4A',
      tint: '#E7F2EA',
      text: '#1F4A2C',
      glowA: '#22C55E',
      glowB: '#14B8A6',
      glowC: '#FACC15',
    },
  };
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
    // Use AI-generated bullets when available; fall back to curated human bullets.
    const aiVoiceSection = normalizedAiSections[1];
    const humanVoiceSection = selectedTheme.humanSections[1];
    const sourceBullets =
      (aiVoiceSection?.bullets?.length ? aiVoiceSection.bullets : humanVoiceSection?.bullets) || [];

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

  useEffect(() => {
    if (!isStoryFourHumanView) {
      setStoryFourFlippedCards({});
      setStoryFourExpandedImpactId(null);
      setStoryFourHumanCategory('Personal');
    }
  }, [isStoryFourHumanView]);

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

  const generateCityRankings = useCallback(async () => {
    const rankingMode: 'ai' | 'agentic' = selectedMode === 'agentic' ? 'agentic' : 'ai';
    const cacheKey = `${rankingType}-${rankingCount}-${rankingMode}`;
    const cached = rankingCache[cacheKey];
    if (cached) {
      setRankingResult(cached);
      setRankingError('');
      return;
    }

    setRankingLoading(true);
    setRankingError('');
    setStoryThreeAiTestimonials([]);
    setStoryThreeTestimonialsError('');
    setStoryThreeTestimonialsProvider('');

    try {
      const response = await storyAPI.generateCityRankings({
        count: rankingCount,
        ranking_type: rankingType,
        mode: rankingMode,
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
          : rankingType;

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
        setRankingCache((current) => ({ ...current, [cacheKey]: normalizedRankingResult }));
      } else {
        throw new Error(response.data?.error || 'Failed to generate city rankings');
      }
    } catch (error: any) {
      // The backend always returns generated-or-fallback content now (never a 502/error for
      // Ollama being unavailable), so this only fires on a genuine network failure. Log it for
      // debugging rather than surfacing red "not available" text - retrying on the next render
      // is quieter and this state should be rare in practice.
      console.error('City rankings request failed:', error);
      setRankingError(error.response?.data?.error || error.message || 'Failed to generate city rankings');
    } finally {
      setRankingLoading(false);
    }
  }, [rankingCount, rankingType, rankingCache, selectedMode]);

  useEffect(() => {
    if (isStoryThreeAiView && selectedMode !== 'agentic') {
      void generateCityRankings();
    }
  }, [isStoryThreeAiView, selectedMode, generateCityRankings]);

  const deepDiveMode: 'ai' | 'agentic' = selectedMode === 'agentic' ? 'agentic' : 'ai';
  const deepDiveAccent = deepDiveMode === 'agentic'
    ? {
        eyebrow: 'text-indigo-700',
        cardBorder: 'border-t-indigo-400',
        wrapperBorder: 'border-indigo-200',
        impactBg: '#C7D2FE',
      }
    : {
        eyebrow: 'text-cyan-700',
        cardBorder: 'border-t-cyan-400',
        wrapperBorder: 'border-cyan-200',
        impactBg: '#A5F3FC',
      };
  const OllamaTag: React.FC<{ className?: string }> = ({ className }) => (
    <span
      className={`inline-flex items-center rounded-full border ${deepDiveAccent.wrapperBorder} bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${deepDiveAccent.eyebrow} ${className || ''}`}
    >
      Generated by Ollama
    </span>
  );

  const generateDeepDiveNarrative = useCallback(async (mode: 'ai' | 'agentic') => {
    setDeepDiveLoading(true);
    setDeepDiveError('');

    try {
      const response = await storyAPI.generateDeepDiveNarrative({ mode });

      if (response.data?.success) {
        const narrative = response.data.data?.narrative || {};
        const normalized: DeepDiveNarrative = {
          intro: toSafeTextList(narrative?.intro, [
            'These five cities share a structural cluster of causes that repeats across the region.',
          ]),
          pattern_cards: Array.isArray(narrative?.pattern_cards)
            ? narrative.pattern_cards.slice(0, 3).map((card: any) => ({
                eyebrow: toSafeText(card?.eyebrow) || 'Pattern',
                title: toSafeText(card?.title) || 'A shared cause',
                body: toSafeText(card?.body) || '',
              }))
            : [],
          intervention_intro: toSafeText(narrative?.intervention_intro) || 'Proven fixes exist across personal, household, policy, and community action.',
          impact_intro: toSafeText(narrative?.impact_intro) || 'Adopting these interventions globally would produce measurable gains within years, not decades.',
        };

        if (normalized.pattern_cards.length === 0) {
          throw new Error('AI returned an incomplete narrative');
        }

        setDeepDiveNarrative((current) => ({ ...current, [mode]: normalized }));
      } else {
        throw new Error(response.data?.error || 'Failed to generate the deep-dive narrative');
      }
    } catch (error: any) {
      // Same reasoning as generateCityRankings' catch above: the backend always returns
      // generated-or-fallback content now, so this is a genuine network failure, not an "AI not
      // available" case - log it instead of showing red error text for a section that should
      // always render something.
      console.error('Deep-dive narrative request failed:', error);
      setDeepDiveError(error.response?.data?.error || error.message || 'Failed to generate the deep-dive narrative');
    } finally {
      setDeepDiveLoading(false);
    }
  }, []);

  const generateDeepDiveInterventions = useCallback(async (mode: 'ai' | 'agentic') => {
    setDeepDiveInterventionsLoading(true);
    setDeepDiveInterventionsError('');

    try {
      const response = await storyAPI.generateDeepDiveInterventions({ mode });

      if (response.data?.success) {
        const items = response.data.data?.interventions;
        const normalized: DeepDiveInterventionText[] = Array.isArray(items)
          ? items
              .map((item: any) => ({
                id: toSafeText(item?.id),
                stat: toSafeText(item?.stat),
                detail: toSafeText(item?.detail),
              }))
              .filter((item: DeepDiveInterventionText) => item.id && item.stat && item.detail)
          : [];

        if (normalized.length !== storyFourHumanInterventions.length) {
          throw new Error('AI returned incomplete intervention text');
        }

        setDeepDiveInterventions((current) => ({ ...current, [mode]: normalized }));
      } else {
        throw new Error(response.data?.error || 'Failed to generate intervention text');
      }
    } catch (error: any) {
      setDeepDiveInterventionsError(error.response?.data?.error || error.message || 'Failed to generate intervention text');
    } finally {
      setDeepDiveInterventionsLoading(false);
    }
  }, []);

  const generateDeepDiveImpact = useCallback(async (mode: 'ai' | 'agentic') => {
    setDeepDiveImpactLoading(true);
    setDeepDiveImpactError('');

    try {
      const response = await storyAPI.generateDeepDiveImpact({ mode });

      if (response.data?.success) {
        const items = response.data.data?.impact_stats;
        const normalized: DeepDiveImpactText[] = Array.isArray(items)
          ? items
              .map((item: any) => ({
                id: toSafeText(item?.id),
                detail: toSafeText(item?.detail),
              }))
              .filter((item: DeepDiveImpactText) => item.id && item.detail)
          : [];

        if (normalized.length !== storyFourImpactStats.length) {
          throw new Error('AI returned incomplete impact text');
        }

        setDeepDiveImpactTexts((current) => ({ ...current, [mode]: normalized }));
      } else {
        throw new Error(response.data?.error || 'Failed to generate impact text');
      }
    } catch (error: any) {
      setDeepDiveImpactError(error.response?.data?.error || error.message || 'Failed to generate impact text');
    } finally {
      setDeepDiveImpactLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isStoryThreeAiView && selectedMode !== 'agentic' && !deepDiveNarrative[deepDiveMode] && !deepDiveLoading) {
      void generateDeepDiveNarrative(deepDiveMode);
    }
  }, [isStoryThreeAiView, selectedMode, deepDiveMode, deepDiveNarrative, deepDiveLoading, generateDeepDiveNarrative]);

  useEffect(() => {
    if (isStoryThreeAiView && !deepDiveInterventions[deepDiveMode] && !deepDiveInterventionsLoading) {
      void generateDeepDiveInterventions(deepDiveMode);
    }
  }, [isStoryThreeAiView, deepDiveMode, deepDiveInterventions, deepDiveInterventionsLoading, generateDeepDiveInterventions]);

  useEffect(() => {
    if (isStoryThreeAiView && !deepDiveImpactTexts[deepDiveMode] && !deepDiveImpactLoading) {
      void generateDeepDiveImpact(deepDiveMode);
    }
  }, [isStoryThreeAiView, deepDiveMode, deepDiveImpactTexts, deepDiveImpactLoading, generateDeepDiveImpact]);

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

  useEffect(() => {
    if (!sidebarThemes.some((theme) => theme.id === selectedThemeId)) {
      setSelectedThemeId(defaultThemeId);
    }
  }, [selectedThemeId, sidebarThemes, defaultThemeId]);

  useEffect(() => {
    setRankingError('');
    setStoryThreeAiTestimonials([]);
    setStoryThreeTestimonialsError('');
    setStoryThreeTestimonialsProvider('');
    setStoryThreeHumanTestimonialsRequested(false);
  }, [selectedThemeId, selectedMode]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div
      id="story-studio-top"
      className={`story-studio-page story-studio-theme ss-mode-${selectedMode} relative min-h-screen overflow-hidden bg-transparent`}
    >
      <SkyBackground />

      <style>{`
        .story-studio-theme {
          --ss-bg-0: #f8fafc;
          --ss-bg-1: #eef3f8;
          --ss-bg-2: #eaf6ff;
          --ss-bg-3: #d6ecff;
          --ss-bg-4: #c1e1ff;
          --ss-accent: #7ab8e6;
          --ss-border: rgba(163, 177, 198, 0.35);
          --ss-text: #17324a;
          --ss-muted: #4a6075;
        }

        .story-studio-page .story-studio-shell {
          background: transparent !important;
        }

        .story-studio-page .ss-structural,
        .story-studio-page .ss-structural > section,
        .story-studio-page .ss-structural-section,
        .story-studio-page main > section,
        .story-studio-page main > article > section,
        .story-studio-page .ss-subgrid > article,
        .story-studio-page .ss-subgrid > section {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .story-studio-theme .ss-fog-layer {
          position: absolute;
          left: -5%;
          width: 110%;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(22px);
          opacity: 0.55;
          animation: ssFogFloat 28s ease-in-out infinite;
        }

        .story-studio-theme .ss-fog-layer-1 {
          top: 8%;
          height: 180px;
          background: linear-gradient(90deg, rgba(234, 246, 255, 0.15), rgba(214, 236, 255, 0.5), rgba(226, 232, 240, 0.2));
        }

        .story-studio-theme .ss-fog-layer-2 {
          top: 30%;
          height: 220px;
          background: linear-gradient(120deg, rgba(238, 243, 248, 0.15), rgba(193, 225, 255, 0.45), rgba(203, 213, 225, 0.2));
          animation-duration: 34s;
          animation-delay: -8s;
        }

        .story-studio-theme .ss-fog-layer-3 {
          top: 62%;
          height: 240px;
          background: linear-gradient(90deg, rgba(248, 250, 252, 0.1), rgba(214, 236, 255, 0.42), rgba(193, 225, 255, 0.2));
          animation-duration: 42s;
          animation-delay: -16s;
        }

        .story-studio-theme .ss-backdrop {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(circle at 15% 8%, rgba(122, 184, 230, 0.26), transparent 36%),
            radial-gradient(circle at 85% 0%, rgba(167, 211, 245, 0.22), transparent 34%),
            linear-gradient(180deg, rgba(193, 225, 255, 0.58) 0%, rgba(238, 243, 248, 0.75) 40%, rgba(248, 250, 252, 0.86) 100%);
        }

        .story-studio-theme .ss-content-wrap {
          position: relative;
          z-index: 1;
        }

        .story-studio-theme .ss-section-container {
          width: 100%;
          max-width: 3000px;
          margin-inline: auto;
          padding-inline: 0.75rem;
        }

        .story-studio-theme.ss-mode-agentic .ss-section-container {
          max-width: 9000px;
        }

        .story-studio-theme .ss-section {
          width: 100%;
          max-width: 100%;
          background-color: rgba(255, 255, 255, 0.84) !important;
          border: 1px solid var(--ss-border);
          border-radius: 1.5rem;
          box-shadow: 0 10px 30px rgba(122, 184, 230, 0.16) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .story-studio-theme .ss-section > * {
          width: 100%;
        }

        .story-studio-theme .ss-subgrid {
          display: grid;
          gap: 0.75rem;
        }

        @media (min-width: 768px) {
          .story-studio-theme .ss-subgrid {
            gap: 1rem;
          }
        }

        .story-studio-theme p {
          font-size: 1.125rem !important;
          line-height: 1.8 !important;
        }

        /* Keep AI/Ollama and Agentic typography at the same readable scale as Human mode,
           including small utility text used in buttons and cards. */
        .story-studio-page.ss-mode-ai .text-xs,
        .story-studio-page.ss-mode-ai .text-sm,
        .story-studio-page.ss-mode-ai .text-base,
        .story-studio-page.ss-mode-agentic .text-xs,
        .story-studio-page.ss-mode-agentic .text-sm,
        .story-studio-page.ss-mode-agentic .text-base {
          font-size: 1.125rem !important;
          line-height: 1.8 !important;
        }

        .story-studio-page.ss-mode-ai button,
        .story-studio-page.ss-mode-agentic button {
          font-size: 1.125rem;
          line-height: 1.6;
        }

        @media (min-width: 768px) {
          .story-studio-theme p {
            font-size: 1.25rem !important;
          }

          .story-studio-page.ss-mode-ai .text-xs,
          .story-studio-page.ss-mode-ai .text-sm,
          .story-studio-page.ss-mode-ai .text-base,
          .story-studio-page.ss-mode-agentic .text-xs,
          .story-studio-page.ss-mode-agentic .text-sm,
          .story-studio-page.ss-mode-agentic .text-base {
            font-size: 1.25rem !important;
          }

          .story-studio-page.ss-mode-ai button,
          .story-studio-page.ss-mode-agentic button {
            font-size: 1.25rem;
          }
        }

        .story-studio-theme .rounded-3xl.bg-slate-950\/90,
        .story-studio-theme .bg-slate-950,
        .story-studio-theme .from-sky-950,
        .story-studio-theme .via-slate-950,
        .story-studio-theme .to-indigo-950 {
          background: linear-gradient(135deg, rgba(122, 184, 230, 0.38), rgba(167, 211, 245, 0.3), rgba(248, 250, 252, 0.24)) !important;
          color: var(--ss-text) !important;
          border-color: var(--ss-border) !important;
          backdrop-filter: blur(8px);
        }

        .story-studio-theme .bg-white,
        .story-studio-theme .bg-slate-50,
        .story-studio-theme .bg-sky-50,
        .story-studio-theme .bg-emerald-50,
        .story-studio-theme .bg-rose-50,
        .story-studio-theme .bg-amber-50 {
          background-color: rgba(255, 255, 255, 0.86) !important;
          border-color: var(--ss-border) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        .story-studio-theme .text-white,
        .story-studio-theme .text-slate-950,
        .story-studio-theme .text-slate-900,
        .story-studio-theme .text-slate-800,
        .story-studio-theme .text-slate-700,
        .story-studio-theme .text-slate-600,
        .story-studio-theme .text-slate-500,
        .story-studio-theme .text-slate-300 {
          color: var(--ss-text) !important;
        }

        .story-studio-theme .text-sky-700,
        .story-studio-theme .text-sky-600,
        .story-studio-theme .text-blue-700,
        .story-studio-theme .text-emerald-700 {
          color: var(--ss-accent) !important;
        }

        .story-studio-page .ss-mode-btn.ss-mode-btn-active,
        .story-studio-page .ss-mode-btn.ss-mode-btn-active * {
          color: #ffffff !important;
        }

        .story-studio-page .ss-mode-btn.ss-mode-btn-active .ss-mode-btn-desc {
          color: rgba(255, 255, 255, 0.88) !important;
        }

        .story-studio-theme .border-slate-200,
        .story-studio-theme .border-slate-300,
        .story-studio-theme .border-white\/10,
        .story-studio-theme .border-sky-200,
        .story-studio-theme .border-sky-400,
        .story-studio-theme .border-emerald-200,
        .story-studio-theme .border-rose-200,
        .story-studio-theme .border-amber-200 {
          border-color: var(--ss-border) !important;
        }

        .story-studio-theme .shadow-2xl,
        .story-studio-theme .shadow-sm,
        .story-studio-theme .shadow-md,
        .story-studio-theme .shadow-lg,
        .story-studio-theme .shadow-inner {
          box-shadow: 0 12px 34px rgba(122, 184, 230, 0.18) !important;
        }

        .story-studio-page .ss-structural-section {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .story-studio-page .ss-structural,
        .story-studio-page .ss-structural > section,
        .story-studio-page main > section,
        .story-studio-page main > article > section,
        .story-studio-page .ss-subgrid > article,
        .story-studio-page .ss-subgrid > section {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }

        .story-studio-page .ss-theme-heading-wrap {
          position: relative;
        }

        .story-studio-page .ss-theme-title {
          margin-top: 0.5rem;
          font-size: clamp(4rem, 6vw, 6rem) !important;
          line-height: 1.08 !important;
          font-weight: 900;
          letter-spacing: -0.03em;
          color: #0f2f4b !important;
          text-wrap: balance;
          transition: transform 280ms ease, text-shadow 280ms ease, color 280ms ease;
        }

        .story-studio-page .ss-gradient-heading {
          margin-top: 0.5rem;
          text-align: center;
        }

        .story-studio-page .ss-gradient-line {
          display: block;
          font-size: clamp(4rem, 6vw, 6rem);
          line-height: 1.08;
          font-weight: 900;
          letter-spacing: -0.03em;
          background-size: 300% 100%;
          background-position: 0% 50%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
          animation: ssGradientFlow 6s ease-in-out infinite;
          cursor: pointer;
          text-wrap: balance;
        }

        .story-studio-page .ss-gradient-line + .ss-gradient-line {
          margin-top: 0.14em;
        }

        .story-studio-page .ss-gradient-line-1 {
          background-image: linear-gradient(90deg, #0c447c 0%, #1d9e75 35%, #378add 70%, #0c447c 100%);
        }

        .story-studio-page .ss-gradient-line-2 {
          background-image: linear-gradient(90deg, #d85a30 0%, #ef9f27 35%, #993c1d 70%, #d85a30 100%);
          animation-delay: 0.6s;
        }

        .story-studio-page .ss-gradient-line:hover {
          animation: ssGradientFlow 2s ease-in-out infinite;
        }

        .story-studio-page .ss-gradient-caption {
          margin-top: 0.65rem;
          font-size: 14px !important;
          color: #0c447c !important;
          line-height: 1.4;
        }

        .story-studio-page .ss-theme-heading-wrap:hover .ss-theme-title {
          transform: translateY(-2px);
          color: #0a3a62 !important;
          text-shadow: 0 8px 24px rgba(16, 72, 116, 0.16);
        }

        @media (prefers-reduced-motion: reduce) {
          .story-studio-page .ss-theme-title,
          .story-studio-page .ss-theme-heading-wrap:hover .ss-theme-title {
            transform: none !important;
            text-shadow: none !important;
          }
        }

        @keyframes ssFogFloat {
          0%, 100% { transform: translate3d(-2%, 0, 0) scale(1); }
          50% { transform: translate3d(2.5%, -10px, 0) scale(1.03); }
        }

        @keyframes ssGradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .story-studio-theme .ss-fog-layer {
            animation: none !important;
          }

          .story-studio-page .ss-gradient-line {
            animation: none !important;
            background-position: 50% 50% !important;
          }
        }
      `}</style>

      <div className="ss-content-wrap ss-section-container py-10 lg:py-14">
        <div className="rounded-3xl ss-structural">
          <div className="story-studio-shell ss-structural p-6 md:p-10 text-slate-900">
            <div className="grid grid-cols-1 gap-6">
              <main className="space-y-6">
                <div className="ss-structural rounded-3xl p-6 md:p-8">
                  <div className="space-y-6">
                    <div className="w-full ss-theme-heading-wrap">
                      {selectedTheme.id === 'aqi-and-decisions' ? (
                        <div className="ss-gradient-heading" aria-label={selectedTheme.title}>
                          <span className="ss-gradient-line ss-gradient-line-1">Today&apos;s Air,</span>
                          <span className="ss-gradient-line ss-gradient-line-2">Tomorrow&apos;s Future</span>
                          
                        </div>
                      ) : (
                        <h2 className="ss-theme-title">{selectedTheme.title}</h2>
                      )}
                      <p className="mt-4 text-center text-lg text-slate-600 leading-relaxed md:text-xl">
                        {selectedTheme.status === 'awaiting-source'
                          ? 'This theme is waiting for the story text you will send next.'
                          : selectedMode === 'human'
                          ? selectedTheme.overview
                          : selectedAiSummary}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-transparent bg-transparent p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        {storyModes.map((mode) => {
                          const active = mode.id === selectedMode;

                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setSelectedMode(mode.id)}
                              className={`ss-mode-btn rounded-xl px-6 py-5 text-left transition-all ${
                                active
                                  ? 'ss-mode-btn-active bg-sky-600 text-white shadow-md'
                                  : 'bg-transparent text-slate-600 hover:bg-white'
                              }`}
                            >
                              <div className="text-2xl font-bold md:text-[1.75rem]">{mode.label}</div>
                              <div className={`ss-mode-btn-desc mt-3 text-base leading-7 md:text-lg ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                                {mode.description}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex justify-center">
                        <a
                          href={FEEDBACK_LINKS[selectedMode]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-5 py-2.5 text-sm font-semibold text-sky-700 shadow-sm transition-colors hover:bg-sky-50"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Share feedback on {storyModes.find((mode) => mode.id === selectedMode)?.label}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {hasComparisonGrid && (
                  <div className="ss-structural w-full">
                    <AirshedHeroSection />
                  </div>
                )}
                {hasComparisonGrid && (
                  <div className="ss-structural w-full">
                    <BestWorstAirQualitySection />
                  </div>
                )}
                {hasComparisonGrid && (
                  <div className="ss-structural w-full">
                    <RootCauseExplorerSection />
                  </div>
                )}

                <div className={`ss-structural ss-subgrid w-full grid-cols-1 ${isStoryFourHumanView || isStoryFourAiView || isStoryThreeHumanView ? 'md:grid-cols-1' : 'md:grid-cols-2'}`}>
                  {activeSections
                    .filter((section, sectionIndex) =>
                      !isStoryThreeHumanView ||
                      sectionIndex < storyThreeTestimonialIntroIndex
                    )
                    .map((section, index) => (
                    <React.Fragment key={`${selectedTheme.id}-${selectedMode}-${section.title}`}>
                    <article
                      className="mx-auto w-full border-slate-200 bg-transparent p-6"
                    >
                      {isDeepDivesTheme ? (
                        section.title === 'Deep dives: the worst-affected places' ? (
                          <DeepDivesWorstAffectedSection />
                        ) : (
                          <h3 className="text-xl font-bold text-slate-950">
                            {section.title}
                          </h3>
                        )
                      ) : (
                        <div className={`gap-4 ${selectedMode === 'human' ? 'flex flex-col items-center text-center' : 'flex items-start justify-between'}`}>
                          <div className={selectedMode === 'human' ? 'text-center' : ''}>
                            <div className="text-xs font-bold uppercase tracking-[0.22em] text-sky-700">
                              Subtopic {index + 1}
                            </div>
                            <br/>
                            <h3 className="mt-2 text-xl font-bold text-slate-950">
                              {section.title}
                            </h3>
                          </div>
                          <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                            {selectedMode === 'human' ? 'Human story' : 'AI/Ollama story'}
                          </div>
                        </div>
                      )}

                      {section.title !== 'Deep dives: the worst-affected places' && section.body.split('\n\n').map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex} className={`mt-5 text-slate-700 leading-relaxed ${selectedMode === 'human' ? 'text-center' : ''}`}>
                          {paragraph}
                        </p>
                      ))}

                      {section.table && (
                        <DotPlot rows={section.table.rows} columns={section.table.columns} />
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
                            className="mt-5 bg-slate-50 p-4"
                          >
                            <div className="mx-auto max-w-5xl">
                              <div>
                                <h2 className="mt-3 text-2xl font-black text-slate-950">The air can get better. Here&apos;s how.</h2>
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

                              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
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
                                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
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
                                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
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
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md"
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

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
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

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md">
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
                      ) : section.bullets && section.bullets.length > 0 && !isAiLikeMode && (
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
                    {isDeepDivesTheme && index === 0 && (
                      <div className="ss-structural">
                        <ReadingPatternSection />
                      </div>
                    )}
                    </React.Fragment>
                  ))}
                </div>

                {canShowStoryThreeAiSections && selectedMode === 'agentic' && (
                  <div className="ss-structural w-full">
                    <AgenticAiSection />
                  </div>
                )}

                {canShowStoryThreeAiSections && selectedMode !== 'agentic' && (
                    <section className="mx-auto w-full max-w-[84rem] bg-transparent py-16 px-6 md:px-12">
                      <div className="mx-auto w-full max-w-[84rem]">
                        <div className="min-w-0 text-center">
                        <p className="mt-2 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Generated by Ollama, running locally</p>
                          <br/>
                          <br/>
                          <p className="s4h-eyebrow text-xs font-bold uppercase tracking-[0.2em] text-[#0C447C]">AI city ranking</p>
                
                          <h2 className="mt-3 text-4xl font-black leading-[1.02] tracking-tight text-slate-950 md:text-6xl">
                            <span style={{ color: '#357A4A' }}>Best</span> And <span style={{ color: '#BA324F' }}>Worst</span> Cities By AQI
                          </h2>
                          <br/>
                          <p className="mt-2 text-base leading-relaxed text-slate-600">
                            Choose how many cities to rank and whether to see the worst, best, or both - results update automatically.
                          </p>
                        </div>
                        <br/>
                        <div className="mt-5">
                          <div className="ss-subgrid mx-auto w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="flex flex-col text-sm font-semibold text-slate-700">
                            City count
                            <select
                              value={rankingCount}
                              onChange={(event) => setRankingCount(Math.min(10, Math.max(1, Number(event.target.value) || 1)))}
                              className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          </label>

                          <label className="flex flex-col text-sm font-semibold text-slate-700">
                            Ranking mode
                            <select
                              value={rankingType}
                              onChange={(event) => {
                                setRankingType(event.target.value as 'best' | 'worst' | 'both');
                              }}
                              className="mt-1 w-full whitespace-nowrap rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            >
                              <option value="worst">Top worst cities</option>
                              <option value="best">Top best cities</option>
                              <option value="both">Worst + best cities</option>
                            </select>
                          </label>
                          </div>
                        </div>
                      </div>
                      <br/>
                      {rankingLoading && <p className="mt-4 text-sm text-slate-600">Generating city rankings...</p>}

                      {rankingResult && (
                        <div className="mt-6 space-y-6">
                          <div className="rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className="rounded-full border border-blue-600/30 bg-blue-500/10 px-3 py-1 font-semibold text-blue-700">
                                Top {rankingResult.count} {rankingResult.ranking_type}
                              </span>
                            </div>
                            <div className="mt-3 flex items-start gap-3">
                              <Quote className="mt-1 h-5 w-5 shrink-0 text-blue-600" />
                              <h5 className="text-xl font-bold leading-snug" style={{ color: '#1e3a5f' }}>{rankingResult.headline}</h5>
                            </div>
                            <p className="mt-2 text-base leading-relaxed text-slate-700">{rankingResult.summary}</p>
                          </div>

                          <div className={`grid grid-cols-1 gap-4 ${rankingType === 'both' ? '' : 'lg:grid-cols-2'}`}>
                          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                              <h6 className="text-sm font-bold uppercase tracking-[0.2em]" style={{ color: '#1e3a5f' }}>
                                PM2.5 vs standard comparison
                              </h6>
                              {rankingType !== 'both' ? (
                                <div className="mt-3 h-96 w-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={activeRankingRows} margin={{ top: 8, right: 16, left: 16, bottom: 78 }}>
                                      <defs>
                                        <linearGradient id="mainWorstGrad" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#f87171" />
                                          <stop offset="100%" stopColor="#ef4444" />
                                        </linearGradient>
                                        <linearGradient id="mainBestGrad" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#4ade80" />
                                          <stop offset="100%" stopColor="#22c55e" />
                                        </linearGradient>
                                        <linearGradient id="mainStandardGrad" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="0%" stopColor="#60a5fa" />
                                          <stop offset="100%" stopColor="#6366f1" />
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                                      <XAxis
                                        dataKey="city"
                                        angle={-35}
                                        textAnchor="end"
                                        interval={0}
                                        height={92}
                                        tick={{ fontSize: 13, fill: '#475569' }}
                                        tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value)}
                                      />
                                      <YAxis tick={{ fontSize: 13, fill: '#475569' }} />
                                      <ReferenceLine
                                        y={standardPm25Value}
                                        stroke="#1e3a5f"
                                        strokeDasharray="4 4"
                                      />
                                      <Tooltip
                                        contentStyle={{ borderRadius: 12, borderColor: '#c7d2fe', fontSize: 14 }}
                                        formatter={(value: number, name: string) => {
                                          if (name === 'standard_pm25') {
                                            return [`${value.toFixed(2)} ug/m3`, 'Standard PM2.5'];
                                          }
                                          return [`${value.toFixed(2)} ug/m3`, 'City average PM2.5'];
                                        }}
                                        labelFormatter={(label) => `City: ${label}`}
                                      />
                                      <Legend
                                        wrapperStyle={{ fontSize: 14 }}
                                        formatter={(value) => (value === 'avg_pm25' ? 'City average PM2.5' : 'Standard PM2.5')}
                                      />
                                      <Bar dataKey="avg_pm25" fill={rankingType === 'best' ? 'url(#mainBestGrad)' : 'url(#mainWorstGrad)'} radius={[10, 10, 0, 0]}>
                                        {activeRankingRows.map((row) => (
                                          <Cell
                                            key={row.label}
                                            fill={rankingType === 'best' ? 'url(#mainBestGrad)' : 'url(#mainWorstGrad)'}
                                          />
                                        ))}
                                      </Bar>
                                      <Bar dataKey="standard_pm25" fill="url(#mainStandardGrad)" radius={[10, 10, 0, 0]} />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  <div className="flex flex-wrap items-center gap-4 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                                    <div className="inline-flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#6366f1]" />
                                      Standard PM2.5
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
                                      Worst city PM2.5
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
                                      Best city PM2.5
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                  <div className="h-96 w-full rounded-xl border border-red-100 bg-red-50/30 p-2">
                                    <div className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">Worst cities</div>
                                    <ResponsiveContainer width="100%" height="92%">
                                      <BarChart
                                        data={worstRankingRows}
                                        layout="horizontal"
                                        barCategoryGap="18%"
                                        margin={{ top: 20, right: 24, left: 12, bottom: 78 }}
                                      >
                                        <defs>
                                          <linearGradient id="worstMiniGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#f87171" />
                                            <stop offset="100%" stopColor="#ef4444" />
                                          </linearGradient>
                                          <linearGradient id="worstMiniStandardGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#60a5fa" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" />
                                        <XAxis
                                          dataKey="city"
                                          angle={-35}
                                          textAnchor="end"
                                          interval={0}
                                          height={92}
                                          tick={{ fontSize: 13, fill: '#475569' }}
                                          tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value)}
                                        />
                                        <YAxis tick={{ fontSize: 13, fill: '#475569' }} />
                                        <ReferenceLine y={standardPm25Value} stroke="#1e3a5f" strokeDasharray="4 4" />
                                        <Tooltip
                                          contentStyle={{ borderRadius: 12, borderColor: '#fecaca', fontSize: 14 }}
                                          formatter={(value: number, name: string) => {
                                            if (name === 'standard_pm25') {
                                              return [`${value.toFixed(2)} ug/m3`, 'Standard PM2.5'];
                                            }
                                            return [`${value.toFixed(2)} ug/m3`, 'Worst city PM2.5'];
                                          }}
                                        />
                                        <Bar dataKey="avg_pm25" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={26} />
                                        <Bar dataKey="standard_pm25" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={26} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>

                                  <div className="h-96 w-full rounded-xl border border-emerald-100 bg-emerald-50/30 p-2">
                                    <div className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Best cities</div>
                                    <ResponsiveContainer width="100%" height="92%">
                                      <BarChart
                                        data={bestRankingRows}
                                        layout="horizontal"
                                        barCategoryGap="18%"
                                        margin={{ top: 20, right: 24, left: 12, bottom: 78 }}
                                      >
                                        <defs>
                                          <linearGradient id="bestMiniGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#4ade80" />
                                            <stop offset="100%" stopColor="#22c55e" />
                                          </linearGradient>
                                          <linearGradient id="bestMiniStandardGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#60a5fa" />
                                            <stop offset="100%" stopColor="#6366f1" />
                                          </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#dcfce7" />
                                        <XAxis
                                          dataKey="city"
                                          angle={-35}
                                          textAnchor="end"
                                          interval={0}
                                          height={92}
                                          tick={{ fontSize: 13, fill: '#475569' }}
                                          tickFormatter={(value: string) => (value.length > 14 ? `${value.slice(0, 14)}...` : value)}
                                        />
                                        <YAxis tick={{ fontSize: 13, fill: '#475569' }} />
                                        <ReferenceLine y={standardPm25Value} stroke="#1e3a5f" strokeDasharray="4 4" />
                                        <Tooltip
                                          contentStyle={{ borderRadius: 12, borderColor: '#bbf7d0', fontSize: 14 }}
                                          formatter={(value: number, name: string) => {
                                            if (name === 'standard_pm25') {
                                              return [`${value.toFixed(2)} ug/m3`, 'Standard PM2.5'];
                                            }
                                            return [`${value.toFixed(2)} ug/m3`, 'Best city PM2.5'];
                                          }}
                                        />
                                        <Bar dataKey="avg_pm25" fill="#22c55e" radius={[6, 6, 0, 0]} barSize={26} />
                                        <Bar dataKey="standard_pm25" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={26} />
                                      </BarChart>
                                    </ResponsiveContainer>
                                  </div>
                                </div>
                                </div>
                              )}
                          </div>

                            {rankingType !== 'both' && (
                            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                              <h6 className="text-base font-bold" style={{ color: '#1e3a5f' }}>AI insights</h6>
                              <ul className="mt-3 space-y-2">
                                {rankingResult.insights.map((insight) => (
                                  <li key={insight} className="flex gap-2 text-base text-slate-700 leading-relaxed">
                                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                    <span>{insight}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            )}
                          </div>

                          {rankingType === 'both' ? (
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                              <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                                <h6 className="text-base font-bold" style={{ color: '#1e3a5f' }}>AI insights</h6>
                                <ul className="mt-3 space-y-2">
                                  {rankingResult.insights.map((insight) => (
                                    <li key={insight} className="flex gap-2 text-base text-slate-700 leading-relaxed">
                                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                      <span>{insight}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                                <h6 className="text-base font-bold" style={{ color: '#1e3a5f' }}>Recommendations</h6>
                                <ul className="mt-3 space-y-2">
                                  {rankingResult.recommendations.map((item) => (
                                    <li key={item} className="flex gap-2 text-base text-slate-700 leading-relaxed">
                                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                              <h6 className="text-base font-bold" style={{ color: '#1e3a5f' }}>Recommendations</h6>
                              <ul className="mt-3 space-y-2">
                                {rankingResult.recommendations.map((item) => (
                                  <li key={item} className="flex gap-2 text-base text-slate-700 leading-relaxed">
                                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        </div>
                      )}

                    </section>
                  )}

                {isStoryThreeAiView && selectedMode !== 'agentic' && (
                  <>
                    {deepDiveLoading && !deepDiveNarrative[deepDiveMode] && (
                      <p className="text-base text-slate-600">Generating the AI narrative...</p>
                    )}

                    {deepDiveNarrative[deepDiveMode] && <DeepDiveFlowSection />}
                  </>
                )}

                {selectedTheme.id === 'aqi-and-decisions' && (
                  <section className="ss-structural w-full p-4 md:p-8">
                    <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&family=Space+Grotesk:wght@500;600;700&display=swap');

                      .s4h-root {
                        color: #14201A;
                        font-family: 'Inter', sans-serif;
                      }
                      .s4h-root h2,
                      .s4h-root h3,
                      .s4h-root h4,
                      .s4h-root h5,
                      .s4h-root h6,
                      .s4h-root .s4h-display {
                        font-family: 'Space Grotesk', sans-serif;
                      }
                      .s4h-root .s4h-eyebrow,
                      .s4h-root .s4h-pill,
                      .s4h-root .s4h-hint,
                      .s4h-root .s4h-label {
                        font-family: 'JetBrains Mono', monospace;
                      }
                      .s4h-flip-wrap {
                        perspective: 1200px;
                      }
                      .s4h-flip-inner {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        transform-style: preserve-3d;
                        transition: transform 0.6s ease;
                      }
                      .s4h-flip-card.is-flipped .s4h-flip-inner {
                        transform: rotateY(180deg);
                      }
                      .s4h-face {
                        position: absolute;
                        inset: 0;
                        backface-visibility: hidden;
                        border-radius: 16px;
                      }
                      .s4h-back {
                        transform: rotateY(180deg);
                      }
                      .s4h-icon-svg {
                        width: 100%;
                        height: 100%;
                        position: relative;
                        z-index: 2;
                        color: #ffffff;
                        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.2));
                        transition: transform 0.35s ease;
                      }
                      .s4h-icon-stage {
                        position: relative;
                        overflow: hidden;
                        isolation: isolate;
                        background: linear-gradient(135deg, var(--s4h-grad-a), var(--s4h-grad-b), var(--s4h-grad-c));
                        background-size: 220% 220%;
                        animation: s4h-gradient-shift 6s ease-in-out infinite;
                        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
                        transition: transform 0.35s ease, box-shadow 0.35s ease;
                      }
                      .s4h-icon-stage::before,
                      .s4h-icon-stage::after {
                        content: '';
                        position: absolute;
                        border-radius: 9999px;
                        pointer-events: none;
                        opacity: 0.6;
                        filter: blur(1px);
                        z-index: 1;
                      }
                      .s4h-icon-stage::before {
                        width: 120px;
                        height: 120px;
                        top: -44px;
                        left: -22px;
                        background: radial-gradient(circle, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 72%);
                        animation: s4h-orb-float 4.8s ease-in-out infinite;
                      }
                      .s4h-icon-stage::after {
                        width: 112px;
                        height: 112px;
                        right: -26px;
                        bottom: -50px;
                        background: radial-gradient(circle, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0) 72%);
                        animation: s4h-orb-float 5.7s ease-in-out infinite reverse;
                      }
                      .s4h-icon-spark {
                        position: absolute;
                        width: 8px;
                        height: 8px;
                        border-radius: 9999px;
                        background: rgba(255, 255, 255, 0.9);
                        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.16);
                        z-index: 1;
                        animation: s4h-spark-drift 2.8s ease-in-out infinite;
                      }
                      .s4h-icon-spark.s4h-spark-1 { top: 14px; right: 16px; }
                      .s4h-icon-spark.s4h-spark-2 { bottom: 14px; left: 18px; animation-delay: 0.8s; }
                      .s4h-flip-card:hover .s4h-icon-stage {
                        transform: translateY(-2px) scale(1.03);
                        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.34), 0 12px 26px rgba(0, 0, 0, 0.14);
                      }
                      .s4h-flip-card:hover .s4h-icon-svg {
                        transform: scale(1.08) rotate(-2deg);
                      }
                      .s4h-spin { animation: s4h-spin 1.3s linear infinite; transform-origin: center; }
                      .s4h-spin-slow { animation: s4h-spin 6s linear infinite; transform-origin: center; }
                      .s4h-pulse { animation: s4h-pulse 1.4s ease-in-out infinite; transform-origin: center; }
                      .s4h-sway { animation: s4h-sway 2.2s ease-in-out infinite; transform-origin: center; }
                      .s4h-rise { animation: s4h-rise 1.5s ease-in-out infinite; }
                      .s4h-flicker { animation: s4h-flicker 1.1s ease-in-out infinite; transform-origin: center bottom; }
                      .s4h-drift { animation: s4h-drift 1.8s ease-out infinite; }
                      .s4h-glint { animation: s4h-glint 2.2s ease-in-out infinite; }
                      .s4h-smoke { animation: s4h-smoke 1.8s ease-in-out infinite; }
                      .s4h-breathe { animation: s4h-breathe 2.6s ease-in-out infinite; transform-origin: center; }
                      .s4h-ring { animation: s4h-ring 2.2s ease-out infinite; transform-origin: center; }
                      .s4h-bar { animation: s4h-bar 1.1s ease-in-out infinite; transform-origin: bottom; }
                      .s4h-blink { animation: s4h-blink 1.2s steps(2, end) infinite; }
                      .s4h-delay-1 { animation-delay: 0.25s; }
                      .s4h-delay-2 { animation-delay: 0.5s; }

                      @keyframes s4h-spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                      }
                      @keyframes s4h-gradient-shift {
                        0%, 100% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                      }
                      @keyframes s4h-orb-float {
                        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
                        50% { transform: translate(7px, -9px) scale(1.08); opacity: 0.82; }
                      }
                      @keyframes s4h-spark-drift {
                        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.88; }
                        50% { transform: translate(-6px, -7px) scale(1.25); opacity: 0.45; }
                      }
                      @keyframes s4h-pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.65; transform: scale(1.08); }
                      }
                      @keyframes s4h-sway {
                        0%, 100% { transform: translateX(0); }
                        50% { transform: translateX(2px); }
                      }
                      @keyframes s4h-rise {
                        0% { opacity: 0.9; transform: translateY(0); }
                        100% { opacity: 0; transform: translateY(-10px); }
                      }
                      @keyframes s4h-flicker {
                        0%, 100% { transform: scale(1); opacity: 0.95; }
                        50% { transform: scale(0.92); opacity: 0.7; }
                      }
                      @keyframes s4h-drift {
                        0% { opacity: 0.8; transform: translate(0, 0); }
                        100% { opacity: 0; transform: translate(-14px, 4px); }
                      }
                      @keyframes s4h-glint {
                        0% { transform: translateX(0); opacity: 0; }
                        20% { opacity: 0.9; }
                        60% { opacity: 0.8; }
                        100% { transform: translateX(34px); opacity: 0; }
                      }
                      @keyframes s4h-smoke {
                        0% { opacity: 0.7; transform: translateY(0) scale(1); }
                        100% { opacity: 0; transform: translateY(-12px) scale(0.6); }
                      }
                      @keyframes s4h-breathe {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.06); }
                      }
                      @keyframes s4h-ring {
                        0% { opacity: 0.9; transform: scale(0.8); }
                        100% { opacity: 0; transform: scale(1.2); }
                      }
                      @keyframes s4h-bar {
                        0%, 100% { transform: scaleY(0.55); }
                        50% { transform: scaleY(1); }
                      }
                      @keyframes s4h-blink {
                        0%, 50% { opacity: 1; }
                        51%, 100% { opacity: 0.25; }
                      }

                      @media (prefers-reduced-motion: reduce) {
                        .s4h-flip-inner {
                          transform: none !important;
                          transition: none !important;
                        }
                        .s4h-front {
                          display: flex;
                        }
                        .s4h-back {
                          display: none;
                          transform: none !important;
                        }
                        .s4h-flip-card.is-flipped .s4h-front {
                          display: none;
                        }
                        .s4h-flip-card.is-flipped .s4h-back {
                          display: flex;
                        }
                        .s4h-spin,
                        .s4h-spin-slow,
                        .s4h-icon-stage,
                        .s4h-icon-stage::before,
                        .s4h-icon-stage::after,
                        .s4h-icon-spark,
                        .s4h-pulse,
                        .s4h-sway,
                        .s4h-rise,
                        .s4h-flicker,
                        .s4h-drift,
                        .s4h-glint,
                        .s4h-smoke,
                        .s4h-breathe,
                        .s4h-ring,
                        .s4h-bar,
                        .s4h-blink {
                          animation: none !important;
                        }
                      }
                    `}</style>

                    <div className="mx-auto max-w-[90rem]">
                  
                      {selectedMode === 'human' ? (
                        <>
                      <div className="ss-structural">
                        <AirCanGetBetterSection />
                      </div>

                      <section className="ss-structural pt-4 pb-16 px-6 md:px-12">
                        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
                          {storyFourHumanCategoryTabs.map((tab) => {
                            const active = storyFourHumanCategory === tab.id;
                            const palette = storyFourHumanPalette[tab.id];

                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setStoryFourHumanCategory(tab.id)}
                                className="s4h-pill rounded-full border px-8 py-4 text-[18px] font-semibold tracking-[0.08em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                                style={
                                  active
                                    ? {
                                        backgroundColor: palette.accent,
                                        borderColor: palette.accent,
                                        color: '#ffffff',
                                        boxShadow: '0 8px 20px rgba(20,30,25,0.12)',
                                      }
                                    : {
                                        backgroundColor: '#ffffff',
                                        borderColor: 'rgba(20,30,25,0.25)',
                                        color: '#14201A',
                                      }
                                }
                                aria-pressed={active}
                              >
                                {tab.id} {tab.emoji}
                              </button>

                            );
                          })}
                        </div>

                      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                          {storyFourHumanCards.map((card) => {
                            const palette = storyFourHumanPalette[card.category];
                            const flipped = Boolean(storyFourFlippedCards[card.id]);

                            return (
                              <button
                                key={card.id}
                                type="button"
                                className={`s4h-flip-card s4h-flip-wrap min-h-[280px] w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${flipped ? 'is-flipped' : ''}`}
                                onClick={() => {
                                  setStoryFourFlippedCards((current) => ({
                                    ...current,
                                    [card.id]: !current[card.id],
                                  }));
                                }}
                                aria-pressed={flipped}
                                aria-label={`${card.title}. ${flipped ? 'Tap to flip back' : 'Tap to flip for evidence'}`}
                              >
                                <div className="s4h-flip-inner">
                                  <div
                                    className="s4h-face s4h-front flex h-full flex-col border border-[rgba(20,30,25,0.12)] bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                                  >
                                    <div
                                      className="s4h-icon-stage flex h-[44%] items-center justify-center rounded-xl"
                                      style={{
                                        color: '#ffffff',
                                        '--s4h-grad-a': palette.glowA,
                                        '--s4h-grad-b': palette.glowB,
                                        '--s4h-grad-c': palette.glowC,
                                      } as React.CSSProperties}
                                    >
                                      <span className="s4h-icon-spark s4h-spark-1" aria-hidden="true" />
                                      <span className="s4h-icon-spark s4h-spark-2" aria-hidden="true" />
                                      <div className="h-[74px] w-[84px]">
                                        <StoryFourIcon iconKey={card.iconKey} />
                                      </div>
                                    </div>
                                    <div className="mt-3 grid flex-1 grid-rows-[auto_1fr_auto] gap-2">
                                      <span
                                        className="s4h-pill inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold leading-tight"
                                        style={{ backgroundColor: palette.tint, color: palette.text }}
                                      >
                                        {card.stat}
                                      </span>
                                      <h4 className="line-clamp-3 text-base font-semibold leading-snug text-[#14201A] md:text-[15px]">
                                        {card.title}
                                      </h4>
                                      <span className="s4h-hint text-xs text-[#5F6960]">tap to flip</span>
                                    </div>
                                  </div>

                                  <div
                                    className="s4h-face s4h-back grid h-full grid-rows-[auto_1fr_auto] border border-[rgba(20,30,25,0.12)] bg-white p-3 shadow-sm"
                                  >
                                    <div className="s4h-label text-xs uppercase tracking-[0.1em] text-[#5F6960]">The evidence</div>
                                    <p className="text-sm leading-relaxed text-[#14201A]">{card.detail}</p>
                                    <span className="s4h-hint text-xs text-[#5F6960]">tap to flip back</span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <br/>
                        <div className="rounded-2xl border border-[rgba(20,30,25,0.12)] bg-white p-5 md:p-6">
                          <h3 className="text-2xl font-bold text-[#14201A]">If This is Implemented Everywhere</h3>
                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                            {storyFourImpactStats.map((stat) => {
                              const expanded = storyFourExpandedImpactId === stat.id;
                              return (
                                <button
                                  key={stat.id}
                                  type="button"
                                  onClick={() => setStoryFourExpandedImpactId(expanded ? null : stat.id)}
                                  className="rounded-2xl border border-[rgba(20,30,25,0.12)] bg-[#7AD0E4] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2A5FA5]"
                                  aria-expanded={expanded}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="s4h-display text-3xl font-bold leading-none text-[#14201A]">{stat.value}</div>
                                      <div className="mt-1 text-sm font-medium text-[#5F6960]">{stat.label}</div>
                                    </div>
                                    <span className="s4h-pill rounded-full bg-white px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[#5F6960]">
                                      {expanded ? 'collapse' : 'expand'}
                                    </span>
                                  </div>
                                  {expanded && (
                                    <p className="mt-3 text-sm leading-relaxed text-[#14201A]">{stat.detail}</p>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      
                      </section>

              
                        </>
                      ) : null}
                    </div>
          
                  </section>
                )}

                {selectedTheme.status === 'awaiting-source' && (
                  <div className="ss-section rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
                    Story content for this theme has not been added yet. Send the source text when you are ready,
                    and I will split it into subtopics plus a matching AI/Ollama version.
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


