/**
 * Pollutant trends extracted from waqi-airquality-master-dataset.csv
 * Global averages for 2015-2026
 */

export interface PollutantTrendPoint {
  year: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  so2: number;
  co: number;
}

export const pollutantTrendData: PollutantTrendPoint[] = [
  { year: 2015, pm25: 62.92, pm10: 30.60, no2: 13.03, o3: 22.52, so2: 5.95, co: 5.13 },
  { year: 2016, pm25: 58.89, pm10: 28.65, no2: 11.35, o3: 20.51, so2: 4.39, co: 5.02 },
  { year: 2017, pm25: 60.88, pm10: 30.34, no2: 11.07, o3: 21.72, so2: 4.05, co: 4.49 },
  { year: 2018, pm25: 58.77, pm10: 28.47, no2: 11.13, o3: 22.34, so2: 4.20, co: 4.41 },
  { year: 2019, pm25: 54.96, pm10: 26.48, no2: 10.36, o3: 20.22, so2: 3.98, co: 4.95 },
  { year: 2020, pm25: 53.40, pm10: 25.67, no2: 9.23, o3: 18.75, so2: 3.76, co: 5.28 },
  { year: 2021, pm25: 54.55, pm10: 26.18, no2: 9.43, o3: 19.06, so2: 3.75, co: 4.82 },
  { year: 2022, pm25: 53.35, pm10: 26.27, no2: 9.34, o3: 19.54, so2: 3.91, co: 5.04 },
  { year: 2023, pm25: 52.30, pm10: 26.43, no2: 8.97, o3: 20.31, so2: 3.71, co: 4.96 },
  { year: 2024, pm25: 50.17, pm10: 25.10, no2: 8.80, o3: 19.82, so2: 3.59, co: 4.75 },
  { year: 2025, pm25: 49.80, pm10: 24.83, no2: 8.47, o3: 19.61, so2: 3.16, co: 4.44 },
  { year: 2026, pm25: 49.59, pm10: 24.45, no2: 8.05, o3: 21.43, so2: 2.65, co: 5.32 },
];

export const pollutantColors = {
  pm25: '#ef4444',
  pm10: '#f97316',
  no2: '#eab308',
  o3: '#8b5cf6',
  so2: '#06b6d4',
  co: '#6b7280',
};

export const pollutantLabels = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
  so2: 'SO₂',
  co: 'CO',
};
