from app import db
from datetime import datetime

class DataStory(db.Model):
    """Model for AI-generated data stories"""
    __tablename__ = 'data_stories'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    content = db.Column(db.Text, nullable=False)  # The AI-generated story
    summary = db.Column(db.Text)  # Brief summary
    
    # Filters applied
    country = db.Column(db.String(100), index=True)
    city = db.Column(db.String(100), index=True)
    pollution_type = db.Column(db.String(50), index=True)  # PM2.5, PM10, O3, NO2, etc.

    # Date range
    date_range_start = db.Column(db.DateTime)  # User-selected start date
    date_range_end = db.Column(db.DateTime)  # User-selected end date

    # Story metadata
    key_insights = db.Column(db.JSON)  # List of key findings
    recommendations = db.Column(db.JSON)  # Solutions and recommendations
    visualizations = db.Column(db.JSON)  # References to visualization configs
    ai_model_used = db.Column(db.String(50), default='rule-based')  # 'claude' or 'rule-based'
    
    # Statistics
    data_points_analyzed = db.Column(db.Integer)
    time_period = db.Column(db.String(100))  # e.g., "Last 30 days"
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    ratings = db.relationship('StoryRating', backref='story', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'summary': self.summary,
            'country': self.country,
            'city': self.city,
            'pollution_type': self.pollution_type,
            'date_range_start': self.date_range_start.isoformat() if self.date_range_start else None,
            'date_range_end': self.date_range_end.isoformat() if self.date_range_end else None,
            'key_insights': self.key_insights,
            'recommendations': self.recommendations,
            'visualizations': self.visualizations,
            'ai_model_used': self.ai_model_used,
            'data_points_analyzed': self.data_points_analyzed,
            'time_period': self.time_period,
            'created_at': self.created_at.isoformat(),
            'average_rating': self.get_average_rating()
        }
    
    def get_average_rating(self):
        if not self.ratings:
            return None
        return sum(r.rating for r in self.ratings) / len(self.ratings)


class StoryRating(db.Model):
    """Model for user ratings and feedback on stories"""
    __tablename__ = 'story_ratings'
    
    id = db.Column(db.Integer, primary_key=True)
    story_id = db.Column(db.Integer, db.ForeignKey('data_stories.id'), nullable=False, index=True)
    
    # Rating
    rating = db.Column(db.Integer, nullable=False)  # 1-5 stars
    
    # Feedback
    feedback = db.Column(db.Text)  # User's comment
    
    # Category ratings (optional detailed feedback)
    story_quality = db.Column(db.Integer)  # 1-5
    accuracy = db.Column(db.Integer)  # 1-5
    clarity = db.Column(db.Integer)  # 1-5
    usefulness = db.Column(db.Integer)  # 1-5
    
    # User info (anonymous if needed)
    user_email = db.Column(db.String(100))  # Optional
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'story_id': self.story_id,
            'rating': self.rating,
            'feedback': self.feedback,
            'story_quality': self.story_quality,
            'accuracy': self.accuracy,
            'clarity': self.clarity,
            'usefulness': self.usefulness,
            'created_at': self.created_at.isoformat()
        }
