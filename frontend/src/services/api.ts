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
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const dataAPI = {
  getCountries: () => apiClient.get('/data/countries'),
  getCities: (country?: string) => apiClient.get('/data/cities', { params: { country } }),
  getFilteredData: (params: any) => apiClient.get('/data/filter', { params }),
  getStatistics: (params: any) => apiClient.get('/data/statistics', { params }),
  getWorstCities: (params: any) => apiClient.get('/data/worst-cities', { params }),
  analyzeWorstCities: (data: any) => apiClient.post('/data/worst-cities/analyze', data),
  getLiveReadings: (params: any) => apiClient.get('/data/live', { params }),
  addSampleData: () => apiClient.post('/data/sample-data'),
};

export const storyAPI = {
  generateStory: (data: any) => apiClient.post('/stories/generate', data),
  generateThemeStory: (data: any) => storyApiClient.post('/stories/theme-story', data),
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
