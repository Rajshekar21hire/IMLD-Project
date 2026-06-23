"""Story routes for generated stories and theme-based AI storytelling."""
import html
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


def _normalize_story_payload(story, fallback_title, source_sections):
    """Normalize model output into a clean, UI-safe story structure."""
    if not isinstance(story, dict):
        story = {}

    raw_title = story.get('title')
    raw_summary = story.get('summary')
    raw_sections = story.get('sections') if isinstance(story.get('sections'), list) else []

    target_len = len(source_sections) if source_sections else len(raw_sections)
    if target_len == 0:
        target_len = 1

    normalized_sections = []
    for index in range(target_len):
        source = source_sections[index] if index < len(source_sections) and isinstance(source_sections[index], dict) else {}
        raw = raw_sections[index] if index < len(raw_sections) else {}

        if not isinstance(raw, dict):
            raw = {'body': str(raw).strip()} if raw is not None else {}

        title = str(raw.get('title') or source.get('title') or f'Subtopic {index + 1}').strip()
        body = _normalize_section_body(raw.get('body') or source.get('body') or '', index)

        bullets = _coerce_bullets(raw.get('bullets'))
        if not bullets and isinstance(source.get('bullets'), list):
            bullets = [str(item).strip() for item in source.get('bullets') if str(item).strip()]

        normalized_section = {
            'title': title,
            'body': body,
            'bullets': bullets,
        }

        # Preserve optional metadata that the frontend may rely on.
        for key in ('label', 'chart', 'categoryBlocks'):
            if key in raw and raw.get(key) is not None:
                normalized_section[key] = raw.get(key)
            elif key in source and source.get(key) is not None:
                normalized_section[key] = source.get(key)

        normalized_sections.append(normalized_section)

    summary = (str(raw_summary).strip() if raw_summary else '') or ' '.join(
        section['body'] for section in normalized_sections if section['body']
    ).strip()[:280]

    title = (str(raw_title).strip() if raw_title else '') or f'{fallback_title} - AI Story'

    return {
        'title': title,
        'summary': summary,
        'sections': normalized_sections,
    }


def _coerce_bullets(value):
    if isinstance(value, list):
        bullets = []
        for item in value:
            if isinstance(item, dict):
                quote = str(item.get('quote', '')).strip().strip('"').strip('“”')
                name = str(item.get('name') or item.get('person') or item.get('speaker') or '').strip()
                organization = str(item.get('organization', '')).strip()
                narrative = str(item.get('content') or item.get('story') or item.get('body') or '').strip()

                speaker = name
                if speaker and organization:
                    speaker = f'{speaker} ({organization})'

                parts = []
                if quote:
                    parts.append(f'“{quote}”')
                if speaker:
                    if parts:
                        parts[-1] = f'{parts[-1]} - {speaker}.'
                    else:
                        parts.append(f'{speaker}.')
                if narrative:
                    parts.append(narrative)

                text = ' '.join(parts).strip()
            else:
                text = str(item).strip()

            text = _normalize_section_body(text, 0)
            if text and text.lower() not in {'title', 'body', 'footer', 'content'}:
                bullets.append(text)

        return bullets
    return []


def _looks_like_voice_bullet(text):
    cleaned = text.strip().lower()
    if not cleaned:
        return False
    if cleaned in {'title', 'body', 'footer', 'content'}:
        return False
    if cleaned.startswith('<'):
        return False
    if len(cleaned) < 40:
        return False
    if any(token in cleaned for token in ['"title":', '"body":', '"footer":', "'title':", "'body':", "'footer':"]):
        return False
    return True


