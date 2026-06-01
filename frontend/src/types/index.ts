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
