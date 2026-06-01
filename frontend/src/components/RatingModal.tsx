import React, { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';

interface RatingModalProps {
  storyId: number;
  onSubmit: (ratingData: any) => Promise<void>;
  onClose: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ storyId, onSubmit, onClose }) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [storyQuality, setStoryQuality] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [usefulness, setUsefulness] = useState(0);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        rating,
        feedback: feedback || undefined,
        story_quality: storyQuality || undefined,
        accuracy: accuracy || undefined,
        clarity: clarity || undefined,
        usefulness: usefulness || undefined,
        user_email: email || undefined,
      });
      onClose();
    } catch (err) {
      setError('Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const StarRating: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({
    value,
    onChange,
    label,
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-colors"
          >
            <Star
              size={28}
              className={`${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 hover:text-yellow-200'
              } transition-colors`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Rate This Story</h2>

        {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Overall Rating */}
          <StarRating value={rating} onChange={setRating} label="Overall Rating" />

          {/* Detailed Ratings */}
          <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <StarRating value={storyQuality} onChange={setStoryQuality} label="Story Quality" />
            <StarRating value={accuracy} onChange={setAccuracy} label="Accuracy" />
            <StarRating value={clarity} onChange={setClarity} label="Clarity" />
            <StarRating value={usefulness} onChange={setUsefulness} label="Usefulness" />
          </div>

          {/* Feedback */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare size={16} />
              Feedback (Optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts about this story..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
            />
          </div>

          {/* Email */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
