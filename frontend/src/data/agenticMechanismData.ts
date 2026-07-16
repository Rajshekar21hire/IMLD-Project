// Illustrative monthly PM2.5 (ug/m3) for the five Agentic AI cities.
// Shaped from the well-documented South Asian seasonal pattern - a post-monsoon/winter
// spike (crop residue burning + thermal inversion trapping traffic and industrial load)
// followed by a monsoon-season low - rather than pulled from the raw per-day CSV, since
// this section speaks in rounded, story-friendly numbers the same way the rest of the
// Agentic cards do.

export type MonthlyPm25 = { month: string; value: number };

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const AGENTIC_MECHANISM_CITIES = ['Delhi', 'Lahore', 'Dhaka', 'Kathmandu', 'Kolkata'] as const;
export type MechanismCity = (typeof AGENTIC_MECHANISM_CITIES)[number];

export const CITY_MONTHLY_PM25: Record<MechanismCity, number[]> = {
  // Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
  Delhi:     [228, 178, 122, 96, 88, 74, 58, 54, 68, 142, 262, 248],
  Lahore:    [204, 162, 108, 82, 78, 70, 62, 58, 72, 158, 248, 236],
  Dhaka:     [168, 138, 102, 78, 66, 48, 40, 38, 52, 96, 154, 172],
  Kathmandu: [148, 132, 118, 92, 74, 52, 42, 40, 58, 108, 158, 152],
  Kolkata:   [132, 108, 88, 72, 68, 54, 44, 42, 54, 94, 146, 138],
};

export function getCityMonthlySeries(city: MechanismCity): MonthlyPm25[] {
  return CITY_MONTHLY_PM25[city].map((value, i) => ({ month: MONTH_LABELS[i], value }));
}