def _normalize_story_four_subtopic_two(story, source_sections):
    """Guarantee Story 4 Subtopic 2 renders exactly five clean voice stories."""
    if not isinstance(story, dict):
        return story

    sections = story.get('sections')
    if not isinstance(sections, list) or len(sections) < 2:
        return story

    section = sections[1]
    if not isinstance(section, dict):
        return story

    # Keep the original three reference voices from the curated source.
    source_voice_bullets = []
    if len(source_sections) > 1 and isinstance(source_sections[1], dict):
        source_voice_bullets = _coerce_bullets(source_sections[1].get('bullets'))
    canonical_three = [bullet for bullet in source_voice_bullets if _looks_like_voice_bullet(bullet)][:3]

    ai_bullets = [bullet for bullet in _coerce_bullets(section.get('bullets')) if _looks_like_voice_bullet(bullet)]

    seen = set()

    def _signature(value):
        return re.sub(r'\s+', ' ', value.strip().lower())

    merged = []
    for bullet in canonical_three:
        sig = _signature(bullet)
        if sig not in seen:
            seen.add(sig)
            merged.append(bullet)

    for bullet in ai_bullets:
        sig = _signature(bullet)
        if sig in seen:
            continue
        # Avoid repeating the three fixed voices in the "extra" slots.
        if any(name in sig for name in ['rosamund', 'nitisha', 'nomundari']):
            continue
        seen.add(sig)
        merged.append(bullet)
        if len(merged) >= 5:
            break

    filler_voices = [
        '“When pollution alerts rise, our pediatric ward fills first.” - Public health clinician, South Asia. Hospital teams report measurable spikes in child respiratory visits during high PM2.5 episodes and use local AQ alerts to trigger early precautions.',
        '“Community air sensors gave us evidence, not just complaints.” - Citizen air-quality network coordinator. Open neighborhood monitoring helped residents document exposure hot spots and push local authorities for cleaner transport and stricter enforcement.',
    ]
    for filler in filler_voices:
        if len(merged) >= 5:
            break
        sig = _signature(filler)
        if sig not in seen:
            seen.add(sig)
            merged.append(filler)

    section['bullets'] = merged[:5]
    return story


