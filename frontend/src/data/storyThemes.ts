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
          'PM2.5 (WHO guideline 5 µg/m³ annual mean, 2021): Fine particulate matter under 2.5 micrometres in diameter, the single most lethal air pollutant tracked globally. Sources: vehicle exhaust, coal combustion, wildfires, agricultural burning, industrial processes. Health effects: penetrates deep into lung tissue and enters the bloodstream, driving cardiovascular disease, stroke, lung cancer, diabetes, and cognitive decline — no safe level has been identified. Hazard level: very high.',
          'PM10 (WHO guideline 15 µg/m³ annual mean, 2021): Coarse particles between 2.5 and 10 micrometres, trapped in the nose and upper airways. Sources: road dust, construction, pollen, sea salt, agricultural operations. Health effects: nasal and throat irritation, bronchitis, and aggravated asthma — largely filtered before reaching the lungs, unlike PM2.5. Hazard level: moderate.',
          'NO2 (WHO guideline 10 µg/m³ annual mean, 2021): Nitrogen dioxide, a reddish-brown gas formed when fuel burns at high temperatures — a major marker of traffic pollution. Sources: vehicle engines, power plants, industrial boilers, gas appliances. Health effects: inflames the lining of the airways, reducing lung function and worsening asthma; long-term exposure is linked to development of asthma in children. Hazard level: high near roads.',
          'O3 (WHO guideline 100 µg/m³ peak season daily max, 2021): Ground-level ozone, formed when NO2 and volatile organic compounds react in sunlight — not emitted directly, peaks on hot, sunny, stagnant days. Sources: vehicle exhaust + industrial VOCs + sunlight. Health effects: irritates the respiratory system, triggers asthma attacks, reduces lung capacity, and damages crops and ecosystems as well as human health. Hazard level: high in summer heat.',
          'SO2 (WHO guideline 40 µg/m³ 24-hour mean, 2021): Sulphur dioxide, a sharp-smelling gas released primarily by burning high-sulphur coal and heavy oil — a major cause of acid rain. Sources: coal-fired power plants, oil refineries, metal smelters, volcanoes. Health effects: constricts airways immediately on inhalation, is a major driver of COPD near industrial zones, and combines with water vapour to form sulphuric acid in the lungs. Hazard level: high near industry.',
          'CO (WHO guideline 4 mg/m³ 24-hour mean, 2021): Carbon monoxide, a colourless, odourless gas produced by incomplete combustion, binding to haemoglobin 200x more readily than oxygen. Sources: vehicle exhaust, gas appliances, open fires, industrial combustion. Health effects: at high concentrations causes headache, confusion, and death by oxygen deprivation; chronic low-level exposure impairs neurological function. Hazard level: high indoors/traffic.',
        ],
      },
      {
        title: 'From chemistry to a single number',
        body:
          'Air quality is reported using the Air Quality Index (AQI). The AQI converts raw pollutant concentrations into a 0–500 score, helping people understand what the air means for health and daily activity.',
        bullets: [
          'AQI 0–50: Safe for all outdoor activities. No restrictions needed for sensitive groups. Exercise freely outdoors. PM2.5 < 12 µg/m³ — within WHO guideline.',
          'AQI 51–100: Acceptable for most people. Unusually sensitive individuals should reduce prolonged outdoor activity. Light outdoor activity is fine for most. PM2.5 12–35 µg/m³ — above WHO guideline.',
          'AQI 101–150: General public unlikely to be affected. Children, elderly, and those with respiratory/heart conditions should limit outdoor exertion. Active children and adults should reduce prolonged outdoor activity. PM2.5 35–55 µg/m³ — significantly above WHO guideline.',
          'AQI 151–200: Everyone may begin to feel health effects. Children and sensitive groups should avoid outdoor activity. Everyone should reduce prolonged outdoor exertion. PM2.5 55–150 µg/m³ — 10–30x WHO guideline.',
          'AQI 201–300: Health alert — significant aggravation for everyone. Sensitive groups should stay indoors. Avoid outdoor activity and use an air purifier indoors. PM2.5 150–250 µg/m³ — Delhi reaches this regularly in winter.',
          'AQI 301–500: Emergency conditions — everyone affected. Stay indoors with air purification and seal windows. No outdoor activity; wear an N95 mask if you must go out. PM2.5 250+ µg/m³ — Ulaanbaatar’s worst winter nights reach 700+ µg/m³.',
        ],
      },
      {
        title: 'How we measure air quality?',
        body:
          'No single technology gives us the full story. Ground stations are accurate but sparse. Satellites cover the globe but miss surface detail. Low-cost sensors fill gaps but need calibration. Together they create the best picture we have.',
        bullets: [
          'Ground stations — Strengths: highest accuracy and the regulatory standard, hourly real-time data streams, used for official AQI reporting. Limitations: very sparse in low-income countries, $50,000–$200,000 per unit, Africa has <100 stations for 1.4bn people.',
          'Satellite sensors — Strengths: full global coverage every 1–2 days, detects pollution events in unmonitored regions, AI can extract surface-level estimates from column data. Limitations: measures column average not surface level, blocked by thick clouds and aerosol layers, spatial resolution ~3.5km² minimum.',
          'Low-cost sensors — Strengths: dense urban networks for block-level detail, community-owned and operated, AirQo deploying across African cities. Limitations: lower accuracy and needs calibration against reference, humidity and temperature affect readings, data quality varies widely by device and location.',
        ],
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
        title: 'Deep dives: the worst-affected places',
        body:
          'In order to deep dive, we need to know what are the best and worst cities according to the air quality index.\n\nThere are certain factors that contribute to the root cause of the cities having a bad air quality. The five cities we see share a structural cluster of causes such as fossil-fuel transport, coal-fired kilns and industrial emissions. These are then amplified by flat basin geography that traps pollutants in winter inversions, and undermined by weak cross-boundary governance.',
        table: {
          columns: [
            'Lahore (~102–195 µg/m³)',
            'Delhi (~170 µg/m³)',
            'New Delhi (~165 µg/m³)',
            'Dhaka (~66–195 µg/m³)',
            'Ghaziabad (~158 µg/m³)',
          ],
          rows: [
            {
              label: 'Transport & vehicles',
              values: [
                '35% of PM2.5; 6.3M registered vehicles, mostly old diesel; low-grade Euro II fuel',
                'Largest single source (17–39%); 2- and 3-wheelers dominate (50% of transport share)',
                'Same NCR transport network as Delhi; shared airshed compounds exposure',
                'Up to 15% of PM2.5; 6.17 lakh unfit vehicles with expired fitness certificates',
                'Dense truck and heavy vehicle corridor on NH-9; industrial transport hub',
              ],
            },
            {
              label: 'Brick kilns',
              values: [
                '17% of PM2.5; thousands of coal-burning kilns across Punjab; often illegal/unregulated',
                'Significant contributor; kilns in NCR periphery burn coal and agricultural waste',
                'Shared NCR kiln belt; kilns in UP and Haryana directly affect New Delhi airshed',
                '2,000+ kilns surrounding city; historically the #1 source, now 13–29% of PM2.5',
                'Major kiln clusters in Ghaziabad district itself; part of Delhi NCR kiln belt',
              ],
            },
            {
              label: 'Industry & power',
              values: [
                '28% of PM2.5; steel, foundry, textile factories burn coal/furnace oil; unregulated',
                "Regional power & industry 14% of daily PM2.5; coal plants in NCR; Badarpur plant (now closed) responsible for 80–90% of power-sector particulates",
                'Industrial estates in NCR; shared regional industry emissions',
                'Factories discharge without filtration; household fuel combustion 28% of PM2.5',
                "Heavy industrial base - plastics, metals, chemicals; one of UP's most industrialised districts",
              ],
            },
            {
              label: 'Crop burning',
              values: [
                'Seasonal spikes from Punjab (Pakistan & India border) stubble burning; worsens Oct–Nov',
                '~30–40% of winter PM2.5 spikes; paddy stubble burning in Haryana & Punjab',
                'Same seasonal biomass spike as Delhi; transboundary contribution from UP fields',
                '10% from transboundary sources; regional agricultural burning drifts in',
                'Surrounded by agricultural land in western UP; crop fire smoke a major seasonal driver',
              ],
            },
            {
              label: 'Geography & meteorology',
              values: [
                'Flat Punjab plain; winter temperature inversions trap pollutants; no dispersion',
                'Landlocked; surrounded by states; winter fog + low wind = PM2.5 accumulation',
                'Same bowl geography as Delhi; no natural ventilation corridor',
                'River delta city; dense fog and low wind in winter trap particulates',
                'Downwind of Delhi; elevated from Yamuna floodplain; receives pollution from west',
              ],
            },
            {
              label: 'Urban sprawl & construction',
              values: [
                'Unregulated construction over green/agricultural land; loss of tree cover',
                'Rapid unplanned urbanisation; construction dust among top sources',
                'Construction boom in NCR; road dust 35–66% of PM10',
                '30% of pollution from construction and road works; fastest-growing urban area',
                'Rapid high-rise construction; road dust and debris uncontrolled',
              ],
            },
            {
              label: 'Governance gap',
              values: [
                'Poor enforcement; companies, farmers, vehicle owners undeterred; policy not implemented',
                'Multiple overlapping jurisdictions (Delhi, UP, Haryana); no single authority',
                'Same multi-state governance gap as Delhi',
                '75% of closed kilns resume operations; only 10% of eco-brick target met by 2025',
                'UP state enforcement weaker than Delhi; proximity to capital creates regulatory grey zone',
              ],
            },
          ],
        },
      },
      {
        title: 'Human stories: Real lives shaped by air quality',
        body:
          'Beyond rankings and metrics, air quality is a daily reality for families across the world. These voices from Gulf News and lung.org (2020–2025) share how poor air quality has profoundly changed their lives, their health, and their choices. Each story reveals not just suffering, but a pattern: pollution is not something that happened once, but something people wake up to every single day, with often no real way out.',
      },
      {
        title: 'Syed Hasnain: A child\'s pneumonia and the invisible threat',
        body:
          'Syed Hasnain watched his 4-year-old develop a persistent cough and struggle to breathe, with a high temperature following. Thinking it might be coronavirus, he rushed his son to the hospital. But the doctors delivered an unexpected diagnosis: pneumonia caused by smog. The air itself had become the infection vector. For a parent, that realisation transforms how you see every breath your child takes—the very air that should sustain them had instead become the weapon that harmed them.',
      },
      {
        title: 'Cheri M.: A coastal dream interrupted by worsening asthma',
        body:
          'Cheri M. lives in what should be a clean area—coastal Encinitas, California. But her worsening asthma has drastically altered her life. Doctors told her she now has the lungs of a 90-year-old smoker, despite being in her late 50s. Living near a busy road, she keeps air purifiers in every room and doesn\'t dare walk without a mask because of diesel trucks and flying dust. She has had to carefully monitor the people she\'s around and the places she goes to avoid even catching a common cold, which could have dire consequences for her respiratory health. Clean air, for her, is no longer a backdrop to life—it\'s become a daily condition she must negotiate.',
      },
      {
        title: 'Khushboo Bharti: Watching her infant\'s struggle',
        body:
          'Khushboo Bharti remembers the moment her 1-year-old daughter Samaira woke with a violent cough that made her vomit several times. On the way to the hospital, Samaira didn\'t react to anyone or anything—very unlike her usually bubbly nature. She wouldn\'t even lift her head. It was the worst moment of Khushboo\'s life. Even now, if her daughter coughs just a few times, Khushboo panics. Doctors told her Samaira might need to be on inhalers for some time. Khushboo asks the question that haunts many parents in polluted cities: "What is the point of living in a city where my daughter can\'t even breathe safely?" Her husband\'s business is in Delhi, so they can\'t simply leave. But the moment they have a chance, they\'ll move.',
      },
      {
        title: 'Jeanne W.: From pollen allergies to daily asthma management',
        body:
          'Jeanne W. was always susceptible to lung irritation from pollens, dust, and mold. As a child, she dealt with seasonal allergies from grasses and sweet clover. But since moving to Utah ten years ago, she has been diagnosed with asthma. Managing asthma has become a daily part of her life. She takes long-term asthma control medications, allergy-induced asthma treatments, and quick-relief medications. When these don\'t work, she uses a nebulizer that turns liquid medicine into a mist just so she can breathe. What started as seasonal susceptibility has become a chronic condition managed by multiple medications and devices every single day.',
      },
      {
        title: 'kathleen f.: Watching her father\'s final stages',
        body:
          'kathleen f. is fighting for air quality because her father is in the final stages of emphysema. He is on oxygen 24/7 and on every medication available for emphysema treatment. It hurts to hear him tell her that it\'s getting harder to breathe, that he has good days and bad days—but mostly bad. He is 76 years old, but kathleen still thinks that\'s too young to lose someone when there\'s nothing fundamentally wrong with him except his damaged lungs. She loves her dad very much, and watching him struggle has become the deepest motivation for her to hope and pray he\'ll be with them for at least a few more years. His suffering is her reason to care about air quality.',
      },
      {
        title: 'Mark E.: Transport choices and air quality memories',
        body:
          'Mark E. would be elated to return to a 55 mph speed limit. Right now, he drives at that speed himself and stays 5 mph slower in town. He shuts off his engine when sitting in a line at a food place or doing banking. He lived in San Diego, California in the 1960s and early 1970s, when his family moved to the high desert to escape pollution and the allergies it triggered. It helped a lot. Later, when he came to Sioux Falls, South Dakota, he discovered the real villain wasn\'t pollen—it was smog. He believes that if we could improve air quality, we could eliminate some of the lung problems and allergies that plague so many people. His choices around transport and his memory of moving to escape pollution drive his conviction that cleaner air is possible.',
      },
      {
        title: 'Sue B.: A respiratory therapist\'s daily witness',
        body:
          'Sue B. is a respiratory therapist at Cincinnati Children\'s Hospital. Every single day, she sees children struggling to breathe. None of us can exist without air and water—these are the fundamental stuff of life for each of us. But for the children she treats, even breathing has become a medical challenge. Her frontline perspective means she sees the consequences of air pollution not as statistics or trends, but as families in crisis, and children fighting for every breath. Her calling is to care for them, but her deeper wish is that fewer children would need her help at all.',
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
    title: 'Future predictions and pathways to clean air',
    shortDescription: 'A forward-looking story on proven fixes, lived experiences, and policy action for cleaner air.',
    overview:
      'This story explores practical methods to improve air quality, human voices showing the change on the ground, and the government action needed to make clean air real.',
    promptFocus:
      'Write a grounded story about pathways to clean air through proven methods, human experiences of improvement, and the government actions required to lock in progress.',
    status: 'ready',
    humanSections: [
      {
        title: 'Methods to improve air quality',
        body:
          'The air can get better. Here\'s how. 4 categories, 12 proven interventions.',
        categoryBlocks: [
          {
            label: 'Personal',
            cards: [
              {
                title: 'Switch to an electric or hybrid vehicle',
                pollutant: 'NO2',
                reduction: '60-100%',
                evidence:
                  'Road transport is the largest single contributor to urban NO2, and switching away from petrol removes tailpipe PM2.5 at the source.',
                example: 'Urban transport transition in European clean-air zones',
                impactScore: 90,
                body:
                  'Road transport is the largest single contributor to urban NO2. Switching from a petrol car eliminates tailpipe PM2.5 entirely. If you cannot switch, walk, cycle, or use public transport.',
                footer: 'NO2 cut 60-100% per vehicle',
              },
              {
                title: 'Choose cycling or walking for short trips',
                pollutant: 'PM2.5 / NO2',
                reduction: 'Zero tailpipe emissions',
                evidence:
                  'Each trip moved away from a car removes a pollution source and cuts time spent in the highest-concentration traffic environment.',
                example: 'Short-trip mode shift in compact cities',
                impactScore: 75,
                body:
                  'Every trip shifted from car to bike removes a vehicle from the road and removes you as a pollution source. Cycling also means you spend less time in traffic - the highest-concentration microenvironment.',
                footer: 'Zero tailpipe emissions per trip',
              },
            ],
          },
          {
            label: 'Household',
            cards: [
              {
                title: 'Replace gas cooking with induction',
                pollutant: 'NO2 / PM2.5',
                reduction: 'Indoor NO2 cut up to 40%',
                evidence:
                  'Gas hobs release combustion pollution directly into kitchens, while induction removes that point-of-use exposure immediately.',
                example: 'Household kitchen upgrades in urban apartments',
                impactScore: 80,
                body:
                  'Gas hobs emit NO2 and PM2.5 directly into your kitchen. Induction is zero-emission at the point of use and reduces indoor air pollution immediately.',
                footer: 'Indoor NO2 cut up to 40%',
              },
              {
                title: 'Stop burning wood or waste indoors',
                pollutant: 'PM2.5',
                reduction: 'Indoor PM2.5 cut 50-90%',
                evidence:
                  'Open fires and wood-burning stoves are among the leading sources of indoor particulate exposure, so removing combustion sharply lowers risk.',
                example: 'Cleaner cookstove adoption in households',
                impactScore: 92,
                body:
                  'Open fires and wood-burning stoves are the leading source of indoor PM2.5. Switching to a certified low-emission stove or, better, eliminating combustion heating entirely, dramatically reduces exposure.',
                footer: 'Indoor PM2.5 cut 50-90%',
              },
              {
                title: 'Use a HEPA air purifier indoors',
                pollutant: 'PM2.5',
                reduction: 'Indoor PM2.5 cut 70-90%',
                evidence:
                  'Bedroom filtration reduces overnight exposure during the longest continuous indoor period, when health benefits are easiest to sustain.',
                example: 'Bedroom air cleaning in polluted cities',
                impactScore: 88,
                body:
                  'A HEPA purifier in your bedroom reduces overnight PM2.5 exposure by 70-90%. Given that we spend 8+ hours sleeping, this is the highest-value personal investment for health in a polluted city.',
                footer: 'Indoor PM2.5 cut 70-90%',
              },
              {
                title: 'Switch to solar or renewable electricity',
                pollutant: 'SO2 / PM',
                reduction: 'Demand eliminated',
                evidence:
                  'Renewable electricity cuts demand for coal power, which is one of the largest global sources of sulphur dioxide and particulate pollution.',
                example: 'Home tariff switching and rooftop solar',
                impactScore: 85,
                body:
                  'Coal power plants are the largest single source of SO2 globally. Switching your home to a renewable tariff or installing solar panels directly reduces demand for the dirtiest electricity generation.',
                footer: 'SO2 and PM demand eliminated',
              },
            ],
          },
          {
            label: 'Policy',
            cards: [
              {
                title: 'Industrial emission standards with enforcement',
                pollutant: 'PM2.5',
                reduction: 'PM2.5 cut 35%',
                evidence:
                  'Mandatory scrubbers, fuel switching, and real-time monitoring can drive large reductions when enforcement has real penalties behind it.',
                example: 'China\'s war on pollution (2014-2019)',
                impactScore: 95,
                body:
                  'Mandatory scrubbers, fuel switching, and real-time stack monitoring with penalties. China\'s war on pollution (2014-2019) cut PM2.5 by 35% using this approach.',
                footer: 'PM2.5 cut 35% (China, 5 years)',
              },
              {
                title: 'Electrify urban bus fleets',
                pollutant: 'PM2.5 / NO2',
                reduction: 'PM2.5 cut 48%',
                evidence:
                  'Fleet electrification removes exhaust pollution from dense transport corridors and delivers one of the strongest per-vehicle health returns.',
                example: 'Shenzhen bus fleet electrification',
                impactScore: 93,
                body:
                  'Shenzhen\'s full electric bus fleet of 16,000 vehicles reduced bus-attributable PM2.5 by 48% in major corridors. Public transport electrification has the highest per-vehicle health return of any fleet policy.',
                footer: 'PM2.5 cut 48% in corridors',
              },
              {
                title: 'End agricultural burning - with alternatives',
                pollutant: 'PM2.5',
                reduction: 'Delhi winter AQI: ~30% potential',
                evidence:
                  'Burn bans fail without economic alternatives, but subsidy-backed alternatives and payments for not burning can reduce seasonal spikes.',
                example: 'Punjab and Haryana stubble burning',
                impactScore: 82,
                body:
                  'Stubble burning in Punjab and Haryana causes Delhi\'s worst air events. Banning without economic alternatives fails. Subsidising mechanical harvesters and direct payment for not burning works.',
                footer: 'Delhi winter AQI: ~30% potential',
              },
            ],
          },
          {
            label: 'Community',
            cards: [
              {
                title: 'Plant trees on busy streets',
                pollutant: 'NO2 / PM',
                reduction: 'PM2.5 cut 15-25%',
                evidence:
                  'Tree canopies absorb gases and intercept particles, especially in street canyons where pollutants are concentrated.',
                example: 'Tree-lined streets in dense urban corridors',
                impactScore: 68,
                body:
                  'Street trees absorb NO2 through leaf stomata and physically intercept PM particles. A dense tree canopy on a canyon street can reduce PM2.5 at pavement level by up to 25%.',
                footer: 'PM2.5 cut 15-25% on tree-lined streets',
              },
              {
                title: 'Advocate for a low-emission zone in your city',
                pollutant: 'NO2',
                reduction: 'NO2 cut 30-50%',
                evidence:
                  'Low-emission zones consistently reduce roadside pollution and can also lower childhood asthma hospitalisations.',
                example: 'London ULEZ and 320+ LEZs across Europe',
                impactScore: 89,
                body:
                  'London\'s ULEZ reduced roadside NO2 by 44% in covered areas and cut childhood asthma hospitalisations. Over 320 LEZs now operate across European cities - they consistently deliver measurable results.',
                footer: 'NO2 cut 30-50% in zone',
              },
              {
                title: 'Demand real-time AQI monitoring and data',
                pollutant: 'All pollutants',
                reduction: 'Foundation for all other action',
                evidence:
                  'Cities cannot manage what they do not measure, so transparent data makes every other intervention enforceable.',
                example: 'Public AQI monitoring and open-data dashboards',
                impactScore: 100,
                body:
                  'Cities cannot manage what they do not measure. Advocating for free public AQI monitoring, transparent data, and legally binding standards makes all other interventions enforceable.',
                footer: 'Foundation for all other action',
              },
            ],
          },
        ],
      },
      {
        title: 'Human element - resident testimonials, health worker interviews',
        body:
          'Three human voices show how clean air becomes real through grief, community action, and climate advocacy. Their stories connect asthma, household energy, and toxic exposure to the wider fight for healthier lives.',
        bullets: [
          '“No child in this country should die from asthma.” - Rosamund. Ella Roberta was born healthy, but by age seven she had asthma, and at nine she died of a fatal asthma attack. Her mother Rosamund turned that loss into campaign work, helping push Ella\'s Law — a Clean Air (Human Rights) Bill that would enshrine clean air as a legal right and bind the UK to WHO air-quality targets.',
          '“Zero-cost stoves, built by the community, for the community.” - Nitisha Agrawal. As founder and director of the Smokeless Cookstove Foundation, she works with marginalised communities across India to teach people how to make zero-cost, mud-based improved cookstoves. Her approach is built on co-creation, with stoves designed and made locally rather than handed down from outside.',
          '“I grew up knowing that the very first danger I ever faced was something invisible, something we had not ever chosen.” - Nomundari (Nomu) Urantulga. Born in Ulaanbaatar, Mongolia, she grew up around coal-burning ger-district stoves and a toxic winter haze; a family tragedy linked to exposure during pregnancy turned her pain into purpose, and she now campaigns with youth movements and Climate Healthy Planet Now to carry that lesson into every room she enters.',
        ],
      },
      {
        title: 'What governments must do',
        body:
          'What clean air actually looks like is a set of measurable gains across health, cities, households, and technology. If these interventions were implemented globally, the shift would be visible in lives saved, faster policy impact, safer indoor environments, and better warnings before dangerous pollution spikes.',
        bullets: [
          '3.7 million lives saved per year: meeting WHO 2030 clean air targets would eliminate the majority of pollution-related deaths, and South Asia alone would gain an average of 5 additional years of life expectancy.',
          'Visible change within 5 years: China cut PM2.5 by 35% in major cities in just 5 years through industrial regulation, while London’s ULEZ reduced roadside NO2 by 44%. Change at city scale is fast when policy is enforced.',
          'Immediate indoor air improvement: switching from a wood fire to a clean cookstove reduces indoor PM2.5 by over 90% from the first day of use, and children in clean-cooking households have 68% fewer respiratory infections.',
          '48-hour warnings now possible: machine learning models can forecast city-level AQI 72 hours ahead with over 90% accuracy, enabling schools to close before a hazardous event instead of after. This capability is expanding rapidly.',
        ],
      },
    ],
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
  {
    id: 'agentic',
    label: 'Agentic AI Generated',
    description: 'Agentic AI narrative using the same theme and subtopic structure.',
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
