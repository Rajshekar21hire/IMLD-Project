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