def _normalize_section_body(value, section_index):
    """Unwrap nested JSON/HTML into clean dashboard-ready plain text."""
    text = ''
    if isinstance(value, str):
        text = value.strip()
    elif value is not None:
        text = str(value).strip()

    if not text:
        return ''

    nested = _safe_json_loads(text)
    if nested and isinstance(nested.get('sections'), list):
        nested_sections = nested.get('sections') or []
        nested_section = None
        if section_index < len(nested_sections) and isinstance(nested_sections[section_index], dict):
            nested_section = nested_sections[section_index]
        elif nested_sections and isinstance(nested_sections[0], dict):
            nested_section = nested_sections[0]

        if nested_section:
            nested_body = nested_section.get('body')
            if isinstance(nested_body, str) and nested_body.strip():
                text = nested_body.strip()
            elif isinstance(nested.get('summary'), str) and nested.get('summary').strip():
                text = nested.get('summary').strip()

    # Convert common HTML structures to readable plain text.
    text = re.sub(r'<\s*br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<\s*/\s*(p|div|h[1-6]|blockquote)\s*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<\s*li\s*>', '- ', text, flags=re.IGNORECASE)
    text = re.sub(r'<\s*/\s*li\s*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = text.replace('\r\n', '\n')
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text.strip()

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
        theme_id = str(theme.get('id', '')).strip()
        overview = theme.get('overview', '')
        prompt_focus = theme.get('promptFocus', '')
        sections = theme.get('sections') or []

        section_brief = []
        for section in sections:
            if isinstance(section, dict):
                section_title = str(section.get('title', '')).strip()
                section_body = str(section.get('body', '')).strip()
                if section_title:
                    section_lines = [f"- {section_title}"]
                    if section_body:
                        section_lines.append(f"  Body: {section_body}")

                    bullets = section.get('bullets') or []
                    if bullets:
                        section_lines.append('  Bullets:')
                        for bullet in bullets:
                            section_lines.append(f"    - {str(bullet).strip()}")

                    category_blocks = section.get('categoryBlocks') or []
                    if category_blocks:
                        section_lines.append('  Categories:')
                        for block in category_blocks:
                            if not isinstance(block, dict):
                                continue
                            block_label = str(block.get('label', '')).strip()
                            if block_label:
                                section_lines.append(f"    - {block_label}")
                            cards = block.get('cards') or []
                            for card in cards:
                                if not isinstance(card, dict):
                                    continue
                                card_title = str(card.get('title', '')).strip()
                                card_body = str(card.get('body', '')).strip()
                                card_footer = str(card.get('footer', '')).strip()
                                if card_title:
                                    section_lines.append(f"      * {card_title}")
                                if card_body:
                                    section_lines.append(f"        Body: {card_body}")
                                if card_footer:
                                    section_lines.append(f"        Footer: {card_footer}")

                    section_brief.append('\n'.join(section_lines))

        expected_sections = len(sections)

        story_four_subtopic_two_prompt = ""
        story_four_subtopic_three_prompt = ""
        if theme_id == 'measurement-and-governance':
            story_four_subtopic_two_prompt = """

    Additional direction for Subtopic 2 (Human Element: Voices Behind the Data):
    - Build this section around three featured voices: Rosamund (Ella Roberta Foundation), Nitisha Agrawal (Smokeless Cookstove Foundation), and Nomundari Urantulga (Climate Activist).
            - Return exactly 5 bullet stories for this subtopic: the same 3 featured voices above, plus 2 additional globally documented human stories from public reporting.
            - Keep each bullet as a single plain-text sentence block in this exact style: “Quote” - Name (Organization). Narrative.
            - Do not return JSON objects for bullets and do not return HTML tags in bullets.
    - Write as an interactive card-style narrative: highlighted quote, short story preview, then expanded narrative.
    - For each voice, explicitly include: issue, outcome, affected population, pollutant involved, health consequence, and action taken.
    - Include a mini timeline in prose for each voice: Exposure -> Health Impact -> Personal Response -> Community Action -> Wider Change.
    - Add a short "Why this story matters" link-back to measurable air-quality outcomes and public-health evidence.
    - Close the section with this reflection in your own words: air pollution is measured in particles and gases, but experienced through people.
    - Keep tone modern, emotionally grounded, and data storytelling focused.
    """

            story_four_subtopic_three_prompt = """

Additional direction for Subtopic 3 (Future Outcomes and Pathways to Progress):
- Replace simple bullet listing with an outcome-focused policy narrative using measurable results and implementation pathways.
- Include evidence-backed examples inspired by WHO, UNEP, EEA, World Bank, OECD, and peer-reviewed air-quality studies.
- Cover policy types such as: low-emission zones, congestion pricing, electrified public transport, industrial controls, coal phase-out, renewable expansion, clean cooking, agricultural alternatives, smart AQ monitoring, AI forecasting, carbon pricing, and urban greening.
- Present headline outcomes in card-like language with: metric, short explanation, real-world example, and implementation timeline.
- Include additional impacts where possible: reduced childhood asthma, increased life expectancy, lower healthcare costs, reduced cardiovascular disease, improved productivity, cleaner transport, reduced heat stress, and fewer pollution emergency days.
- Write so the section can support interactive filtering by Health, Economy, Environment, and Technology.
- Add concise expandable case-study style content for: China PM2.5 program, London ULEZ, Shenzhen electric buses, Copenhagen cycling, California regulations, and Singapore emissions management.
- End with a future-facing vision in prose for "What clean air looks like in 2035" touching public health, urban air quality, life expectancy, healthcare savings, and environmental sustainability.
"""

        prompt = f"""
You are writing a creative AI companion story for an air-quality dashboard.
Transform the structured source material into a natural-language story with clear narrative flow, data storytelling, and interactive cues.
Each section should include a short paragraph plus a clear data-driven angle that supports an interactive visualization.
If the source data includes tables, category blocks, or quotes, translate them into readable story sections while keeping the meaning intact.

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
- Return exactly {expected_sections} sections.
- Use a creative data narrating style, not a dry report.
- Include interactive data cues in the paragraph (for example, mention trend lines, toggle lenses, regional comparisons, or inequality breakdowns).
- Keep the paragraph and body text short, clear, and suitable for dashboard display.
- Preserve factual accuracy and use concrete evidence where possible.
- Do not copy the human story wording; use a fresh AI voice.
- Prefer a data storytelling structure that feels visually interactive when rendered in cards or tables.
- No markdown fences. No extra keys.

Theme title: {title}
Theme overview: {overview}
Prompt focus: {prompt_focus}
{story_four_subtopic_two_prompt}
{story_four_subtopic_three_prompt}

Source subtopics:
{chr(10).join(section_brief)}
"""

        response_text, provider_used = chat_provider_service.generate_local_answer(
            prompt,
            model=chat_provider_service.story_ollama_model,
            num_predict=700,
            timeout_seconds=chat_provider_service.story_timeout_seconds,
        )
        parsed = _safe_json_loads(response_text) or _parse_story_from_text(response_text, title, sections)

        parsed = _normalize_story_payload(parsed, title, sections)
        if theme_id == 'measurement-and-governance':
            parsed = _normalize_story_four_subtopic_two(parsed, sections)

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
        parsed = _safe_json_loads(response_text) or _parse_story_from_text(response_text, story_title, sections)

        parsed = _normalize_story_payload(parsed, story_title, sections)
        if str(theme.get('id', '')).strip() == 'measurement-and-governance':
            parsed = _normalize_story_four_subtopic_two(parsed, sections)

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

    parsed = {
        'title': title_match.group(1).strip() if title_match else f'{fallback_title} - AI Story',
        'summary': summary_match.group(1).strip() if summary_match else response_text.strip()[:280],
        'sections': sections,
    }
    return _normalize_story_payload(parsed, fallback_title, source_sections)
