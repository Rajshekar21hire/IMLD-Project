"""Story routes for generated stories and theme-based AI storytelling."""
import json
import re

from flask import Blueprint, jsonify, request

from app.models import DataStory
from app.services.chat_provider_service import ChatProviderService
from app.services.story_service import StoryService

bp = Blueprint('stories', __name__, url_prefix='/api/stories')
story_service = StoryService()
chat_provider_service = ChatProviderService()


def _safe_json_loads(payload_text):
    """Parse a JSON object from the model response when possible."""
    if not payload_text:
        return None

    text = payload_text.strip()
    if text.startswith('```'):
        text = text.strip('`').strip()
        if text.startswith('json'):
            text = text[4:].strip()

    candidate = _extract_json_candidate(text)
    if candidate is None:
        return None

    for attempt in (
        candidate,
        _repair_json_like_text(candidate),
    ):
        try:
            parsed = json.loads(attempt)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            continue
    return None


def _extract_json_candidate(text):
    """Extract the most likely JSON object from free-form model output."""
    start = text.find('{')
    end = text.rfind('}')
    if start == -1 or end == -1 or end <= start:
        return None
    return text[start:end + 1]


def _repair_json_like_text(text):
    """Heuristically repair common Ollama JSON mistakes."""
    repaired = text
    repaired = re.sub(r'"\s+"', '", "', repaired)
    repaired = re.sub(r'(\]|\})\s+"', r'\1, "', repaired)
    repaired = re.sub(r',\s*,+', ',', repaired)
    repaired = re.sub(r',\s*([}\]])', r'\1', repaired)
    return repaired

@bp.route('/generate', methods=['POST'])
def generate_story():
    """Generate a new story from air quality data"""
    try:
        from datetime import datetime
        data = request.get_json()
        country = data.get('country')
        city = data.get('city')
        pollution_type = data.get('pollution_type', 'aqi')
        days = data.get('days')
        date_range_start = data.get('date_range_start')
        date_range_end = data.get('date_range_end')

        # Parse dates if provided
        if date_range_start:
            date_range_start = datetime.fromisoformat(date_range_start)
        if date_range_end:
            date_range_end = datetime.fromisoformat(date_range_end)

        story, error = story_service.generate_story(country, city, pollution_type, days=days,
                                                    date_range_start=date_range_start,
                                                    date_range_end=date_range_end)

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


@bp.route('/theme-story', methods=['POST'])
def generate_theme_story():
    """Generate a theme-based story using the local Ollama provider."""
    try:
        data = request.get_json() or {}
        theme = data.get('theme') or {}

        title = theme.get('title', 'Untitled theme')
        overview = theme.get('overview', '')
        prompt_focus = theme.get('promptFocus', '')
        sections = theme.get('sections') or []

        section_brief = []
        for section in sections:
            if isinstance(section, dict):
                section_title = str(section.get('title', '')).strip()
                section_body = str(section.get('body', '')).strip()
                if section_title:
                    section_brief.append(f"- {section_title}")

        prompt = f"""
You are writing a free-form but structured air-quality storytelling dashboard entry.
Generate a distinct AI/Olamala story for the same theme and keep the same subtopic structure.
Do not reuse any sentence from the source text verbatim. Rewrite the story in a fresh voice with different examples, transitions, and phrasing.

Return valid JSON only with this exact shape:
{{
  "title": "...",
  "summary": "...",
  "sections": [
    {{
      "title": "...",
      "body": "...",
      "bullets": ["...", "..."]
    }}
  ]
}}

Rules:
- Keep the story grounded in the provided theme.
- Use a different voice from the human story.
- Keep the number of sections aligned with the source subtopics.
- Make each section readable on the dashboard.
- Make the content clearly different from the source while preserving the meaning.
- Keep each section to 2-3 short sentences.
- No markdown fences. No extra keys.

Theme title: {title}
Theme overview: {overview}
Prompt focus: {prompt_focus}

Source subtopics:
{chr(10).join(section_brief)}
"""

        response_text, provider_used = chat_provider_service.generate_local_answer(
            prompt,
            model=chat_provider_service.story_ollama_model,
            num_predict=700,
            timeout_seconds=chat_provider_service.story_timeout_seconds,
        )
        parsed = _safe_json_loads(response_text)

        if not parsed:
            parsed = _parse_story_from_text(response_text, title, sections)

        return jsonify({
            'success': True,
            'data': {
                'provider': provider_used,
                'story': parsed,
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def _parse_story_from_text(response_text, fallback_title, source_sections):
    """Build a structured story from loose model output."""
    title_match = re.search(r'"title"\s*:\s*"([^"]+)"', response_text)
    summary_match = re.search(r'"summary"\s*:\s*"([^"]+)"', response_text)
    section_pattern = re.compile(
        r'\{\s*"title"\s*:\s*"([^"]+)"\s*,\s*"body"\s*:\s*"([^"]*?)"(?:\s*,\s*"bullets"\s*:\s*\[(.*?)\])?\s*\}',
        re.DOTALL,
    )

    sections = []
    for index, match in enumerate(section_pattern.finditer(response_text)):
        section_title = match.group(1).strip()
        section_body = re.sub(r'\s+', ' ', match.group(2)).strip()
        bullets_raw = match.group(3) or ''
        bullets = re.findall(r'"([^"]+)"', bullets_raw)
        sections.append({
            'title': section_title,
            'body': section_body,
            'bullets': bullets,
        })

    if not sections:
        sections = [
            {
                'title': section.get('title', f'Section {index + 1}') if isinstance(section, dict) else f'Section {index + 1}',
                'body': response_text.strip(),
                'bullets': [],
            }
            for index, section in enumerate(source_sections)
        ] or [
            {
                'title': fallback_title,
                'body': response_text.strip(),
                'bullets': [],
            }
        ]

    return {
        'title': title_match.group(1).strip() if title_match else f'{fallback_title} - AI Story',
        'summary': summary_match.group(1).strip() if summary_match else response_text.strip()[:280],
        'sections': sections,
    }
