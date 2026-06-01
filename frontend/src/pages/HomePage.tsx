import React from 'react';
import { Wind, TrendingUp } from 'lucide-react';

export const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Wind className="w-20 h-20 text-blue-100" />
          </div>
          <h1 className="text-5xl font-bold mb-4">Air Quality Storytelling Portal</h1>
          <p className="text-xl text-blue-100 mb-6">
            Discover insights about air pollution through interactive AI-powered narratives
          </p>
          <p className="text-lg text-blue-50">
            Visualize air quality trends, understand pollution impacts, and explore solutions
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Wind className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Real-Time Data</h3>
            <p className="text-gray-600">
              Access comprehensive air quality data from multiple countries and cities with the latest measurements.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">AI-Powered Stories</h3>
            <p className="text-gray-600">
              Our intelligent agent generates compelling narratives about pollution patterns, health impacts, and solutions.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-lg shadow-md p-8 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Wind className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Interactive Controls</h3>
            <p className="text-gray-600">
              Filter by country, city, or pollution type to customize your data stories and visualizations.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Explore?</h2>
          <p className="text-lg text-blue-100 mb-6">
            Navigate to the Dashboard to start generating air quality stories and exploring air quality data.
          </p>
        </div>
      </div>
    </div>
  );
};
