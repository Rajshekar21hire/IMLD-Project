import { StoryTheme } from './storyTypes';

export const storyThemes: StoryTheme[] = [
  {
    id: 'aqi-and-decisions',
    badge: 'Story 3',
    title: "Today's Air, Tomorrow's Future",
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
            'Lahore (~102-195 ug/m3)',
            'Delhi (~170 ug/m3)',
            'New Delhi (~165 ug/m3)',
            'Dhaka (~66-195 ug/m3)',
            'Ghaziabad (~158 ug/m3)',
          ],
          rows: [
            {
              label: 'Transport & vehicles',
              values: [
                '35% of PM2.5; 6.3M registered vehicles, mostly old diesel; low-grade Euro II fuel',
                'Largest single source (17-39%); 2- and 3-wheelers dominate (50% of transport share)',
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
                '2,000+ kilns surrounding city; historically the #1 source, now 13-29% of PM2.5',
                'Major kiln clusters in Ghaziabad district itself; part of Delhi NCR kiln belt',
              ],
            },
            {
              label: 'Industry & power',
              values: [
                '28% of PM2.5; steel, foundry, textile factories burn coal/furnace oil; unregulated',
                "Regional power & industry 14% of daily PM2.5; coal plants in NCR; Badarpur plant (now closed) responsible for 80-90% of power-sector particulates",
                'Industrial estates in NCR; shared regional industry emissions',
                'Factories discharge without filtration; household fuel combustion 28% of PM2.5',
                "Heavy industrial base - plastics, metals, chemicals; one of UP's most industrialised districts",
              ],
            },
            {
              label: 'Crop burning',
              values: [
                'Seasonal spikes from Punjab (Pakistan & India border) stubble burning; worsens Oct-Nov',
                '~30-40% of winter PM2.5 spikes; paddy stubble burning in Haryana & Punjab',
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
                'Construction boom in NCR; road dust 35-66% of PM10',
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
          'Beyond rankings and metrics, air quality is a daily reality for families across the world. These voices from Gulf News and lung.org (2020-2025) share how poor air quality has profoundly changed their lives, their health, and their choices. Each story reveals not just suffering, but a pattern: pollution is not something that happened once, but something people wake up to every single day, with often no real way out.',
      },
      {
        title: "Syed Hasnain: A child's pneumonia and the invisible threat",
        body:
          'Syed Hasnain watched his 4-year-old develop a persistent cough and struggle to breathe, with a high temperature following. Thinking it might be coronavirus, he rushed his son to the hospital. But the doctors delivered an unexpected diagnosis: pneumonia caused by smog. The air itself had become the infection vector. For a parent, that realisation transforms how you see every breath your child takes-the very air that should sustain them had instead become the weapon that harmed them.',
      },
      {
        title: 'Cheri M.: A coastal dream interrupted by worsening asthma',
        body:
          "Cheri M. lives in what should be a clean area-coastal Encinitas, California. But her worsening asthma has drastically altered her life. Doctors told her she now has the lungs of a 90-year-old smoker, despite being in her late 50s. Living near a busy road, she keeps air purifiers in every room and doesn't dare walk without a mask because of diesel trucks and flying dust. She has had to carefully monitor the people she's around and the places she goes to avoid even catching a common cold, which could have dire consequences for her respiratory health. Clean air, for her, is no longer a backdrop to life-it's become a daily condition she must negotiate.",
      },
      {
        title: "Khushboo Bharti: Watching her infant's struggle",
        body:
          'Khushboo Bharti remembers the moment her 1-year-old daughter Samaira woke with a violent cough that made her vomit several times. On the way to the hospital, Samaira did not react to anyone or anything-very unlike her usually bubbly nature. She would not even lift her head. It was the worst moment of Khushboo\'s life. Even now, if her daughter coughs just a few times, Khushboo panics. Doctors told her Samaira might need to be on inhalers for some time. Khushboo asks the question that haunts many parents in polluted cities: "What is the point of living in a city where my daughter cannot even breathe safely?" Her husband\'s business is in Delhi, so they cannot simply leave. But the moment they have a chance, they will move.',
      },
      {
        title: 'Jeanne W.: From pollen allergies to daily asthma management',
        body:
          'Jeanne W. was always susceptible to lung irritation from pollens, dust, and mold. As a child, she dealt with seasonal allergies from grasses and sweet clover. But since moving to Utah ten years ago, she has been diagnosed with asthma. Managing asthma has become a daily part of her life. She takes long-term asthma control medications, allergy-induced asthma treatments, and quick-relief medications. When these do not work, she uses a nebulizer that turns liquid medicine into a mist just so she can breathe. What started as seasonal susceptibility has become a chronic condition managed by multiple medications and devices every single day.',
      },
      {
        title: "kathleen f.: Watching her father's final stages",
        body:
          'kathleen f. is fighting for air quality because her father is in the final stages of emphysema. He is on oxygen 24/7 and on every medication available for emphysema treatment. It hurts to hear him tell her that it is getting harder to breathe, that he has good days and bad days-but mostly bad. He is 76 years old, but kathleen still thinks that is too young to lose someone when there is nothing fundamentally wrong with him except his damaged lungs. She loves her dad very much, and watching him struggle has become the deepest motivation for her to hope and pray he will be with them for at least a few more years. His suffering is her reason to care about air quality.',
      },
      {
        title: 'Mark E.: Transport choices and air quality memories',
        body:
          'Mark E. would be elated to return to a 55 mph speed limit. Right now, he drives at that speed himself and stays 5 mph slower in town. He shuts off his engine when sitting in a line at a food place or doing banking. He lived in San Diego, California in the 1960s and early 1970s, when his family moved to the high desert to escape pollution and the allergies it triggered. It helped a lot. Later, when he came to Sioux Falls, South Dakota, he discovered the real villain was not pollen-it was smog. He believes that if we could improve air quality, we could eliminate some of the lung problems and allergies that plague so many people. His choices around transport and his memory of moving to escape pollution drive his conviction that cleaner air is possible.',
      },
      {
        title: "Sue B.: A respiratory therapist's daily witness",
        body:
          'Sue B. is a respiratory therapist at Cincinnati Children\'s Hospital. Every single day, she sees children struggling to breathe. None of us can exist without air and water-these are the fundamental stuff of life for each of us. But for the children she treats, even breathing has become a medical challenge. Her frontline perspective means she sees the consequences of air pollution not as statistics or trends, but as families in crisis, and children fighting for every breath. Her calling is to care for them, but her deeper wish is that fewer children would need her help at all.',
      },
      {
        title: 'Human Stories from the Air We Breathe',
        body:
          'Real voices from cities with the worst air show how poor air quality affects daily life, health decisions, and community resilience.',
        bullets: [
          '"In Delhi, winter mornings mean checking air quality before letting kids play outside." - Parent, Delhi. Average PM2.5 of 171.7 ug/m3 makes outdoor activities risky during peak season.',
          '"Lahore\'s smog season affects our school schedules and student attendance rates." - School administrator, Lahore. Students with respiratory conditions often stay home during hazardous air days.',
          '"Cairo\'s air quality forces us to plan outdoor work before sunrise." - Construction supervisor, Cairo. By midday, traffic pollution and dust make outdoor work uncomfortable and unsafe.',
          '"In Jakarta, we\'ve learned to use masks as part of our daily routine." - Commuter, Jakarta. Poor air quality affects commuting decisions and requires protection during peak pollution hours.',
          '"Lagos air pollution impacts our elderly residents most severely." - Community health worker, Lagos. Respiratory and cardiovascular complications increase significantly during high-pollution episodes.',
          '"Karachi\'s industrial air affects our children\'s respiratory health." - Parents group representative, Karachi. Many families report persistent cough and respiratory symptoms during peak season.',
        ],
      },
    ],
    aiSections: [
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
          "The air can get better. Here's how. 4 categories, 12 proven interventions.",
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
                example: "China's war on pollution (2014-2019)",
                impactScore: 95,
                body:
                  "Mandatory scrubbers, fuel switching, and real-time stack monitoring with penalties. China's war on pollution (2014-2019) cut PM2.5 by 35% using this approach.",
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
                  "Shenzhen's full electric bus fleet of 16,000 vehicles reduced bus-attributable PM2.5 by 48% in major corridors. Public transport electrification has the highest per-vehicle health return of any fleet policy.",
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
                  "Stubble burning in Punjab and Haryana causes Delhi's worst air events. Banning without economic alternatives fails. Subsidising mechanical harvesters and direct payment for not burning works.",
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
                  "London's ULEZ reduced roadside NO2 by 44% in covered areas and cut childhood asthma hospitalisations. Over 320 LEZs now operate across European cities - they consistently deliver measurable results.",
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
          'Six human voices show how clean air becomes real through grief, community action, and climate advocacy. Their stories connect asthma, household energy, and toxic exposure to the wider fight for healthier lives across high-burden cities.',
        bullets: [
          "No child in this country should die from asthma. - Rosamund. Ella Roberta was born healthy, but by age seven she had asthma, and at nine she died of a fatal asthma attack. Her mother Rosamund turned that loss into campaign work, helping push Ella's Law - a Clean Air (Human Rights) Bill that would enshrine clean air as a legal right and bind the UK to WHO air-quality targets.",
          'Zero-cost stoves, built by the community, for the community. - Nitisha Agrawal. As founder and director of the Smokeless Cookstove Foundation, she works with marginalised communities across India to teach people how to make zero-cost, mud-based improved cookstoves. Her approach is built on co-creation, with stoves designed and made locally rather than handed down from outside.',
          'I grew up knowing that the very first danger I ever faced was something invisible, something we had not ever chosen. - Nomundari (Nomu) Urantulga. Born in Ulaanbaatar, Mongolia, she grew up around coal-burning ger-district stoves and a toxic winter haze; a family tragedy linked to exposure during pregnancy turned her pain into purpose, and she now campaigns with youth movements and Climate Healthy Planet Now to carry that lesson into every room she enters.',
          'In Delhi winter, morning school assembly feels like breathing smoke; by noon we keep inhalers in three classrooms. - Government school teacher, Delhi. Repeated high-PM2.5 days in peak season have shifted classes indoors and increased absenteeism among children with asthma symptoms.',
          'In Lahore, emergency breathing cases rise when the smog settles and visibility drops. - Respiratory nurse, Lahore public hospital. During severe haze episodes, outpatient queues lengthen and families report persistent cough, eye irritation, and sleep disruption.',
          'In Cairo traffic corridors, we plan outdoor work before sunrise because roadside air gets heavy by mid-day. - Municipal field worker, Cairo. Colleagues report throat irritation and headaches on days with prolonged traffic congestion and dust resuspension.',
        ],
      },
      {
        title: 'What governments must do',
        body:
          'What clean air actually looks like is a set of measurable gains across health, cities, households, and technology. If these interventions were implemented globally, the shift would be visible in lives saved, faster policy impact, safer indoor environments, and better warnings before dangerous pollution spikes.',
        bullets: [
          '3.7 million lives saved per year: meeting WHO 2030 clean air targets would eliminate the majority of pollution-related deaths, and South Asia alone would gain an average of 5 additional years of life expectancy.',
          'Visible change within 5 years: China cut PM2.5 by 35% in major cities in just 5 years through industrial regulation, while London\'s ULEZ reduced roadside NO2 by 44%. Change at city scale is fast when policy is enforced.',
          'Immediate indoor air improvement: switching from a wood fire to a clean cookstove reduces indoor PM2.5 by over 90% from the first day of use, and children in clean-cooking households have 68% fewer respiratory infections.',
          '48-hour warnings now possible: machine learning models can forecast city-level AQI 72 hours ahead with over 90% accuracy, enabling schools to close before a hazardous event instead of after. This capability is expanding rapidly.',
        ],
      },
    ],
    aiSections: [],
  },
];
