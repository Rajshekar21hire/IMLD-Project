export interface AirQualityData {
  id: number;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  so2: number;
  co: number;
  aqi: number;
  aqi_category: string;
  measurement_date: string;
  health_impact: string;
}

export interface DataStory {
  id: number;
  title: string;
  content: string;
  summary: string;
  country: string;
  city: string;
  pollution_type: string;
  key_insights: string[];
  recommendations: string[];
  visualizations: any;
  data_points_analyzed: number;
  time_period: string;
  created_at: string;
  average_rating?: number;
}

export interface StoryRating {
  id: number;
  story_id: number;
  rating: number;
  feedback?: string;
  story_quality?: number;
  accuracy?: number;
  clarity?: number;
  usefulness?: number;
  created_at: string;
}

export interface FilterParams {
  country?: string;
  city?: string;
  pollution_type?: string;
  days?: number;
}

export interface PollutionStatistics {
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface WorstCityDriver {
  metric: string;
  value: number;
  normalized: number;
  weight: number;
  contribution: number;
}

export interface WorstCityAnalysis {
  country: string;
  city: string;
  records: number;
  latest_measurement: string | null;
  averages: Record<string, number | null>;
  dominant_aqi_category: string | null;
  score: number;
  drivers: WorstCityDriver[];
}

export interface WorstCitiesResponse {
  title: string;
  summary: string;
  cities: WorstCityAnalysis[];
  count: number;
  filters?: {
    country?: string | null;
    city?: string | null;
    days?: number;
  };
  records_analyzed?: number;
}

export interface WorstCitiesPromptResponse extends WorstCitiesResponse {
  prompt?: string;
  interpretation?: string;
  insights?: string[];
  visualization_notes?: string[];
  query_hint?: string;
  presentation?: {
    recommended_view: 'summary' | 'charts' | 'ranking';
    available_views: Array<'summary' | 'charts' | 'ranking'>;
    prompt_keywords?: string[];
    cards?: Array<{
      label: string;
      value: string;
      detail: string;
    }>;
  };
  chart_data?: Array<{
    name: string;
    score: number;
    aqi: number;
    pm25: number;
    pm10: number;
    no2: number;
  }>;
}
