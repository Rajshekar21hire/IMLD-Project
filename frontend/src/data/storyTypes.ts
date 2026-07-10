export type StoryMode = 'human' | 'ai' | 'agentic';

export interface StorySection {
  title: string;
  body: string;
  bullets?: string[];
  categoryBlocks?: StoryCategoryBlock[];
  label?: string;
  chart?: {
    type: 'line' | 'bar';
    dataSourceKey: string;
  };
  table?: {
    columns: string[];
    rows: { label: string; values: string[] }[];
  };
}

export interface StoryCategoryCard {
  title: string;
  pollutant: string;
  reduction: string;
  evidence: string;
  example: string;
  impactScore: number;
  body: string;
  footer: string;
}

export interface StoryCategoryBlock {
  label: string;
  cards: StoryCategoryCard[];
}

export interface StoryTheme {
  id: string;
  badge: string;
  title: string;
  shortDescription: string;
  overview: string;
  promptFocus: string;
  status: 'ready' | 'awaiting-source';
  humanSections: StorySection[];
  aiSections: StorySection[];
}
