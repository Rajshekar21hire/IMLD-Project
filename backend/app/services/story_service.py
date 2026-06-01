from app.models import DataStory, AirQualityData
from app.services.data_service import DataService
from app.agents.story_agent import StoryAgent
from app import db
from datetime import datetime

class StoryService:
    """Service for creating and managing data stories"""
    
    def __init__(self):
        self.agent = StoryAgent()
        self.data_service = DataService()
    
    def generate_story(self, country=None, city=None, pollution_type='aqi', days=30):
        """Generate a new story based on air quality data"""
        
        # Fetch data
        data_list = DataService.get_data_by_filters(country, city, pollution_type, days)
        
        if not data_list:
            return None, "No data available for the specified filters"
        
        # Calculate statistics
        statistics = DataService.get_pollution_statistics(data_list, pollution_type)
        trends = DataService.get_temporal_trends(data_list)
        aqi_distribution = DataService.get_aqi_distribution(data_list)
        
        # Generate story using AI agent
        time_period = f"{days} days"
        story_data = self.agent.generate_story(
            data_list,
            country,
            city,
            pollution_type,
            time_period,
            statistics,
            trends,
            aqi_distribution
        )
        
        # Create story record
        story = DataStory(
            title=story_data['title'],
            content=story_data['content'],
            summary=story_data['summary'],
            country=country,
            city=city,
            pollution_type=pollution_type,
            key_insights=story_data['key_insights'],
            recommendations=story_data['recommendations'],
            data_points_analyzed=len(data_list),
            time_period=time_period
        )
        
        db.session.add(story)
        db.session.commit()
        
        return story, None
    
    def get_story(self, story_id):
        """Retrieve a specific story"""
        return DataStory.query.get(story_id)
    
    def get_stories(self, country=None, city=None, pollution_type=None, limit=10, offset=0):
        """Retrieve multiple stories with optional filters"""
        query = DataStory.query
        
        if country:
            query = query.filter_by(country=country)
        if city:
            query = query.filter_by(city=city)
        if pollution_type:
            query = query.filter_by(pollution_type=pollution_type)
        
        total = query.count()
        stories = query.order_by(DataStory.created_at.desc()).limit(limit).offset(offset).all()
        
        return stories, total
    
    def add_rating(self, story_id, rating, feedback=None, story_quality=None, accuracy=None, clarity=None, usefulness=None, user_email=None):
        """Add a rating to a story"""
        from app.models import StoryRating
        
        story = DataStory.query.get(story_id)
        if not story:
            return None, "Story not found"
        
        rating_record = StoryRating(
            story_id=story_id,
            rating=rating,
            feedback=feedback,
            story_quality=story_quality,
            accuracy=accuracy,
            clarity=clarity,
            usefulness=usefulness,
            user_email=user_email
        )
        
        db.session.add(rating_record)
        db.session.commit()
        
        return rating_record, None
    
    def get_story_ratings(self, story_id):
        """Get all ratings for a story"""
        from app.models import StoryRating
        
        return StoryRating.query.filter_by(story_id=story_id).all()
    
    def get_story_average_rating(self, story_id):
        """Get average rating for a story"""
        story = DataStory.query.get(story_id)
        if not story:
            return None
        return story.get_average_rating()
