"""API routes for chat functionality"""
from flask import Blueprint, jsonify, request
from app.models import DataStory
from app import db
from app.services.chat_provider_service import ChatProviderService

bp = Blueprint('chat', __name__, url_prefix='/api/chat')

# Store conversation history in memory (in production, use database)
conversations = {}

class ChatService:
    """Service for managing chat conversations about stories"""

    def __init__(self):
        self.provider_service = ChatProviderService()
        self.conversations = conversations

    def _format_items(self, items, fallback):
        if not items:
            return fallback

        # Keep prompts compact for local models like Ollama.
        compact_items = []
        for item in items[:3]:
            text = str(item).strip()
            if text:
                compact_items.append(text[:180])

        return "\n".join(f"- {item}" for item in compact_items) or fallback

    def _build_context(self, story, question):
        location_parts = [part for part in [story.city, story.country] if part]
        location_label = ", ".join(location_parts) if location_parts else "the selected region"

        summary = (story.summary or "No summary available.")[:500]
        insights = self._format_items(story.key_insights, "No insights available")
        recommendations = self._format_items(story.recommendations, "No recommendations available")
        story_excerpt = (story.content or "No full story available.")[:1000]

        return f"""You are a helpful assistant answering questions about an air quality story.
Answer directly and concisely in 3-5 bullet points when helpful.
If the story does not contain enough information, say so briefly.

Story:
- Location: {location_label}
- Pollution Type: {story.pollution_type or 'unknown'}
- Time Period: {story.time_period or 'unknown'}
- Generated using: {story.ai_model_used or 'unknown'}

Summary:
{summary}

Key Insights:
{insights}

Recommendations:
{recommendations}

Story Excerpt:
{story_excerpt}

Question: {question}
"""

    def ask_question(self, story_id, question, provider=None, conversation_history=None):
        """Ask an AI provider a question about a story and its data"""

        # Retrieve the story
        story = DataStory.query.get(story_id)
        if not story:
            return None, "Story not found"

        try:
            context = self._build_context(story, question)
            answer, provider_used = self.provider_service.generate_answer(context, provider=provider)

            # Store conversation
            if story_id not in self.conversations:
                self.conversations[story_id] = []

            self.conversations[story_id].append({
                "question": question,
                "answer": answer,
                "provider": provider_used
            })

            return {
                "answer": answer,
                "provider": provider_used,
            }, None

        except Exception as e:
            return None, f"Error generating response: {str(e)}"

    def get_conversation_history(self, story_id):
        """Retrieve conversation history for a story"""
        return self.conversations.get(story_id, [])

    def clear_conversation(self, story_id):
        """Clear conversation history for a story"""
        if story_id in self.conversations:
            del self.conversations[story_id]

# Initialize service
chat_service = ChatService()

@bp.route('/ask', methods=['POST'])
def ask_question():
    """Ask a question about a story"""
    try:
        data = request.get_json()
        story_id = data.get('story_id')
        question = data.get('question')
        provider = data.get('provider')

        if not story_id or not question:
            return jsonify({'success': False, 'error': 'Missing story_id or question'}), 400

        result, error = chat_service.ask_question(story_id, question, provider=provider)

        if error:
            return jsonify({'success': False, 'error': error}), 400

        return jsonify({
            'success': True,
            'data': {
                'question': question,
                'answer': result['answer'],
                'provider': result['provider']
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/history/<int:story_id>', methods=['GET'])
def get_history(story_id):
    """Get conversation history for a story"""
    try:
        history = chat_service.get_conversation_history(story_id)
        return jsonify({
            'success': True,
            'data': {
                'story_id': story_id,
                'conversation': history
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/history/<int:story_id>', methods=['DELETE'])
def clear_history(story_id):
    """Clear conversation history for a story"""
    try:
        chat_service.clear_conversation(story_id)
        return jsonify({
            'success': True,
            'message': 'Conversation history cleared'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/suggestions/<int:story_id>', methods=['GET'])
def get_suggestions(story_id):
    """Get suggested questions based on the story"""
    try:
        story = DataStory.query.get(story_id)
        if not story:
            return jsonify({'success': False, 'error': 'Story not found'}), 404

        city_label = story.city or "this city"

        # Generate contextual questions
        suggestions = [
            f"How does {city_label}'s {story.pollution_type} compare to other cities?",
            f"What are the health risks in {city_label} with current pollution levels?",
            f"What specific actions can {city_label} take to improve air quality?",
            f"How has the trend changed over this period?",
            "Which vulnerable populations are most affected?",
            "What preventive measures should residents take?"
        ]

        return jsonify({
            'success': True,
            'data': {
                'suggestions': suggestions
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
