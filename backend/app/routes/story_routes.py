from flask import Blueprint, jsonify, request
from app.services.story_service import StoryService
from app.models import DataStory

bp = Blueprint('stories', __name__, url_prefix='/api/stories')
story_service = StoryService()

@bp.route('/generate', methods=['POST'])
def generate_story():
    """Generate a new story from air quality data"""
    try:
        data = request.get_json()
        country = data.get('country')
        city = data.get('city')
        pollution_type = data.get('pollution_type', 'aqi')
        days = data.get('days', 30)
        
        story, error = story_service.generate_story(country, city, pollution_type, days)
        
        if error:
            return jsonify({'success': False, 'error': error}), 400
        
        return jsonify({'success': True, 'data': story.to_dict()}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<int:story_id>', methods=['GET'])
def get_story(story_id):
    """Get a specific story"""
    try:
        story = story_service.get_story(story_id)
        
        if not story:
            return jsonify({'success': False, 'error': 'Story not found'}), 404
        
        return jsonify({'success': True, 'data': story.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/', methods=['GET'])
def list_stories():
    """List stories with optional filters"""
    try:
        country = request.args.get('country')
        city = request.args.get('city')
        pollution_type = request.args.get('pollution_type')
        limit = request.args.get('limit', default=10, type=int)
        offset = request.args.get('offset', default=0, type=int)
        
        stories, total = story_service.get_stories(country, city, pollution_type, limit, offset)
        stories_data = [s.to_dict() for s in stories]
        
        return jsonify({
            'success': True,
            'data': stories_data,
            'total': total,
            'limit': limit,
            'offset': offset
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/<int:story_id>/visualizations', methods=['GET'])
def get_story_visualizations(story_id):
    """Get visualization configurations for a story"""
    try:
        story = story_service.get_story(story_id)
        
        if not story:
            return jsonify({'success': False, 'error': 'Story not found'}), 404
        
        visualizations = story.visualizations or {}
        
        return jsonify({'success': True, 'data': visualizations})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
