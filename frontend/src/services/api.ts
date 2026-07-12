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
  timeout: 390000,
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