export function averageAnnualPm25(city: MechanismCity): number {
  const values = CITY_MONTHLY_PM25[city];
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// WHO Global Air Quality Guidelines (2021)
export const WHO_ANNUAL_GUIDELINE_PM25 = 5; // ug/m3, annual mean
export const WHO_24H_GUIDELINE_PM25 = 15; // ug/m3, 24-hour mean - used as the heatmap's colour anchor

// Berkeley Earth's widely-cited "cigarette equivalence" estimate: one cigarette a day is
// roughly equivalent to breathing 22 ug/m3 of PM2.5 for a full day.
export const CIGARETTE_EQUIVALENT_PM25 = 22;

export function cigarettesPerDay(avgPm25: number): number {
  return Math.max(0, Math.round(avgPm25 / CIGARETTE_EQUIVALENT_PM25));
}

// Tiered city set for the "Twelve months, in particles" and "Simulate the next years" beats -
// three of the world's most polluted cities, two mid-range, and two of the cleanest, so the
// same 12-bar/particle treatment reads as "severity", not just "South Asia is bad". Worst-tier
// values reuse the real CITY_MONTHLY_PM25 data above; medium/best are new, illustrative,
// shaped from each city's well-documented seasonal pattern (medium: dusty spring build-up in
// Beijing, dry-season haze in Mexico City; best: comfortably under the WHO guideline year-round).
export type AgenticCityTier = 'worst' | 'medium' | 'best';

export type TieredCity = {
  city: string;
  tier: AgenticCityTier;
  monthly: number[];
};

export const AGENTIC_TIERED_CITIES: TieredCity[] = [
  { city: 'Lahore', tier: 'worst', monthly: CITY_MONTHLY_PM25.Lahore },
  { city: 'Delhi', tier: 'worst', monthly: CITY_MONTHLY_PM25.Delhi },
  { city: 'Dhaka', tier: 'worst', monthly: CITY_MONTHLY_PM25.Dhaka },
  //           Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  Dec
  { city: 'Beijing', tier: 'medium', monthly: [98, 92, 88, 66, 54, 46, 42, 40, 48, 62, 84, 102] },
  { city: 'Mexico City', tier: 'medium', monthly: [58, 62, 68, 64, 56, 44, 36, 34, 38, 44, 50, 56] },
  { city: 'Zurich', tier: 'best', monthly: [14, 13, 12, 10, 9, 8, 8, 8, 9, 11, 13, 15] },
  { city: 'Wellington', tier: 'best', monthly: [7, 7, 6, 6, 6, 7, 7, 7, 6, 6, 7, 7] },
];

export const AGENTIC_TIER_LABELS: Record<AgenticCityTier, string> = {
  worst: 'Worst air',
  medium: 'Middle of the pack',
  best: 'Cleanest air',
};

export function getTieredCity(city: string): TieredCity {
  return AGENTIC_TIERED_CITIES.find((c) => c.city === city) || AGENTIC_TIERED_CITIES[0];
}

export function averageOf(monthly: number[]): number {
  return monthly.reduce((s, v) => s + v, 0) / monthly.length;
}

// US EPA PM2.5 -> AQI conversion (2016 breakpoint table), used to give the "Twelve months, in
// particles" bars a scale readers already recognise instead of a raw microgram figure.
const PM25_AQI_BREAKPOINTS: { cLow: number; cHigh: number; iLow: number; iHigh: number }[] = [
  { cLow: 0.0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5, cHigh: 500.4, iLow: 401, iHigh: 500 },
];

export function pm25ToAqi(pm25: number): number {
  const c = Math.max(0, pm25);
  const bracket =
    PM25_AQI_BREAKPOINTS.find((b) => c >= b.cLow && c <= b.cHigh) || PM25_AQI_BREAKPOINTS[PM25_AQI_BREAKPOINTS.length - 1];
  const aqi = ((bracket.iHigh - bracket.iLow) / (bracket.cHigh - bracket.cLow)) * (c - bracket.cLow) + bracket.iLow;
  return Math.round(Math.min(500, aqi));
}

export type AqiCategory = 'good' | 'moderate' | 'usg' | 'unhealthy' | 'very-unhealthy' | 'hazardous';

export function aqiCategory(aqi: number): AqiCategory {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'usg';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

export const AQI_CATEGORY_INFO: Record<AqiCategory, { label: string; range: string; color: string; summary: string }> = {
  good: {
    label: 'Good',
    range: '0-50',
    color: '#3f9142',
    summary: 'Air quality is satisfactory, and air pollution poses little or no risk.',
  },
  moderate: {
    label: 'Moderate',
    range: '51-100',
    color: '#c9a227',
    summary: 'Acceptable, but unusually sensitive people may notice mild symptoms.',
  },
  usg: {
    label: 'Unhealthy for sensitive groups',
    range: '101-150',
    color: '#d9822b',
    summary: 'Children, older adults, and people with asthma or heart disease may feel effects.',
  },
  unhealthy: {
    label: 'Unhealthy',
    range: '151-200',
    color: '#c9483f',
    summary: 'Everyone may begin to notice health effects; sensitive groups more seriously.',
  },
  'very-unhealthy': {
    label: 'Very unhealthy',
    range: '201-300',
    color: '#8f4fa0',
    summary: 'Health alert - the risk of health effects is increased for everyone.',
  },
  hazardous: {
    label: 'Hazardous',
    range: '301+',
    color: '#7e2b3a',
    summary: 'Health warning of emergency conditions - the entire population is likely affected.',
  },
};

// Health issues (for polluted-air categories) or benefits (for "good" air) that real residents
// report at each AQI band - shown as the city-specific button row under the 12-month chart, so
// the effects on view always match the severity of the city currently selected.
export type HealthEffect = { id: string; label: string; description: string };

export const AQI_HEALTH_EFFECTS: Record<AqiCategory, HealthEffect[]> = {
  good: [
    {
      id: 'healthy-lung-development',
      label: 'Healthy lung development',
      description: "Children's lungs develop normally, without the growth deficits seen in heavily polluted cities.",
    },
    {
      id: 'longer-life-expectancy',
      label: 'Longer life expectancy',
      description: 'Residents gain back years of life expectancy compared to living in heavily polluted air.',
    },
    {
      id: 'lower-heart-risk',
      label: 'Lower cardiovascular risk',
      description: 'Long-term exposure this low is not associated with increased heart attack or stroke risk.',
    },
    {
      id: 'fewer-sick-days',
      label: 'Fewer respiratory illnesses',
      description: 'Asthma flare-ups and lower-respiratory infections stay rare across the population.',
    },
  ],
  moderate: [
    {
      id: 'sensitive-symptoms',
      label: 'Symptoms in sensitive people',
      description: 'Unusually sensitive individuals (asthma, existing lung or heart conditions) may notice mild symptoms.',
    },
    {
      id: 'mild-irritation',
      label: 'Mild eye and throat irritation',
      description: 'Some residents notice mild eye, nose, or throat irritation on the higher days of the month.',
    },
    {
      id: 'reduced-outdoor-comfort',
      label: 'Reduced outdoor comfort',
      description: 'Prolonged outdoor exertion can feel slightly harder on higher-pollution days.',
    },
  ],
  usg: [
    {
      id: 'child-asthma-risk',
      label: 'More childhood asthma attacks',
      description: 'Children, whose lungs are still developing, face a higher chance of an asthma flare-up.',
    },
    {
      id: 'elderly-strain',
      label: 'Strain on older adults',
      description: 'Older adults and people with heart or lung disease may feel breathlessness or fatigue sooner.',
    },
    {
      id: 'pregnancy-risk',
      label: 'Pregnancy complications',
      description: 'Sustained exposure at this level is linked to a higher risk of low birth weight.',
    },
  ],
  unhealthy: [
    {
      id: 'reduced-lung-function',
      label: 'Reduced lung function',
      description: 'Everyone can experience measurable drops in lung function after outdoor activity.',
    },
    {
      id: 'aggravated-heart-disease',
      label: 'Aggravated heart and lung disease',
      description: 'Existing heart and respiratory conditions are more likely to flare up or need medication.',
    },
    {
      id: 'increased-er-visits',
      label: 'More emergency room visits',
      description: 'Hospitals typically see a rise in respiratory and cardiac emergency visits during these spells.',
    },
  ],
  'very-unhealthy': [
    {
      id: 'serious-respiratory-effects',
      label: 'Serious respiratory effects for everyone',
      description: 'Even healthy people can develop coughing, throat irritation, and difficulty breathing outdoors.',
    },
    {
      id: 'shortened-life-expectancy',
      label: 'Shortened life expectancy',
      description: 'Sustained exposure at this level is linked to years shaved off average life expectancy.',
    },
    {
      id: 'child-development-harm',
      label: 'Harm to child brain and lung development',
      description: "Chronic exposure during childhood is linked to reduced lung growth and cognitive development.",
    },
  ],
  hazardous: [
    {
      id: 'emergency-conditions',
      label: 'Emergency health conditions',
      description: 'The entire population is at risk of serious effects - authorities typically urge staying indoors.',
    },
    {
      id: 'premature-death-risk',
      label: 'Elevated risk of premature death',
      description: 'Days like this are linked in epidemiological studies to a measurable rise in premature mortality.',
    },
    {
      id: 'chronic-disease-worsening',
      label: 'Worsening of chronic disease',
      description: 'People with existing heart or lung disease face serious risk of their condition worsening sharply.',
    },
  ],
};

// Shared intervention presets for "How it feels to live here" and "Simulate the next years" -
// reduction shares and notice-timeframes are drawn from the same real-world case studies already
// cited elsewhere in the dashboard (China's 2014-2019 PM2.5 program, London ULEZ), so the two
// visualizations stay consistent with the rest of the app's numbers instead of inventing new ones.
export type AgenticSolution = {
  id: string;
  label: string;
  shortLabel: string;
  pm25ReductionShare: number; // fraction of PM2.5 this solution can realistically remove
  yearsToNotice: number;
};

export const AGENTIC_SOLUTIONS: AgenticSolution[] = [
  {
    id: 'end-crop-burning',
    label: 'End crop residue burning',
    shortLabel: 'No crop burning',
    pm25ReductionShare: 0.34,
    yearsToNotice: 2,
  },
  {
    id: 'electrify-transport',
    label: 'Electrify vehicles and buses',
    shortLabel: 'Electric transport',
    pm25ReductionShare: 0.2,
    yearsToNotice: 5,
  },
  {
    id: 'industrial-standards',
    label: 'Enforce industrial emission standards',
    shortLabel: 'Cleaner industry',
    pm25ReductionShare: 0.25,
    yearsToNotice: 5,
  },
  {
    id: 'urban-trees',
    label: 'Plant urban trees and green belts',
    shortLabel: 'More trees',
    pm25ReductionShare: 0.15,
    yearsToNotice: 8,
  },
];

// The root-cause drivers behind "How it feels to live here" - flip cards, not interventions,
// so each one carries a short plain-language description used both on the card back and as
// context for the Ollama-generated one-liner about how that driver plays out in the selected city.
export type AgenticFactor = {
  id: string;
  label: string;
  description: string;
  icon: string;
};

export const AGENTIC_FACTORS: AgenticFactor[] = [
  {
    id: 'geography-meteorology',
    label: 'Geography & meteorology',
    description: 'valleys and still winter winds that trap pollution close to the ground',
    icon: '\u{1F3D4}️',
  },
  {
    id: 'urban-sprawl',
    label: 'Urban sprawl & construction',
    description: 'unpaved roads and constant construction dust from fast, sprawling growth',
    icon: '\u{1F3D7}️',
  },
  {
    id: 'governance-gap',
    label: 'Governance gap',
    description: 'emissions rules that exist on paper but are weakly enforced on the ground',
    icon: '\u{1F4CB}',
  },
  {
    id: 'transport',
    label: 'Transport',
    description: 'aging vehicle fleets, traffic congestion, and diesel exhaust',
    icon: '\u{1F697}',
  },
  {
    id: 'brick-kilns',
    label: 'Brick kilns',
    description: 'thousands of traditional kilns burning low-grade fuel on the outskirts',
    icon: '\u{1F9F1}',
  },
  {
    id: 'industry-power',
    label: 'Industry & power',
    description: 'coal-fired power plants and industrial smokestacks',
    icon: '\u{1F3ED}',
  },
  {
    id: 'crop-burning',
    label: 'Crop burning',
    description: 'seasonal burning of crop stubble right after harvest',
    icon: '\u{1F525}',
  },
];
