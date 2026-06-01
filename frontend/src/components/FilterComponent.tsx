import React from 'react';
import { Filter } from 'lucide-react';

interface FilterComponentProps {
  countries: string[];
  cities: { city: string; country: string }[];
  selectedCountry: string | null;
  selectedCity: string | null;
  selectedPollutionType: string;
  selectedDays: number;
  onCountryChange: (country: string | null) => void;
  onCityChange: (city: string | null) => void;
  onPollutionTypeChange: (type: string) => void;
  onDaysChange: (days: number) => void;
  onGenerateStory: () => void;
  loading: boolean;
}

export const FilterComponent: React.FC<FilterComponentProps> = ({
  countries,
  cities,
  selectedCountry,
  selectedCity,
  selectedPollutionType,
  selectedDays,
  onCountryChange,
  onCityChange,
  onPollutionTypeChange,
  onDaysChange,
  onGenerateStory,
  loading,
}) => {
  const filteredCities = selectedCountry
    ? cities.filter(c => c.country === selectedCountry).map(c => c.city)
    : [];

  const pollutionTypes = [
    { value: 'aqi', label: 'Air Quality Index (AQI)' },
    { value: 'pm25', label: 'PM2.5 (Fine Particulate)' },
    { value: 'pm10', label: 'PM10 (Coarse Particulate)' },
    { value: 'o3', label: 'Ozone (O3)' },
    { value: 'no2', label: 'Nitrogen Dioxide (NO2)' },
    { value: 'so2', label: 'Sulfur Dioxide (SO2)' },
    { value: 'co', label: 'Carbon Monoxide (CO)' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <Filter className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">Filter & Generate Story</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Country Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <select
            value={selectedCountry || ''}
            onChange={(e) => onCountryChange(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Countries</option>
            {countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <select
            value={selectedCity || ''}
            onChange={(e) => onCityChange(e.target.value || null)}
            disabled={!selectedCountry}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">All Cities</option>
            {filteredCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        {/* Pollution Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pollution Type</label>
          <select
            value={selectedPollutionType}
            onChange={(e) => onPollutionTypeChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {pollutionTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Days Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Time Period (Days)</label>
          <select
            value={selectedDays}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      <button
        onClick={onGenerateStory}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating Story...' : 'Generate Data Story'}
      </button>
    </div>
  );
};
