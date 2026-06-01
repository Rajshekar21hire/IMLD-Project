from flask import Blueprint, jsonify, request
from app.services.story_service import StoryService

bp = Blueprint('ratings', __name__, url_prefix='/api/ratings')
story_service = StoryService()

@bp.route('/story/<int:story_id>', methods=['POST'])
def add_rating(story_id):
    """Add a rating to a story"""
    try:
        data = request.get_json()
        rating = data.get('rating')
        feedback = data.get('feedback')
        story_quality = data.get('story_quality')
        accuracy = data.get('accuracy')
        clarity = data.get('clarity')
        usefulness = data.get('usefulness')
        user_email = data.get('user_email')
        
        # Validate rating
        if not rating or rating < 1 or rating > 5:
            return jsonify({'success': False, 'error': 'Rating must be between 1 and 5'}), 400
        
        rating_obj, error = story_service.add_rating(
            story_id,
            rating,
            feedback,
            story_quality,
            accuracy,
            clarity,
            usefulness,
            user_email
        )
        
        if error:
            return jsonify({'success': False, 'error': error}), 400
        
        return jsonify({'success': True, 'data': rating_obj.to_dict()}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/story/<int:story_id>', methods=['GET'])
def get_ratings(story_id):
    """Get all ratings for a story"""
    try:
        ratings = story_service.get_story_ratings(story_id)
        ratings_data = [r.to_dict() for r in ratings]
        
        avg_rating = story_service.get_story_average_rating(story_id)
        
        return jsonify({
            'success': True,
            'data': ratings_data,
            'average_rating': avg_rating,
            'count': len(ratings_data)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
