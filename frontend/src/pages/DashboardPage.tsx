import React, { useState, useEffect } from 'react';
import { FilterComponent } from '../components/FilterComponent';
import { StoryDisplay } from '../components/StoryDisplay';
import { RatingModal } from '../components/RatingModal';
import { Chart } from '../components/Chart';
import { useFilters } from '../hooks/useFilters';
import { dataAPI, storyAPI, ratingAPI } from '../services/api';
import { AlertCircle, Loader } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const filters = useFilters();
  const [countries, setCountries] = useState<string[]>([]);
  const [cities, setCities] = useState<{ city: string; country: string }[]>([]);
  const [story, setStory] = useState<any>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [addingSampleData, setAddingSampleData] = useState(false);

  // Fetch countries on mount
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const response = await dataAPI.getCountries();
        if (response.data.success) {
          setCountries(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching countries:', err);
      }
    };

    fetchCountries();
  }, []);

  // Fetch cities when country changes
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await dataAPI.getCities(filters.country || undefined);
        if (response.data.success) {
          setCities(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching cities:', err);
      }
    };

    if (filters.country) {
      fetchCities();
    }
  }, [filters.country]);

  const handleGenerateStory = async () => {
    setLoading(true);
    setError('');
    try {
      // First, generate the story
      const storyResponse = await storyAPI.generateStory({
        country: filters.country,
        city: filters.city,
        pollution_type: filters.pollutionType,
        days: filters.days,
      });

      if (storyResponse.data.success) {
        setStory(storyResponse.data.data);

        // Then fetch statistics
        const statsResponse = await dataAPI.getStatistics({
          country: filters.country,
          city: filters.city,
          pollution_type: filters.pollutionType,
          days: filters.days,
        });

        if (statsResponse.data.success) {
          setStatistics(statsResponse.data);
        }
      } else {
        setError('Failed to generate story');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error generating story');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSampleData = async () => {
    setAddingSampleData(true);
    try {
      await dataAPI.addSampleData();
      alert('Sample data added successfully!');
      // Refresh countries list
      const response = await dataAPI.getCountries();
      if (response.data.success) {
        setCountries(response.data.data);
      }
    } catch (err) {
      alert('Error adding sample data');
    } finally {
      setAddingSampleData(false);
    }
  };

  const handleRateStory = async (ratingData: any) => {
    try {
      await ratingAPI.addRating(story.id, ratingData);
      alert('Thank you for your rating!');
      // Refresh story to get updated rating
      const response = await storyAPI.getStory(story.id);
      if (response.data.success) {
        setStory(response.data.data);
      }
    } catch (err) {
      alert('Error submitting rating');
    }
  };

  const formatTrendsForChart = () => {
    if (!statistics?.trends) return [];
    return Object.entries(statistics.trends)
      .map(([date, data]: any) => ({
        name: date.slice(-5), // MM-DD format
        ...data,
      }))
      .slice(-14); // Last 14 days
  };

  const formatAQIDistribution = () => {
    if (!statistics?.aqi_distribution) return [];
    return Object.entries(statistics.aqi_distribution).map(([category, count]: any) => ({
      name: category,
      value: count,
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Air Quality Dashboard</h1>
          <p className="text-gray-600 mt-2">Generate and explore air quality data stories</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Add Sample Data Button */}
        {countries.length === 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">No data available. Add sample data to get started.</p>
            </div>
            <button
              onClick={handleAddSampleData}
              disabled={addingSampleData}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              {addingSampleData ? 'Adding...' : 'Add Sample Data'}
            </button>
          </div>
        )}

        {/* Filter Component */}
        <FilterComponent
          countries={countries}
          cities={cities}
          selectedCountry={filters.country}
          selectedCity={filters.city}
          selectedPollutionType={filters.pollutionType}
          selectedDays={filters.days}
          onCountryChange={filters.setCountry}
          onCityChange={filters.setCity}
          onPollutionTypeChange={filters.setPollutionType}
          onDaysChange={filters.setDays}
          onGenerateStory={handleGenerateStory}
          loading={loading}
        />

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600 mr-3" />
            <p className="text-gray-600">Generating your story...</p>
          </div>
        )}

        {/* Story Section */}
        {story && !loading && (
          <>
            <StoryDisplay
              story={story}
              onRate={() => setShowRatingModal(true)}
              averageRating={story.average_rating}
            />

            {/* Statistics and Charts */}
            {statistics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Chart
                  title="Pollution Trends (Last 14 Days)"
                  data={formatTrendsForChart()}
                  dataKeys={[
                    { key: filters.pollutionType, name: filters.pollutionType.toUpperCase(), color: '#3b82f6' },
                  ]}
                  type="line"
                />

                <Chart
                  title="AQI Category Distribution"
                  data={formatAQIDistribution()}
                  dataKeys={[
                    { key: 'value', name: 'Count', color: '#10b981' },
                  ]}
                  type="bar"
                />
              </div>
            )}

            {/* Rating Modal */}
            {showRatingModal && (
              <RatingModal
                storyId={story.id}
                onSubmit={handleRateStory}
                onClose={() => setShowRatingModal(false)}
              />
            )}
          </>
        )}

        {/* Empty State */}
        {!story && !loading && countries.length > 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">Select filters and click "Generate Data Story" to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};
