import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StoryDisplay } from './StoryDisplay';
import { DataStory } from '../types';

// Avoid pulling in ChatWidget's axios/network dependencies during unit tests
jest.mock('./ChatWidget', () => ({
  ChatWidget: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="chat-widget">
      <button onClick={onClose}>Close Chat</button>
    </div>
  ),
}));

const mockStory: DataStory = {
  id: 1,
  title: 'Air Quality Report: Delhi',
  content:
    'Delhi experienced high pollution levels.\n\n## Key Findings\n- PM2.5 was elevated\n\nFurther analysis shows worsening trends.',
  summary: 'High pollution recorded in Delhi over the past 30 days.',
  country: 'India',
  city: 'Delhi',
  pollution_type: 'pm25',
  key_insights: ['Pollution peaked in January', 'PM2.5 exceeded safe limits'],
  recommendations: ['Reduce vehicle emissions', 'Plant more trees'],
  visualizations: null,
  data_points_analyzed: 150,
  time_period: '30 days',
  created_at: '2026-01-15T10:00:00',
  average_rating: undefined,
};

describe('StoryDisplay', () => {
  const onRate = jest.fn();
  beforeEach(() => jest.clearAllMocks());

  it('renders the story title', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(screen.getByText('Air Quality Report: Delhi')).toBeInTheDocument();
  });

  it('renders the story summary', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(
      screen.getByText('High pollution recorded in Delhi over the past 30 days.')
    ).toBeInTheDocument();
  });

  it('renders all key insights', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(screen.getByText('Pollution peaked in January')).toBeInTheDocument();
    expect(screen.getByText('PM2.5 exceeded safe limits')).toBeInTheDocument();
  });

  it('renders all recommendations', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(screen.getByText('Reduce vehicle emissions')).toBeInTheDocument();
    expect(screen.getByText('Plant more trees')).toBeInTheDocument();
  });

  it('shows "No ratings" when averageRating is not provided', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(screen.getByText('No ratings')).toBeInTheDocument();
  });

  it('formats and shows average rating when provided', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} averageRating={4.3} />);
    expect(screen.getByText('4.3 / 5')).toBeInTheDocument();
  });

  it('shows the data points count', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('shows the time period', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(screen.getByText('30 days')).toBeInTheDocument();
  });

  it('calls onRate when the "Rate This Story" button is clicked', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    fireEvent.click(screen.getByRole('button', { name: /rate this story/i }));
    expect(onRate).toHaveBeenCalledTimes(1);
  });

  it('opens ChatWidget when "Ask Questions" is clicked', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    expect(screen.queryByTestId('chat-widget')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ask questions/i }));
    expect(screen.getByTestId('chat-widget')).toBeInTheDocument();
  });

  it('closes ChatWidget when the close handler is called', () => {
    render(<StoryDisplay story={mockStory} onRate={onRate} />);
    fireEvent.click(screen.getByRole('button', { name: /ask questions/i }));
    fireEvent.click(screen.getByText('Close Chat'));
    expect(screen.queryByTestId('chat-widget')).not.toBeInTheDocument();
  });

  it('does not render Key Insights section when list is empty', () => {
    const story = { ...mockStory, key_insights: [] };
    render(<StoryDisplay story={story} onRate={onRate} />);
    expect(screen.queryByText('Key Insights')).not.toBeInTheDocument();
  });

  it('does not render Recommendations section when list is empty', () => {
    const story = { ...mockStory, recommendations: [] };
    render(<StoryDisplay story={story} onRate={onRate} />);
    expect(screen.queryByText('Solutions & Recommendations')).not.toBeInTheDocument();
  });
});
