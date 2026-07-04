import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Wind } from 'lucide-react';
import { FilterProvider } from './hooks/useFilters';
import './styles/App.css';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const RealtimePollutionPage = lazy(() => import('./pages/RealtimePollutionPage').then(m => ({ default: m.RealtimePollutionPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
  </div>
);

function App() {
  return (
    <FilterProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          {/* Navigation */}
          <nav className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                <Wind className="w-8 h-8" />
                <span>AirStory</span>
              </Link>
              <div className="flex gap-6">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Story Studio
                </Link>
                <Link
                  to="/analytics"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  to="/realtime"
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Real-Time
                </Link>
              </div>
            </div>
          </nav>

          {/* Routes */}
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/realtime" element={<RealtimePollutionPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Routes>
          </Suspense>

          {/* Footer */}
          <footer className="bg-slate-600 text-white py-12 mt-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                <div>
                  <h3 className="text-lg font-bold mb-4">AirStory</h3>
                  <p className="text-gray-400">
                    An AI-powered platform for understanding air quality through data-driven storytelling.
                  </p>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                    <li><Link to="/dashboard" className="hover:text-white transition-colors">Story Studio</Link></li>
                    <li><Link to="/analytics" className="hover:text-white transition-colors">Analytics</Link></li>
                    <li><Link to="/realtime" className="hover:text-white transition-colors">Real-Time</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Information</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
                    <li><a href="mailto:support@airstory.local" className="hover:text-white transition-colors">Contact</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-gray-700 pt-8">
                <p className="text-gray-400 text-center">
                  © 2026 AirStory. All rights reserved. | Air Quality Data Storytelling Portal
                </p>
              </div>
            </div>
          </footer>
        </div>
      </Router>
    </FilterProvider>
  );
}

export default App;
