"""Story routes for generated stories and theme-based AI storytelling."""
import json
import re

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from app.models import DataStory, AirQualityData
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
You are writing a creative AI companion story for an air-quality dashboard.
Each section should include a short paragraph plus a clear data-driven angle that supports an interactive visualization.
For the pollution-and-health theme, make the output feel engaging and exploratory while remaining accurate.

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
- Keep the story aligned with the same subtopic structure.
- Use a creative data narrating style, not a dry report.
- Include interactive data cues in the paragraph (for example, mention trend lines, toggle lenses, regional comparisons, or inequality breakdowns).
- Keep the paragraph and body text short, clear, and suitable for dashboard display.
- Preserve factual accuracy and use concrete evidence where possible.
- Do not copy the human story wording; use a fresh AI voice.
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


@bp.route('/humanize-story', methods=['POST'])
def humanize_story():
    """Transform a data-driven AI story into a more narrative, humanized version."""
    try:
        data = request.get_json() or {}
        story = data.get('story') or {}
        theme = data.get('theme') or {}

        if not story or not theme:
            return jsonify({'success': False, 'error': 'story and theme are required'}), 400

        title = theme.get('title', 'Untitled')
        story_title = story.get('title', title)
        story_summary = story.get('summary', '')
        sections = story.get('sections') or []

        sections_text = '\n'.join(
            f"- {s.get('title', '')}: {s.get('body', '')}"
            for s in sections
            if isinstance(s, dict)
        )

        humanize_prompt = f"""
You are transforming a data-focused analytical story into a more narrative, human-centered version.
Take the factual content below and rewrite it with:
- Natural, conversational language
- Human-centered perspective and context
- Narrative flow and transitions between ideas
- Relatable examples and implications
- Maintained accuracy but enhanced readability

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
- Keep all factual content and metrics intact.
- Use engaging, accessible language.
- Add context that helps readers understand the "why" behind the data.
- Maintain the same section structure.
- Make it feel relevant to human experience and daily life.
- No markdown fences. No extra keys.

Original data-focused content:
Title: {story_title}
Summary: {story_summary}

Sections:
{sections_text}
"""

        response_text, provider_used = chat_provider_service.generate_local_answer(
            humanize_prompt,
            model=chat_provider_service.story_ollama_model,
            num_predict=700,
            timeout_seconds=chat_provider_service.story_timeout_seconds,
        )
        parsed = _safe_json_loads(response_text)

        if not parsed:
            parsed = _parse_story_from_text(response_text, story_title, sections)

        return jsonify({
            'success': True,
            'data': {
                'provider': provider_used,
                'story': parsed,
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/city-rankings', methods=['POST'])
def generate_city_rankings_story():
    """Generate AI-assisted ranking insights for best/worst cities by PM2.5."""
    try:
        payload = request.get_json() or {}
        count = payload.get('count', 5)
        ranking_type = str(payload.get('ranking_type', 'worst')).strip().lower()

        try:
            count = int(count)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'count must be an integer'}), 400

        if count < 1 or count > 25:
            return jsonify({'success': False, 'error': 'count must be between 1 and 25'}), 400

        if ranking_type not in {'best', 'worst', 'both'}:
            return jsonify({'success': False, 'error': "ranking_type must be one of: 'best', 'worst', 'both'"}), 400

        # Aggregate city-level PM2.5 to build ranking baseline.
        city_stats_query = (
            AirQualityData.query.with_entities(
                AirQualityData.country.label('country'),
                AirQualityData.city.label('city'),
                func.avg(AirQualityData.pm25).label('avg_pm25'),
                func.count(AirQualityData.id).label('sample_count'),
            )
            .filter(AirQualityData.pm25.isnot(None))
            .group_by(AirQualityData.country, AirQualityData.city)
        )

        worst_rows = city_stats_query.order_by(func.avg(AirQualityData.pm25).desc()).limit(count).all()
        best_rows = city_stats_query.order_by(func.avg(AirQualityData.pm25).asc()).limit(count).all()

        if not worst_rows and not best_rows:
            return jsonify({'success': False, 'error': 'No PM2.5 records found for ranking.'}), 404

        worst_cities = [
            {
                'rank': index + 1,
                'city': row.city,
                'country': row.country,
                'avg_pm25': round(float(row.avg_pm25), 2),
                'sample_count': int(row.sample_count),
            }
            for index, row in enumerate(worst_rows)
        ]
        best_cities = [
            {
                'rank': index + 1,
                'city': row.city,
                'country': row.country,
                'avg_pm25': round(float(row.avg_pm25), 2),
                'sample_count': int(row.sample_count),
            }
            for index, row in enumerate(best_rows)
        ]

        ai_prompt = f"""
You are AI Agent 1 for an air-quality storytelling dashboard.
Create a short, clear narrative for non-technical users based on city PM2.5 rankings.

User request:
- ranking_type: {ranking_type}
- city_count: {count}

Worst cities by average PM2.5:
{json.dumps(worst_cities, indent=2)}

Best cities by average PM2.5:
{json.dumps(best_cities, indent=2)}

Return valid JSON only with this exact shape:
{{
  "headline": "...",
  "summary": "...",
  "insights": ["...", "...", "..."],
  "recommendations": ["...", "..."]
}}

Rules:
- Mention at least two specific city names from the requested ranking focus.
- Keep summary under 90 words.
- Keep each insight to one sentence.
- No markdown fences and no extra keys.
"""

        provider_used = 'fallback'
        ai_payload = None
        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                ai_prompt,
                model=chat_provider_service.story_ollama_model,
                num_predict=500,
                timeout_seconds=chat_provider_service.story_timeout_seconds,
            )
            ai_payload = _safe_json_loads(response_text)
        except Exception:
            ai_payload = None

        focus_label = 'worst' if ranking_type == 'worst' else 'best' if ranking_type == 'best' else 'worst and best'
        fallback_headline = f"Top {count} {focus_label} cities by average PM2.5"
        fallback_summary = (
            f"AI Agent 1 analyzed city-level average PM2.5 values and ranked the top {count} {focus_label} cities "
            f"using available measurements in the dataset."
        )

        response_payload = {
            'headline': (ai_payload or {}).get('headline') or fallback_headline,
            'summary': (ai_payload or {}).get('summary') or fallback_summary,
            'insights': (ai_payload or {}).get('insights') or [
                'Higher average PM2.5 indicates persistently elevated fine particulate exposure.',
                'Lower average PM2.5 cities can be used as practical reference cases for policy and planning.',
                'Sample count helps interpret confidence in each city ranking result.',
            ],
            'recommendations': (ai_payload or {}).get('recommendations') or [
                'Prioritize interventions in the highest-ranked worst cities first.',
                'Track ranking changes monthly to measure impact of mitigation strategies.',
            ],
            'ranking_type': ranking_type,
            'count': count,
            'provider': provider_used,
            'worst_cities': worst_cities,
            'best_cities': best_cities,
        }

        return jsonify({'success': True, 'data': response_payload}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/city-details', methods=['POST'])
def get_city_details():
    """Return detailed information for a selected city in the ranking list."""
    try:
        payload = request.get_json() or {}
        city = str(payload.get('city', '')).strip()
        country = str(payload.get('country', '')).strip()

        if not city:
            return jsonify({'success': False, 'error': 'city is required'}), 400

        city_query = AirQualityData.query.filter(AirQualityData.city == city)
        if country:
            city_query = city_query.filter(AirQualityData.country == country)

        records = city_query.all()
        if not records:
            return jsonify({'success': False, 'error': 'No records found for selected city'}), 404

        avg_stats = city_query.with_entities(
            func.avg(AirQualityData.aqi).label('aqi_avg'),
            func.avg(AirQualityData.latitude).label('latitude'),
            func.avg(AirQualityData.longitude).label('longitude'),
            func.avg(AirQualityData.pm25).label('pm25'),
            func.avg(AirQualityData.pm10).label('pm10'),
            func.avg(AirQualityData.o3).label('o3'),
            func.avg(AirQualityData.no2).label('no2'),
            func.avg(AirQualityData.so2).label('so2'),
            func.avg(AirQualityData.co).label('co'),
        ).first()

        pollutant_labels = {
            'pm25': 'PM2.5',
            'pm10': 'PM10',
            'o3': 'O3',
            'no2': 'NO2',
            'so2': 'SO2',
            'co': 'CO',
        }

        pollutant_values = {
            'pm25': float(avg_stats.pm25) if avg_stats.pm25 is not None else None,
            'pm10': float(avg_stats.pm10) if avg_stats.pm10 is not None else None,
            'o3': float(avg_stats.o3) if avg_stats.o3 is not None else None,
            'no2': float(avg_stats.no2) if avg_stats.no2 is not None else None,
            'so2': float(avg_stats.so2) if avg_stats.so2 is not None else None,
            'co': float(avg_stats.co) if avg_stats.co is not None else None,
        }

        pollutant_breakdown = [
            {
                'key': key,
                'name': pollutant_labels[key],
                'value': round(value, 2),
            }
            for key, value in pollutant_values.items()
            if value is not None
        ]
        pollutant_breakdown.sort(key=lambda item: item['value'], reverse=True)
        top_pollutants = pollutant_breakdown[:3]

        ai_prompt = f"""
You are AI Agent 1 for an air-quality dashboard.
Given the city pollutant profile, return likely problems and practical precautions.

City: {city}
Country: {country or 'Unknown'}
Average AQI: {round(float(avg_stats.aqi_avg), 2) if avg_stats.aqi_avg is not None else 'Unknown'}
Top pollutants: {json.dumps(top_pollutants, indent=2)}

Return valid JSON only:
{{
    "reasons": ["...", "...", "..."],
  "problems": ["...", "...", "..."],
  "precautions": ["...", "...", "..."]
}}

Rules:
- Keep each item short and action-oriented.
- No markdown fences.
- No extra keys.
"""

        provider_used = 'fallback'
        ai_payload = None
        city_details_timeout_seconds = min(chat_provider_service.story_timeout_seconds, 20)
        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                ai_prompt,
                model=chat_provider_service.story_ollama_model,
                num_predict=400,
                timeout_seconds=city_details_timeout_seconds,
            )
            ai_payload = _safe_json_loads(response_text)
        except Exception:
            ai_payload = None

        fallback_problems, fallback_precautions = _fallback_city_guidance(top_pollutants)
        fallback_reasons = _fallback_city_reasons(city, top_pollutants)

        response_payload = {
            'city': city,
            'country': country or records[0].country,
            'sample_count': len(records),
            'aqi_avg': round(float(avg_stats.aqi_avg), 2) if avg_stats.aqi_avg is not None else None,
            'geo': {
                'latitude': round(float(avg_stats.latitude), 4) if avg_stats.latitude is not None else None,
                'longitude': round(float(avg_stats.longitude), 4) if avg_stats.longitude is not None else None,
            },
            'pollutant_breakdown': pollutant_breakdown,
            'top_pollutants': top_pollutants,
            'reasons': (ai_payload or {}).get('reasons') or fallback_reasons,
            'problems': (ai_payload or {}).get('problems') or fallback_problems,
            'precautions': (ai_payload or {}).get('precautions') or fallback_precautions,
            'provider': provider_used,
        }

        return jsonify({'success': True, 'data': response_payload}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def _fallback_city_guidance(top_pollutants):
    """Fallback problems and precautions when model output is unavailable."""
    if not top_pollutants:
        return (
            [
                'Limited pollutant measurements reduce confidence in risk profiling.',
                'Episodes of poor air quality may still occur without detailed pollutant attribution.',
                'Sensitive groups can still face respiratory discomfort during AQI spikes.',
            ],
            [
                'Monitor local AQI daily and reduce exposure during higher-value periods.',
                'Use indoor ventilation and filtration strategies during poor air episodes.',
                'Protect sensitive groups with reduced outdoor exertion on high-pollution days.',
            ],
        )

    dominant = [item['name'] for item in top_pollutants]
    problems = [
        f"Elevated {dominant[0]} may increase respiratory stress and irritation.",
        'Sustained pollutant exposure can worsen outcomes for children, older adults, and asthma patients.',
        'Higher pollution periods can reduce outdoor activity safety and quality of life.',
    ]
    precautions = [
        'Plan outdoor activities for lower AQI periods and avoid heavy exertion during peaks.',
        'Use masks and indoor air filtration when pollution levels rise.',
        'Support local traffic and emission reduction actions to lower long-term exposure.',
    ]
    return problems, precautions


def _fallback_city_reasons(city_name, top_pollutants):
    """Fallback city-specific reasons for elevated pollution when AI output is unavailable."""
    city_tag = city_name or 'this city'
    dominant_pollutant = top_pollutants[0]['name'] if top_pollutants else 'PM2.5'

    return [
        f"{city_tag} shows persistent {dominant_pollutant} concentration, suggesting continuous local emission pressure.",
        f"Traffic density and fuel combustion likely contribute to day-to-day pollution accumulation in {city_tag}.",
        f"Weather and seasonal conditions can trap pollutants over {city_tag}, increasing multi-day exposure levels.",
    ]


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
