import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const storyApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dataAPI = {
  getCountries: () => apiClient.get('/data/countries'),
  getCities: (country?: string) => apiClient.get('/data/cities', { params: { country } }),
  getFilteredData: (params: any) => apiClient.get('/data/filter', { params }),
  getStatistics: (params: any) => apiClient.get('/data/statistics', { params }),
  generateAnalyticsSummary: (data: any) => storyApiClient.post('/data/summary', data),
  getLiveReadings: (params: any) => apiClient.get('/data/live', { params }),
  addSampleData: () => apiClient.post('/data/sample-data'),
  getYearlyTrends: (params?: any) => apiClient.get('/data/yearly-trends', { params }),
};

export const storyAPI = {
  generateStory: (data: any) => apiClient.post('/stories/generate', data),
  generateThemeStory: (data: any) => storyApiClient.post('/stories/theme-story', data),
  generateCityRankings: (data: any) => storyApiClient.post('/stories/city-rankings', data),
  getCityDetails: (data: any) => storyApiClient.post('/stories/city-details', data),
  generateCityTestimonials: (data: any) => storyApiClient.post('/stories/city-testimonials', data),
  generateDeepDiveNarrative: (data: any) => storyApiClient.post('/stories/deep-dive-narrative', data),
  generateDeepDiveInterventions: (data: any) => storyApiClient.post('/stories/deep-dive-interventions', data),
  generateDeepDiveImpact: (data: any) => storyApiClient.post('/stories/deep-dive-impact', data),
  explainInversionChamber: (data: any) => storyApiClient.post('/stories/inversion-chamber-explain', data),
  agenticBriefing: (data: any) => storyApiClient.post('/stories/agentic-briefing', data),
  agenticAirWords: (data: any) => storyApiClient.post('/stories/agentic-air-words', data),
  agenticHelp: (data: any) => storyApiClient.post('/stories/agentic-help', data),
  agenticGoodDay: (data: any) => storyApiClient.post('/stories/agentic-good-day', data),
  scaleLadderIdentity: (data: any) => storyApiClient.post('/stories/scale-ladder-identity', data),
  scaleLadderRung: (data: any) => storyApiClient.post('/stories/scale-ladder-rung', data),
  agenticDayRibbon: (data: any) => storyApiClient.post('/stories/agentic-day-ribbon', data),
  agenticGoodDayTimeline: (data: any) => storyApiClient.post('/stories/agentic-good-day-timeline', data),
  agenticCloud: (data: any) => storyApiClient.post('/stories/agentic-cloud', data),
  agenticBubbles: (data: any) => storyApiClient.post('/stories/agentic-bubbles', data),
  agenticFactDetail: (data: any) => storyApiClient.post('/stories/agentic-fact-detail', data),
  agenticCaption: (data: any) => storyApiClient.post('/stories/agentic-caption', data),
  agenticExplain: (data: any) => storyApiClient.post('/stories/agentic-explain', data),
  agenticCigaretteStory: (data: any) => storyApiClient.post('/stories/agentic-cigarette-story', data),
  agenticFactorStory: (data: any) => storyApiClient.post('/stories/agentic-factor-story', data),
  agenticSimulationStory: (data: any) => storyApiClient.post('/stories/agentic-simulation-story', data),
  ollamaText: (data: any) => storyApiClient.post('/stories/ollama-text', data),
  getStory: (storyId: number) => apiClient.get(`/stories/${storyId}`),
  listStories: (params: any) => apiClient.get('/stories', { params }),
  getVisualizations: (storyId: number) => apiClient.get(`/stories/${storyId}/visualizations`),
};

export const ratingAPI = {
  addRating: (storyId: number, ratingData: any) =>
    apiClient.post(`/ratings/story/${storyId}`, ratingData),
  getRatings: (storyId: number) => apiClient.get(`/ratings/story/${storyId}`),
};

export default apiClient;
