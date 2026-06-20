export type StoryMode = 'human' | 'ai';

export interface StorySection {
  title: string;
  body: string;
  bullets?: string[];
  label?: string;
  chart?: {
    type: 'line' | 'bar';
    dataSourceKey: string;
  };
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

const firstStoryPromptFocus =
  'Explain how invisible air connects human breathing, ecosystems, air quality, AQI, monitoring, and the WHO 2021 guideline revision in a story format with clear subtopics and a distinct AI-written companion version.';

export const storyThemes: StoryTheme[] = [
  {
    id: 'invisible-bridge',
    badge: 'Story 1',
    title: 'The Invisible Bridge: Humans, Air, and Ecosystems',
    shortDescription: 'A foundational story about how air ties human life to planetary systems.',
    overview:
      'This story follows the pasted source text exactly as the human version, then provides a separate AI/Ollama companion story for comparison.',
    promptFocus: firstStoryPromptFocus,
    status: 'ready',
    humanSections: [
      {
        title: 'Air as the invisible baseline for life',
        body:
          'Air is the invisible, odorless, and tasteless mixture of gases surrounding the Earth that forms our atmosphere. It is the fundamental baseline for almost all terrestrial life, providing the vital oxygen required for respiration.',
      },
      {
        title: 'The 11,000-liter daily connection',
        body:
          'Every single day, an average adult inhales roughly 11,000 liters of air. This immense, invisible volume serves as an immediate, life-sustaining bridge between human biology and the global environment.',
        bullets: [
          'Humans and animals inhale oxygen and exhale carbon dioxide.',
          'Plants absorb carbon dioxide for photosynthesis and release fresh oxygen back into the atmosphere.',
          'Because air moves across geographic boundaries, human health depends on the stability of local and global climate systems.',
        ],
      },
      {
        title: 'What is air quality and why does it matter?',
        body:
          'Clean air is essential for healthy living, but according to the World Health Organization, almost 99% of the global population breathes air exceeding their guideline limits of air pollution. Air quality matters because the air we breathe carries invisible risks that influence health, daily life, and the health of ecosystems.',
      },
      {
        title: 'What exactly are we breathing?',
        body:
          'Air can be polluted in two major ways, and understanding those forms of pollution helps explain why clean air is not just a background condition but a public health issue.',
      },
      {
        title: 'Six key pollutants',
        body:
          'Air quality is determined by six key pollutants tracked by the WHO and national agencies. Each has different sources, different behavior in the atmosphere, and different health effects. Select any to explore.',
        bullets: [
          'PM2.5: fine particulate matter under 2.5 micrometres in diameter, the single most lethal air pollutant tracked globally.',
          'PM10: coarse particles between 2.5 and 10 micrometres that are trapped in the nose and upper airways.',
          'NO2: nitrogen dioxide, a reddish-brown gas formed when fuel burns at high temperatures.',
          'O3: ground-level ozone formed when NO2 and volatile organic compounds react in sunlight.',
          'SO2: sulphur dioxide released primarily by burning high-sulphur coal and heavy oil.',
          'CO: carbon monoxide, a colourless, odourless gas produced by incomplete combustion.',
        ],
      },
      {
        title: 'From chemistry to a single number',
        body:
          'Air quality is reported using the Air Quality Index. The AQI converts raw pollutant concentrations into a 0–500 score, helping people understand what the air means for health and daily activity.',
      },
      {
        title: 'How we measure air quality?',
        body:
          'No single technology gives us the full story. Ground stations are accurate but sparse. Satellites cover the globe but miss surface detail. Low-cost sensors fill gaps but need calibration. Together they create the best picture we have.',
      },
      {
        title: 'The WHO 2021 revision',
        body:
          'The WHO 2021 revision is the threshold that made 99% of the world unsafe. In 2021 the WHO tightened its annual PM2.5 guideline from 10 micrograms per cubic meter to just 5 micrograms per cubic meter; the strongest evidence-based limit ever set.',
      },
      {
        title: 'Why the revision matters',
        body:
          'The 2021 revision was based on decades of epidemiological evidence showing health harm begins at concentrations far below the old 10 micrograms per cubic meter limit. The new standard is aspirational for most of the world, but it defines what clean air actually means for human health.',
      },
    ],
    aiSections: [
      {
        title: 'A story about the air we cannot see',
        body:
          'Imagine a bridge that crosses every border without ever being built. Air behaves like that bridge. It is invisible, yet it carries oxygen into our lungs, carbon dioxide out of them, and the consequences of our choices across cities, countries, and continents.',
      },
      {
        title: 'Breath as a global exchange',
        body:
          'Every breath is a tiny environmental transaction. Humans and animals trade oxygen for carbon dioxide, while plants keep the cycle moving by turning that carbon dioxide back into oxygen through photosynthesis. The exchange is constant, and the atmosphere makes it possible.',
      },
      {
        title: 'When clean air becomes a measurement problem',
        body:
          'Once pollution enters the picture, the story becomes more complex. PM2.5, PM10, NO2, O3, SO2, and CO each tell a different part of the truth, which is why air quality cannot be captured by a single reading or a single source.',
      },
      {
        title: 'Why the AQI matters',
        body:
          'The AQI translates science into action. It helps people decide whether to exercise outside, protect sensitive groups, or stay indoors with air purification. In that sense, the index is not just a number, but a public health signal.',
      },
      {
        title: 'Monitoring and accountability',
        body:
          'To understand air quality well, we need more than one lens. Stations, satellites, and low-cost sensors each reveal something different, and the WHO guideline change in 2021 reminds us that the bar for clean air is now much higher than most places currently meet.',
      },
    ],
  },
  {
    id: 'pollution-and-health',
    badge: 'Story 2',
    title: 'The Unequal Burden of Air Pollution - Who Breathes the Cleanest Air?',
    shortDescription: 'Explores geographic inequality in exposure and trends over time.',
    overview:
      'This story examines global disparities in air pollution exposure, trends since 2015, and the drivers of inequality.',
    promptFocus:
      'Describe how pollution exposure varies geographically, how trends changed since 2015, and how geography and exposure-level lenses reveal global air quality inequality.',
    status: 'ready',
    humanSections: [
      {
        title: 'Global Snapshot: Air Quality',
        label: 'live-map',
        body:
          'Air quality is not just a scientific metrics, it’s a story of justice, inequality, and resilience. While some regions are improving, others face worsening pollution, often impacting the most vulnerable populations. The interactable map displays the current PM2.5 and other pollutant values all over the world.',
      },
      {
        title: 'Trends Overtime - Which Regions Are Improving vs. Worsening Since 2015?',
        chart: {
          type: 'line',
          dataSourceKey: 'pollutantTrends',
        },
        body:
          'Since 2015, Air quality trends have changed sharply across regions — driven by policy, urbanization, energy transitions, and economic development. While some regions are making real progress, others are facing worsening air pollution, often due to rapid industrialization and weak regulation.',
      },
      {
        title: 'Inequality lens - geography vs exposure levels',
        body:
          'Between 2015 and 2026, global air quality inequality was shaped by both geography and local exposure. The biggest gaps came from between-country differences, while income and neighborhood siting within countries drove the worst local exposures. High-exposure zones are concentrated in Central & South Asia and Sub-Saharan Africa, while lower-exposure zones include Iceland, Australia, Estonia, and New Zealand. Within countries, the highest exposure is found in low-income and minority neighborhoods near roads and industry, versus high-income majority-suburban or rural areas.',
      },
    ],
    aiSections: [
      {
        title: 'Global Snapshot: Air Quality (AI)',
        body:
          'From a systems perspective, the map makes visible how pollution ties into economic patterns, policy choices, and population vulnerability. The interactive map highlights PM2.5 hotspots alongside other pollutant layers to help identify where exposure and risk align.',
      },
      {
        title: 'Trends Overtime (AI)',
        body:
          'AI analysis highlights which regions show consistent improvement and which show persistent or worsening trends since 2015. Use the yearly pollutant trends to compare regions and verify the narrative.',
      },
      {
        title: 'Inequality lens (AI)',
        body:
          'Looking through two lenses—geography and exposure level—shows that most of the global gap in air quality comes from differences between countries, while within-country exposure remains highest for low-income and minority communities near pollution sources. Both perspectives are needed to understand and address unequal clean-air access.',
      },
    ],
  },
  {
    id: 'aqi-and-decisions',
    badge: 'Story 3',
    title: 'AQI and Daily Decisions',
    shortDescription: 'City-level ranking story with AI Agent 1 handoff and visual insights.',
    overview:
      'This theme focuses on how AQI rankings translate into practical daily choices, using city-level best/worst comparisons and AI-generated interpretation.',
    promptFocus:
      'Create a story that explains AQI bands, health interpretations, activity guidance, and PM2.5 context in a way that feels practical and easy to act on.',
    status: 'ready',
    humanSections: [
      {
        title: 'Ranking cities turns AQI into action',
        body:
          'A city ranking translates abstract AQI values into a practical list people can understand quickly. Instead of one isolated measurement, rankings reveal which places are persistently cleaner or more polluted.',
      },
      {
        title: 'Worst-city rankings highlight urgent health risk',
        body:
          'The highest average AQI cities often face sustained exposure burdens, especially for children, older adults, and people with respiratory conditions. These rankings help prioritize where interventions are most urgent.',
      },
      {
        title: 'Best-city rankings provide realistic benchmarks',
        body:
          'Cities with lower average AQI show what better outcomes look like in similar regions. Comparing policy, transport, and emission patterns helps others adopt proven strategies.',
      },
      {
        title: 'User-selected top N keeps analysis flexible',
        body:
          'Allowing users to choose top 3, 5, or 10 cities adapts the analysis for quick overviews or deeper reviews. This creates a reusable decision-support view for dashboards and reports.',
      },
    ],
    aiSections: [
      {
        title: 'AQI ranking as a daily decision tool',
        body:
          'When city AQI trends are ranked, the data becomes immediately actionable for households, schools, and city planners. The ranking view tells people where caution is most needed and where cleaner conditions are more stable.',
      },
    ],
  },
  {
    id: 'measurement-and-governance',
    badge: 'Story 4',
    title: 'Measuring the Atmosphere and Setting the Standard',
    shortDescription: 'Awaiting source story content.',
    overview:
      'This theme is reserved for the next story you send. Once you provide the source text, the dashboard will turn it into a human story and an AI/Ollama counterpart.',
    promptFocus:
      'Write a grounded story about air quality monitoring technologies, their strengths and limitations, and how the WHO 2021 guideline changed the meaning of clean air.',
    status: 'awaiting-source',
    humanSections: [],
    aiSections: [],
  },
];

export const storyModes: { id: StoryMode; label: string; description: string }[] = [
  {
    id: 'human',
    label: 'Human Generated',
    description: 'Curated narrative based on the pasted source material.',
  },
  {
    id: 'ai',
    label: 'AI / Olamala Generated',
    description: 'An AI-style version using the same theme and subtopic structure.',
  },
];

const aiNarrativeOpeners: Record<string, string[]> = {
  'invisible-bridge': [
    'This story begins with a simple truth: the air around us is never just background.',
    'The first lesson in this theme is that breathing is not an isolated act.',
  ],
  'pollution-and-health': [
    'Pollution becomes clearer when we follow it from the source to the body.',
    'This theme traces the hidden route from emissions to everyday health outcomes.',
  ],
  'aqi-and-decisions': [
    'AQI turns invisible chemistry into a decision people can use today.',
    'The index matters because it changes what people do, not just what they know.',
  ],
  'measurement-and-governance': [
    'Air quality only becomes visible when measurement systems work together.',
    'This theme shows how sensors, satellites, and standards shape the same story.',
  ],
};

const aiNarrativeClosers: Record<string, string[]> = {
  'invisible-bridge': [
    'In that sense, air is not just around us. It is the medium that connects biology, climate, and responsibility.',
    'The bridge is invisible, but the consequences of crossing it are very real.',
  ],
  'pollution-and-health': [
    'Once the pathway is visible, the health burden is harder to ignore.',
    'Seeing the chain clearly is the first step toward reducing exposure.',
  ],
  'aqi-and-decisions': [
    'That is why AQI is less like a statistic and more like a daily guide.',
    'A single number can be the difference between acting normally and acting cautiously.',
  ],
  'measurement-and-governance': [
    'When the benchmark changes, the meaning of clean air changes with it.',
    'Measurement is not just observation. It is the foundation of accountability.',
  ],
};

const sectionPhrases: Record<string, string[]> = {
  'invisible-bridge': [
    'the atmosphere acts as a shared biological system',
    'breathing becomes a daily exchange between humans and the planet',
    'pollution interrupts a cycle that is normally seamless',
    'monitoring tools translate invisible conditions into public knowledge',
    'the WHO revision redraws the line for what healthy air should mean',
  ],
  'pollution-and-health': [
    'particulate matter travels deep into the lungs and bloodstream',
    'combustion gases reveal where fuel use is concentrated',
    'ozone and sulfur dioxide behave differently because chemistry changes with weather and industry',
    'health effects are strongest when exposure is repeated and prolonged',
  ],
  'aqi-and-decisions': [
    'low AQI supports normal outdoor life',
    'mid-range AQI introduces caution for sensitive groups',
    'high AQI shifts the priority from activity to protection',
    'the same number carries different meaning depending on who is reading it',
  ],
  'measurement-and-governance': [
    'ground stations deliver precision but not everywhere',
    'satellites widen the lens but blur the surface detail',
    'low-cost sensors fill the gaps when they are carefully calibrated',
    'policy standards convert scientific evidence into a threshold for action',
  ],
};

export const generateAiStorySections = (theme: StoryTheme): StorySection[] => {
  const openerPool = aiNarrativeOpeners[theme.id] || ['This theme reframes the story from a fresh angle.'];
  const closerPool = aiNarrativeClosers[theme.id] || ['The story closes with a stronger sense of context and consequence.'];
  const phrasePool = sectionPhrases[theme.id] || [];

  const generateBody = (section: StorySection, index: number) => {
    const phrase = phrasePool[index] || section.title.toLowerCase();
    const leadIn = index === 0 ? `${openerPool[0]} ` : '';
    const closing = index === theme.humanSections.length - 1 ? ` ${closerPool[0]}` : '';

    return [
      leadIn,
      `${section.title} is where ${phrase}.`,
      section.body,
      'Seen through an AI lens, the theme pulls together the science, the human experience, and the practical takeaway.',
      closing,
    ]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return theme.humanSections.map((section, index) => ({
    title: section.title,
    body: generateBody(section, index),
    bullets:
      index % 2 === 0
        ? [
            `AI synthesis: ${section.title} reframed in a broader system context.`,
            `Theme continuity: ${theme.title} keeps the same subtopic structure.`,
          ]
        : [`AI synthesis: ${section.title} translated into practical implications.`],
  }));
};
