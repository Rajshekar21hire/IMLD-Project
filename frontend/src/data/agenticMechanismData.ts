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

// WHO Global Air Quality Guidelines (2021)
export const WHO_ANNUAL_GUIDELINE_PM25 = 5; // ug/m3, annual mean
export const WHO_24H_GUIDELINE_PM25 = 15; // ug/m3, 24-hour mean - used as the heatmap's colour anchor

// Delhi's winter (Oct-Jan) crop-burning contribution, used by the counterfactual slider.
// Illustrative, consistent with the "crop" share already used in SourceMixComparator.tsx.
export const DELHI_WINTER_MONTHS = ['Oct', 'Nov', 'Dec', 'Jan'];
export const DELHI_WINTER_BASELINE = [142, 262, 248, 228]; // matches CITY_MONTHLY_PM25.Delhi
export const DELHI_WINTER_STUBBLE_SHARE = 0.34; // fraction of winter PM2.5 attributable to stubble burning
export const DELHI_WINTER_FLOOR = 62; // ug/m3 the mechanism's other sources still contribute at 100% reduction

// The repeated causal chain shown in the Mechanism Flow Diagram.
export const MECHANISM_CHAIN = [
  {
    key: 'crop',
    label: 'Crop residue burning',
    short: 'Crop burning',
    explainer: 'Farmers clear fields fast between harvests, and burning is the cheapest way. The smoke drifts straight into nearby cities.',
  },
  {
    key: 'traffic',
    label: 'Vehicular load',
    short: 'Traffic',
    explainer: 'Millions of daily commutes add a steady layer of exhaust that never really clears, even before the smoke arrives.',
  },
  {
    key: 'industry',
    label: 'Industrial emissions',
    short: 'Industry',
    explainer: 'Kilns and factories run year-round, adding a constant baseline of fine particles beneath the seasonal spikes.',
  },
  {
    key: 'inversion',
    label: 'Thermal inversion',
    short: 'Inversion',
    explainer: 'Cool winter air traps warm, dirty air close to the ground like a lid, so nothing gets a chance to disperse.',
  },
  {
    key: 'pm25',
    label: 'PM2.5 spike',
    short: 'PM2.5 spike',
    explainer: 'All three sources land at once, right when the weather can least clear them - so the air turns hazardous fast.',
  },
  {
    key: 'health',
    label: 'Health load',
    short: 'Health load',
    explainer: 'Hospitals see the spike within days - more asthma attacks, more missed school and work, more strain on older lungs.',
  },
] as const;
