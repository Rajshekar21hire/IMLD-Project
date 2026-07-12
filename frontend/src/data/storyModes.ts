import { StoryMode } from './storyTypes';

export const storyModes: { id: StoryMode; label: string; description: string }[] = [
  {
    id: 'human',
    label: 'Human Generated',
    description: 'Curated narrative based on the pasted source material.',
  },
  {
    id: 'ai',
    label: 'AI / Ollama Generated',
    description: 'An AI-style version using the same theme and subtopic structure.',
  },
  {
    id: 'agentic',
    label: 'Emotionally Intelligent AI',
    description: 'A warmer, human-centered AI narrative using the same theme and subtopic structure.',
  },
];
