import React, { useState } from 'react';
import { DataStory } from '../types';
import { Calendar, BookOpen, TrendingUp, Award, MessageCircle } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

interface StoryDisplayProps {
  story: DataStory;
  onRate: () => void;
  averageRating?: number;
}

export const StoryDisplay: React.FC<StoryDisplayProps> = ({ story, onRate, averageRating }) => {
  const [showChat, setShowChat] = useState(false);

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{story.title}</h1>
          <p className="text-gray-600 text-lg">{story.summary}</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Created</span>
            </div>
            <p className="text-sm text-gray-800">{new Date(story.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Data Points</span>
            </div>
            <p className="text-sm text-gray-800">{story.data_points_analyzed}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Time Period</span>
            </div>
            <p className="text-sm text-gray-800">{story.time_period}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-600">Rating</span>
            </div>
            <p className="text-sm text-gray-800">
              {averageRating ? `${averageRating.toFixed(1)} / 5` : 'No ratings'}
            </p>
          </div>
        </div>

        {/* Key Insights */}
        {story.key_insights && story.key_insights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Key Insights</h2>
            <ul className="space-y-2">
              {story.key_insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-600 font-bold mt-1">•</span>
                  <span className="text-gray-700">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main Story Content */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Story</h2>
          <div className="prose prose-lg max-w-none">
            {story.content.split('\n\n').map((paragraph, index) => (
              <div key={index} className="mb-4">
                {paragraph.split('\n').map((line, lineIndex) => {
                  if (line.startsWith('##')) {
                    return <h3 key={lineIndex} className="text-xl font-bold text-gray-800 mt-4 mb-2">{line.replace(/^##\s*/, '')}</h3>;
                  } else if (line.startsWith('###')) {
                    return <h4 key={lineIndex} className="text-lg font-semibold text-gray-800 mt-3 mb-2">{line.replace(/^###\s*/, '')}</h4>;
                  } else if (line.startsWith('-')) {
                    return <p key={lineIndex} className="text-gray-700 ml-4">• {line.replace(/^-\s*/, '')}</p>;
                  } else if (line.startsWith('**')) {
                    return <p key={lineIndex} className="text-gray-700"><strong>{line.replace(/\*\*/g, '')}</strong></p>;
                  } else if (line.trim()) {
                    return <p key={lineIndex} className="text-gray-700">{line}</p>;
                  }
                  return null;
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {story.recommendations && story.recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Solutions & Recommendations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {story.recommendations.map((recommendation, index) => (
                <div key={index} className="p-4 border-l-4 border-green-500 bg-green-50 rounded">
                  <p className="text-gray-700">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setShowChat(true)}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
          >
            <MessageCircle size={20} />
            Ask Questions
          </button>
          <button
            onClick={onRate}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-shadow"
          >
            Rate This Story
          </button>
        </div>
      </div>

      {/* Chat Widget */}
      {showChat && (
        <ChatWidget
          storyId={story.id}
          storyTitle={story.title}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
};
