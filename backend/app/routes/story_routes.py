"""Story routes for generated stories and theme-based AI storytelling."""
import json
import re
from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import func

from app import db
from app.models import DataStory, AirQualityData, CachedNarrative
from app.services.chat_provider_service import ChatProviderService
from app.services.story_service import StoryService

bp = Blueprint('stories', __name__, url_prefix='/api/stories')
story_service = StoryService()
chat_provider_service = ChatProviderService()


def _get_cached_narrative(cache_key):
    """Return a previously generated narrative payload, or None on a miss."""
    cached = CachedNarrative.query.filter_by(cache_key=cache_key).first()
    return (cached.payload, cached.provider) if cached else (None, None)


def _set_cached_narrative(cache_key, payload, provider):
    """Persist a generated narrative so future requests for the same
    parameters skip the Ollama call. Only call this with a real AI-generated
    payload - never cache fallback text, or it would stick after Ollama comes
    back up."""
    cached = CachedNarrative.query.filter_by(cache_key=cache_key).first()
    if cached:
        cached.payload = payload
        cached.provider = provider
        cached.created_at = datetime.utcnow()
    else:
        db.session.add(CachedNarrative(cache_key=cache_key, payload=payload, provider=provider))
    db.session.commit()


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


def _build_theme_story_fallback(title, overview, prompt_focus, source_sections):
    """Create a deterministic companion story when local AI generation is unavailable."""
    fallback_sections = []

    for index, section in enumerate(source_sections, start=1):
        if isinstance(section, dict):
            section_title = str(section.get('title', '')).strip() or f'Section {index}'
            section_body = str(section.get('body', '')).strip()
            bullets = section.get('bullets') or []

            body_parts = []
            if section_body:
                body_parts.append(section_body)
            if bullets:
                body_parts.append(
                    'Key interactive cues: ' + '; '.join(str(bullet).strip() for bullet in bullets if str(bullet).strip())
                )

            fallback_sections.append(
                {
                    'title': section_title,
                    'body': ' '.join(body_parts).strip() or f'An AI companion view for {section_title.lower()}.',
                    'bullets': [str(bullet).strip() for bullet in bullets if str(bullet).strip()],
                }
            )
        else:
            fallback_sections.append(
                {
                    'title': f'Section {index}',
                    'body': 'An AI companion view for this section is not available yet.',
                    'bullets': [],
                }
            )

    if not fallback_sections:
        fallback_sections = [
            {
                'title': title,
                'body': overview or prompt_focus or 'An AI companion story is not available yet.',
                'bullets': [],
            }
        ]

    summary_bits = [
        f'AI companion story for {title}',
        'reframed into an interactive dashboard voice',
    ]
    if prompt_focus:
        summary_bits.append(prompt_focus.strip())

    return {
        'title': f'{title} - AI Story',
        'summary': '. '.join(bit for bit in summary_bits if bit),
        'sections': fallback_sections,
    }

@bp.route('/generate', methods=['POST'])
def generate_story():
    """Generate a new story from air quality data"""
    try:
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

        provider_used = 'fallback'
        parsed = None
        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                prompt,
                model=chat_provider_service.story_ollama_model,
                num_predict=700,
                timeout_seconds=chat_provider_service.story_timeout_seconds,
            )
            parsed = _safe_json_loads(response_text)

            if not parsed:
                parsed = _parse_story_from_text(response_text, title, sections)
        except Exception:
            parsed = None

        if not parsed:
            parsed = _build_theme_story_fallback(title, overview, prompt_focus, sections)

        return jsonify({
            'success': True,
            'data': {
                'provider': provider_used,
                'story': parsed,
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/deep-dive-narrative', methods=['POST'])
def generate_deep_dive_narrative():
    """Generate AI-narrated framing text for the Deep Dives section.

    The factual backbone (city pollution-source table, proven interventions, impact
    numbers) is never regenerated here - only the connective narrative text is, so the
    model cannot hallucinate new statistics. Tone differs between 'ai' (analytical) and
    'agentic' (warm, emotionally intelligent) modes.
    """
    try:
        data = request.get_json() or {}
        mode = str(data.get('mode', 'ai')).strip().lower()
        if mode not in ('ai', 'agentic'):
            mode = 'ai'

        cache_key = f'deep_dive_narrative:{mode}'
        cached_payload, cached_provider = _get_cached_narrative(cache_key)
        if cached_payload:
            return jsonify({
                'success': True,
                'data': {
                    'provider': cached_provider,
                    'mode': mode,
                    'narrative': cached_payload,
                }
            }), 200

        tone_instruction = (
            "Write in a clear, analytical data-storytelling voice aimed at a general dashboard audience."
            if mode == 'ai' else
            "Write with emotional intelligence: warm, hopeful, human-centered and positive in tone, as if "
            "speaking to someone who cares about the people affected - while staying strictly grounded in "
            "the facts below. Do not invent new statistics or claims."
        )

        prompt = f"""
You are writing framing narration for an air-quality storytelling dashboard about five of the world's
most polluted cities (Lahore, Delhi, New Delhi, Dhaka, Ghaziabad).

Established facts you must stay grounded in (do not invent new numbers or claims):
- The five cities share a structural cluster of causes: fossil-fuel transport, coal-fired brick kilns, and unregulated industrial emissions.
- Flat basin geography causes winter temperature inversions that trap pollutants and turn ordinary emissions into hazardous seasonal spikes.
- Overlapping jurisdictions across states and countries mean no single authority owns the airshed, undermining enforcement.
- Proven interventions exist across Personal, Household, Policy, and Community categories (electric vehicles, clean cookstoves, industrial emission standards, low-emission zones, etc).
- If these interventions were adopted globally: 3.7 million lives could be saved per year, visible city-level change is possible within 5 years, indoor PM2.5 can drop 90% immediately with clean cookstoves, and 48-hour advance pollution warnings are now technically possible.

{tone_instruction}

Return valid JSON only with this exact shape:
{{
  "intro": ["paragraph 1", "paragraph 2"],
  "pattern_cards": [
    {{"eyebrow": "...", "title": "...", "body": "..."}},
    {{"eyebrow": "...", "title": "...", "body": "..."}},
    {{"eyebrow": "...", "title": "...", "body": "..."}}
  ],
  "intervention_intro": "...",
  "impact_intro": "..."
}}

Rules:
- "intro" reframes why these five cities are the worst-affected (2 short paragraphs).
- "pattern_cards" mirrors three angles in this order: the shared structural cluster of causes, the geography that amplifies it, and the governance gap that undermines fixes.
- "intervention_intro" is 1-2 sentences framing that proven fixes exist across personal, household, policy, and community action.
- "impact_intro" is 1 sentence framing what would happen if these interventions were adopted everywhere.
- No markdown fences. No extra keys. Keep each field concise (2-3 sentences max).
"""

        provider_used = None
        parsed = None
        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                prompt,
                model=chat_provider_service.story_ollama_model,
                num_predict=900,
                timeout_seconds=chat_provider_service.story_timeout_seconds,
            )
            parsed = _safe_json_loads(response_text)
        except Exception:
            parsed = None

        if not parsed or not isinstance(parsed.get('pattern_cards'), list) or len(parsed.get('pattern_cards')) == 0:
            return jsonify({
                'success': False,
                'error': 'The Ollama service did not return a usable narrative. Make sure Ollama is running and try again.',
            }), 502

        _set_cached_narrative(cache_key, parsed, provider_used)

        return jsonify({
            'success': True,
            'data': {
                'provider': provider_used,
                'mode': mode,
                'narrative': parsed,
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Fixed facts for the "Our duty" intervention tiles and the "If this happened
# everywhere" impact stats (mirrors the human-authored data in
# frontend/src/pages/DashboardPage.tsx). Only this factual core is given to the
# model - it may only rewrite phrasing/tone, never the numbers.
DEEP_DIVE_INTERVENTION_FACTS = [
    {'id': 'personal-ev', 'category': 'Personal', 'title': 'Switch to an electric or hybrid vehicle',
     'facts': 'NO2 cut 60-100% per vehicle. Road transport is the largest single contributor to urban NO2; switching from petrol removes tailpipe PM2.5 entirely.'},
    {'id': 'personal-bike', 'category': 'Personal', 'title': 'Choose cycling or walking for short trips',
     'facts': 'Zero tailpipe emissions per trip. Every trip shifted from car to bike removes a vehicle from the road and cuts time spent in high-traffic exposure zones.'},
    {'id': 'household-induction', 'category': 'Household', 'title': 'Replace gas cooking with induction',
     'facts': 'Indoor NO2 cut up to 40%. Gas hobs release NO2 and PM2.5 directly into the kitchen; induction is zero emission at point of use.'},
    {'id': 'household-flame', 'category': 'Household', 'title': 'Stop burning wood or waste indoors',
     'facts': 'Indoor PM2.5 cut 50-90%. Open fires and wood stoves are a major source of indoor PM2.5.'},
    {'id': 'household-purifier', 'category': 'Household', 'title': 'Use a HEPA air purifier indoors',
     'facts': 'Indoor PM2.5 cut 70-90% overnight. A HEPA purifier in a bedroom lowers overnight PM2.5 exposure during the 8+ hours people sleep.'},
    {'id': 'household-solar', 'category': 'Household', 'title': 'Switch to solar or renewable electricity',
     'facts': 'SO2 and PM demand eliminated. Coal power remains a leading global source of SO2; shifting demand to renewables reduces pressure on the dirtiest generation.'},
    {'id': 'policy-factory', 'category': 'Policy', 'title': 'Industrial emission standards with enforcement',
     'facts': 'PM2.5 cut 35% in China over 5 years (2014-2019) via mandatory scrubbers, fuel switching, and real-time stack monitoring with penalties.'},
    {'id': 'policy-bus', 'category': 'Policy', 'title': 'Electrify urban bus fleets',
     'facts': 'PM2.5 cut 48% in corridors. Shenzhen deployed about 16,000 electric buses and reduced bus-linked PM2.5 in major travel corridors by 48%.'},
    {'id': 'policy-field', 'category': 'Policy', 'title': 'End agricultural burning, with alternatives',
     'facts': 'Delhi winter AQI down ~30% potential. Seasonal stubble burning in Punjab and Haryana drives severe winter events; subsidised mechanical harvesters and no-burn payments work better than bans alone.'},
    {'id': 'community-tree', 'category': 'Community', 'title': 'Plant trees on busy streets',
     'facts': 'PM2.5 cut 15-25% on tree-lined streets. Street trees absorb NO2 through leaf stomata and trap particulates on canopy surfaces.'},
    {'id': 'community-zone', 'category': 'Community', 'title': 'Advocate for a low emission zone in your city',
     'facts': 'NO2 cut 30-50% in zone. London ULEZ lowered roadside NO2 by 44% and helped reduce childhood asthma hospitalisations; 320+ low-emission zones now operate across Europe.'},
    {'id': 'community-monitor', 'category': 'Community', 'title': 'Demand real-time AQI monitoring and data',
     'facts': 'Foundation for all other action. Cities cannot manage what they do not measure; public monitoring and transparent data make interventions enforceable.'},
]

DEEP_DIVE_IMPACT_FACTS = [
    {'id': 'lives', 'value': '3.7M', 'label': 'lives saved per year',
     'facts': 'Meeting WHO 2030 clean air targets could remove most population-level pollution deaths; South Asia could gain around 5 additional years of life expectancy in the highest-burden regions.'},
    {'id': 'years', 'value': '5 yrs', 'label': 'to see visible change',
     'facts': "China cut PM2.5 by 35% within five years through industrial regulation and enforcement; London's ULEZ also produced major roadside NO2 cuts in a similarly short time frame."},
    {'id': 'indoor', 'value': '90%', 'label': 'less indoor PM2.5, immediately',
     'facts': 'Moving from wood fire to clean cookstoves can lower indoor PM2.5 by more than 90% from day one; children in clean-cooking households report far fewer respiratory infections.'},
    {'id': 'warning', 'value': '48 hrs', 'label': 'of advance warning now possible',
     'facts': 'Machine learning systems now forecast city-level AQI up to 72 hours ahead with over 90% accuracy, enabling schools and health systems to act before hazardous episodes peak.'},
]


def _deep_dive_tone_instruction(mode):
    return (
        "Write in a clear, analytical, evidence-first tone for a general dashboard audience."
        if mode == 'ai' else
        "Write with a warm, positive, encouraging, human-centered tone, as if speaking to someone "
        "who wants to take action - while staying strictly grounded in the facts given. Keep it "
        "hopeful, not preachy."
    )


@bp.route('/deep-dive-interventions', methods=['POST'])
def generate_deep_dive_interventions():
    """Rewrite the stat/detail text for the 12 'Our duty' intervention tiles.

    Numbers and named examples are fixed facts fed to the model - only the
    phrasing is AI-generated, and tone differs between 'ai' and 'agentic' modes.
    """
    try:
        data = request.get_json() or {}
        mode = str(data.get('mode', 'ai')).strip().lower()
        if mode not in ('ai', 'agentic'):
            mode = 'ai'

        cache_key = f'deep_dive_interventions:{mode}'
        cached_payload, cached_provider = _get_cached_narrative(cache_key)
        if cached_payload:
            return jsonify({
                'success': True,
                'data': {'provider': cached_provider, 'mode': mode, 'interventions': cached_payload},
            }), 200

        prompt = f"""
You are rewriting explanatory text for 12 proven air-quality interventions on a
storytelling dashboard, grouped into four categories: Personal, Household, Policy, Community.

Do not invent or change any numbers, percentages, or named examples (e.g. China,
Shenzhen, London ULEZ) - reuse only the facts given below for each intervention.
Only rewrite the phrasing, tone, and framing.

{_deep_dive_tone_instruction(mode)}

Interventions (id, category, title, established facts to stay grounded in):
{json.dumps(DEEP_DIVE_INTERVENTION_FACTS, indent=2)}

Return valid JSON only with this exact shape:
{{
  "interventions": [
    {{"id": "personal-ev", "stat": "...", "detail": "..."}}
  ]
}}

Rules:
- "stat" is a short punchy line (under 8 words), reusing the given number/percentage exactly.
- "detail" is 1-2 sentences of evidence-grounded explanation, in the required tone.
- Return exactly these 12 ids, same order: {', '.join(item['id'] for item in DEEP_DIVE_INTERVENTION_FACTS)}.
- No markdown fences, no extra keys.
"""

        provider_used = None
        parsed = None
        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                prompt,
                model=chat_provider_service.story_ollama_model,
                num_predict=900,
                timeout_seconds=chat_provider_service.story_timeout_seconds,
            )
            parsed = _safe_json_loads(response_text)
        except Exception:
            parsed = None

        interventions = _validate_deep_dive_items(
            (parsed or {}).get('interventions'),
            {item['id'] for item in DEEP_DIVE_INTERVENTION_FACTS},
            ('stat', 'detail'),
        )

        if not interventions:
            return jsonify({
                'success': False,
                'error': 'The Ollama service did not return usable intervention text. Make sure Ollama is running and try again.',
            }), 502

        _set_cached_narrative(cache_key, interventions, provider_used)

        return jsonify({
            'success': True,
            'data': {'provider': provider_used, 'mode': mode, 'interventions': interventions},
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/deep-dive-impact', methods=['POST'])
def generate_deep_dive_impact():
    """Rewrite the detail text for the 4 'If this happened everywhere' impact stats.

    Values and labels are fixed facts fed to the model - only the explanation
    sentence is AI-generated, and tone differs between 'ai' and 'agentic' modes.
    """
    try:
        data = request.get_json() or {}
        mode = str(data.get('mode', 'ai')).strip().lower()
        if mode not in ('ai', 'agentic'):
            mode = 'ai'

        cache_key = f'deep_dive_impact:{mode}'
        cached_payload, cached_provider = _get_cached_narrative(cache_key)
        if cached_payload:
            return jsonify({
                'success': True,
                'data': {'provider': cached_provider, 'mode': mode, 'impact_stats': cached_payload},
            }), 200

        prompt = f"""
You are rewriting the explanatory text for 4 headline statistics on an air-quality
storytelling dashboard, showing what would happen if proven interventions were adopted globally.

Do not invent or change the number or label for any statistic - reuse the facts given
below exactly. Only rewrite the explanation sentence.

{_deep_dive_tone_instruction(mode)}

Statistics (id, value, label, established facts to stay grounded in):
{json.dumps(DEEP_DIVE_IMPACT_FACTS, indent=2)}

Return valid JSON only with this exact shape:
{{
  "impact_stats": [
    {{"id": "lives", "detail": "..."}}
  ]
}}

Rules:
- "detail" is 1-2 sentences, in the required tone, reusing the given facts.
- Return exactly these 4 ids: {', '.join(item['id'] for item in DEEP_DIVE_IMPACT_FACTS)}.
- No markdown fences, no extra keys.
"""

        provider_used = None
        parsed = None
        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                prompt,
                model=chat_provider_service.story_ollama_model,
                num_predict=500,
                timeout_seconds=chat_provider_service.story_timeout_seconds,
            )
            parsed = _safe_json_loads(response_text)
        except Exception:
            parsed = None

        impact_stats = _validate_deep_dive_items(
            (parsed or {}).get('impact_stats'),
            {item['id'] for item in DEEP_DIVE_IMPACT_FACTS},
            ('detail',),
        )

        if not impact_stats:
            return jsonify({
                'success': False,
                'error': 'The Ollama service did not return usable impact text. Make sure Ollama is running and try again.',
            }), 502

        _set_cached_narrative(cache_key, impact_stats, provider_used)

        return jsonify({
            'success': True,
            'data': {'provider': provider_used, 'mode': mode, 'impact_stats': impact_stats},
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def _validate_deep_dive_items(items, required_ids, required_text_fields):
    """Return items only if every required id is present with non-empty text fields."""
    if not isinstance(items, list):
        return None

    by_id = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        item_id = item.get('id')
        if item_id not in required_ids:
            continue
        if not all(isinstance(item.get(field), str) and item.get(field).strip() for field in required_text_fields):
            continue
        by_id[item_id] = {
            'id': item_id,
            **{field: item[field].strip() for field in required_text_fields},
        }

    if set(by_id.keys()) != required_ids:
        return None

    return list(by_id.values())


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
        mode = str(payload.get('mode', 'ai')).strip().lower()
        if mode not in ('ai', 'agentic'):
            mode = 'ai'

        try:
            count = int(count)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'count must be an integer'}), 400

        if count < 1 or count > 10:
            return jsonify({'success': False, 'error': 'count must be between 1 and 10'}), 400

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

        cache_key = f'city_rankings:{ranking_type}:{count}:{mode}'
        cached_payload, cached_provider = _get_cached_narrative(cache_key)

        if cached_payload:
            ai_payload = cached_payload
            provider_used = cached_provider
        else:
            tone_instruction = (
                "Write in a clear, analytical data-storytelling voice aimed at a general dashboard audience."
                if mode == 'ai' else
                "Write with a warm, positive, human-centered tone, as if speaking to someone who cares about "
                "the people affected by these numbers. Use humanized, encouraging language rather than dry "
                "statistics-speak, while staying strictly grounded in the ranking rows below - do not invent "
                "new numbers or claims."
            )

            ai_prompt = f"""
You are AI Agent 1 for an air-quality storytelling dashboard.
Create a short, clear narrative for non-technical users based on city PM2.5 rankings.
    Use only the ranking rows provided below. Do not use outside knowledge, external databases, or facts not present in the data.
    Keep the output structure aligned with the human version: headline, summary, insights, and recommendations.

{tone_instruction}

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

            if ai_payload:
                _set_cached_narrative(cache_key, ai_payload, provider_used)

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
            'mode': mode,
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

        global_stats = AirQualityData.query.with_entities(
            func.avg(AirQualityData.aqi).label('aqi_avg'),
            func.avg(AirQualityData.pm25).label('pm25'),
            func.avg(AirQualityData.pm10).label('pm10'),
            func.avg(AirQualityData.o3).label('o3'),
            func.avg(AirQualityData.no2).label('no2'),
            func.avg(AirQualityData.so2).label('so2'),
            func.avg(AirQualityData.co).label('co'),
        ).first()

        city_aqi_avg = float(avg_stats.aqi_avg) if avg_stats.aqi_avg is not None else None
        global_aqi_avg = float(global_stats.aqi_avg) if global_stats and global_stats.aqi_avg is not None else None
        global_pollutant_values = {
            'pm25': float(global_stats.pm25) if global_stats and global_stats.pm25 is not None else None,
            'pm10': float(global_stats.pm10) if global_stats and global_stats.pm10 is not None else None,
            'o3': float(global_stats.o3) if global_stats and global_stats.o3 is not None else None,
            'no2': float(global_stats.no2) if global_stats and global_stats.no2 is not None else None,
            'so2': float(global_stats.so2) if global_stats and global_stats.so2 is not None else None,
            'co': float(global_stats.co) if global_stats and global_stats.co is not None else None,
        }

        city_vs_global = []
        for key in ('pm25', 'pm10', 'o3', 'no2', 'so2', 'co'):
            city_value = pollutant_values.get(key)
            global_value = global_pollutant_values.get(key)
            if city_value is None or global_value is None or global_value == 0:
                continue
            ratio = city_value / global_value
            city_vs_global.append(
                {
                    'key': key,
                    'name': pollutant_labels[key],
                    'city_value': round(city_value, 2),
                    'global_value': round(global_value, 2),
                    'ratio': round(ratio, 2),
                }
            )
        city_vs_global.sort(key=lambda item: item['ratio'], reverse=True)
        strongest_deviations = city_vs_global[:3]
        source_signals = _derive_city_source_signals(strongest_deviations)

        ai_prompt = f"""
You are AI Agent 1 for an air-quality dashboard.
Given the city pollutant profile, return city-specific reasons, problems, and practical precautions.
    Use only the data and derived signals provided below. Do not use outside knowledge, external databases, or unsupported assumptions.

City: {city}
Country: {country or 'Unknown'}
Sample count: {len(records)}
Average AQI (city): {round(city_aqi_avg, 2) if city_aqi_avg is not None else 'Unknown'}
Average AQI (global baseline): {round(global_aqi_avg, 2) if global_aqi_avg is not None else 'Unknown'}
Top pollutants: {json.dumps(top_pollutants, indent=2)}
Strongest city-vs-global pollutant deviations: {json.dumps(strongest_deviations, indent=2)}
Likely source signals inferred from measured pollutants: {json.dumps(source_signals, indent=2)}

Return valid JSON only:
{{
    "reasons": ["...", "...", "..."],
  "problems": ["...", "...", "..."],
  "precautions": ["...", "...", "..."]
}}

Rules:
- Every item must explicitly reference {city} and include at least one concrete metric from the input where relevant.
- In reasons, explicitly connect pollutant evidence to likely sources such as traffic, industry/power generation, construction/road dust, or combustion where supported by the signals.
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

        fallback_problems, fallback_precautions = _fallback_city_guidance(
            city,
            city_aqi_avg,
            top_pollutants,
            global_pollutant_values,
        )
        fallback_reasons = _fallback_city_reasons(
            city,
            country or records[0].country,
            city_aqi_avg,
            global_aqi_avg,
            top_pollutants,
            len(records),
            strongest_deviations,
            source_signals,
        )

        response_payload = {
            'city': city,
            'country': country or records[0].country,
            'sample_count': len(records),
            'aqi_avg': round(city_aqi_avg, 2) if city_aqi_avg is not None else None,
            'geo': {
                'latitude': round(float(avg_stats.latitude), 4) if avg_stats.latitude is not None else None,
                'longitude': round(float(avg_stats.longitude), 4) if avg_stats.longitude is not None else None,
            },
            'pollutant_breakdown': pollutant_breakdown,
            'top_pollutants': top_pollutants,
            'reasons': _prefer_city_specific_items((ai_payload or {}).get('reasons'), fallback_reasons, city),
            'problems': _prefer_city_specific_items((ai_payload or {}).get('problems'), fallback_problems, city),
            'precautions': _prefer_city_specific_items((ai_payload or {}).get('precautions'), fallback_precautions, city),
            'provider': provider_used,
        }

        return jsonify({'success': True, 'data': response_payload}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/city-testimonials', methods=['POST'])
def generate_city_testimonials():
    """Generate city-linked testimonial cards for Story 3 from ranking cities."""
    try:
        payload = request.get_json() or {}
        cities = payload.get('cities') or []

        if not isinstance(cities, list) or not cities:
            return jsonify({'success': False, 'error': 'cities is required and must be a non-empty list'}), 400

        normalized_cities = []
        for city in cities[:6]:
            if not isinstance(city, dict):
                continue
            city_name = str(city.get('city', '')).strip()
            country = str(city.get('country', '')).strip()
            avg_pm25 = city.get('avg_pm25')
            sample_count = city.get('sample_count')
            if not city_name:
                continue
            try:
                avg_pm25_value = float(avg_pm25) if avg_pm25 is not None else None
            except (TypeError, ValueError):
                avg_pm25_value = None
            try:
                sample_count_value = int(sample_count) if sample_count is not None else None
            except (TypeError, ValueError):
                sample_count_value = None

            normalized_cities.append(
                {
                    'city': city_name,
                    'country': country,
                    'avg_pm25': round(avg_pm25_value, 2) if avg_pm25_value is not None else None,
                    'sample_count': sample_count_value,
                }
            )

        if not normalized_cities:
            return jsonify({'success': False, 'error': 'No valid city rows were provided'}), 400

        ai_prompt = f"""
You are AI Agent 1 for an air-quality storytelling dashboard.
Generate short testimonial-style cards inspired by the listed high-pollution cities.
    Use only the city rows provided below. Do not use outside knowledge, external databases, or world facts.
    Keep the output in the same quote + author + details structure used by the human testimonial cards.

City data:
{json.dumps(normalized_cities, indent=2)}

Return valid JSON only with this exact shape:
{{
  "testimonials": [
    {{
      "quote": "...",
      "author": "...",
      "details": "..."
    }}
  ]
}}

Rules:
- Create one testimonial per city row (same order).
- Each testimonial must mention the city name and include one concrete metric from the city row.
- Keep quote and details realistic and concise for dashboard cards.
- Keep content safe and non-defamatory; represent voices as anonymized community-style perspectives.
- No markdown fences and no extra keys.
"""

        provider_used = 'fallback'
        ai_payload = None
        testimonials_timeout_seconds = min(chat_provider_service.story_timeout_seconds, 25)
        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                ai_prompt,
                model=chat_provider_service.story_ollama_model,
                num_predict=700,
                timeout_seconds=testimonials_timeout_seconds,
            )
            ai_payload = _safe_json_loads(response_text)
        except Exception:
            ai_payload = None

        fallback_testimonials = _fallback_city_testimonials(normalized_cities)
        ai_testimonials = (ai_payload or {}).get('testimonials') if isinstance(ai_payload, dict) else None

        testimonials = []
        if isinstance(ai_testimonials, list) and ai_testimonials:
            for index, item in enumerate(ai_testimonials[:len(normalized_cities)]):
                if not isinstance(item, dict):
                    continue
                source_city = normalized_cities[index]
                quote = str(item.get('quote', '')).strip()
                author = str(item.get('author', '')).strip()
                details = str(item.get('details', '')).strip()

                if source_city['city'].lower() not in f"{quote} {details}".lower():
                    details = f"{source_city['city']}: {details}" if details else f"{source_city['city']} faces recurring exposure pressure."

                if not quote:
                    quote = fallback_testimonials[index]['quote']
                if not author:
                    author = fallback_testimonials[index]['author']
                if not details:
                    details = fallback_testimonials[index]['details']

                testimonials.append(
                    {
                        'quote': quote,
                        'author': author,
                        'details': details,
                    }
                )

        if len(testimonials) < len(normalized_cities):
            testimonials = fallback_testimonials
            provider_used = 'fallback'

        return jsonify({'success': True, 'data': {'provider': provider_used, 'testimonials': testimonials}}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


def _fallback_city_guidance(city_name, city_aqi_avg, top_pollutants, global_pollutant_values):
    """Fallback problems and precautions with city-specific pollutant metrics."""
    city_tag = city_name or 'This city'
    city_aqi_text = f"{city_aqi_avg:.2f}" if city_aqi_avg is not None else 'unknown'

    if not top_pollutants:
        aqi_text = f"{city_aqi_avg:.2f}" if city_aqi_avg is not None else 'unknown'
        return (
            [
                f"{city_tag} has an average AQI near {aqi_text}, but limited pollutant granularity makes root-cause analysis less precise.",
                f"In {city_tag}, short-term pollution spikes can still impact respiratory comfort even when monthly averages look stable.",
                f"Without detailed pollutant attribution in {city_tag}, sensitive groups may not receive timely exposure-specific guidance.",
            ],
            [
                f"Track daily AQI in {city_tag} and reduce outdoor exertion on days that exceed your normal baseline.",
                f"Use portable or indoor filtration in {city_tag} during poor-air episodes and close windows during peak traffic periods.",
                f"Prioritize school and elderly protection plans in {city_tag} when AQI increases for multiple consecutive days.",
            ],
        )

    dominant = top_pollutants[0]
    dominant_key = dominant.get('key')
    dominant_name = dominant.get('name', 'PM2.5')
    dominant_value = dominant.get('value')
    global_value = global_pollutant_values.get(dominant_key) if dominant_key else None
    ratio_text = ''
    if dominant_value is not None and global_value not in (None, 0):
        ratio_text = f" ({dominant_value / global_value:.2f}x global avg)"

    problems = [
        f"{city_tag} shows elevated {dominant_name} at {dominant_value:.2f}{ratio_text}, increasing irritation and respiratory burden risk.",
        f"Multi-pollutant exposure in {city_tag} (top contributors: {', '.join(item['name'] for item in top_pollutants[:3])}) can amplify cardiovascular and lung stress.",
        f"When AQI in {city_tag} remains near {city_aqi_text} on average, repeated moderate-to-poor days can reduce safe outdoor activity windows.",
    ]

    precautions = [
        f"In {city_tag}, schedule outdoor exercise for lower-AQI hours and avoid roadside routes when {dominant_name} peaks.",
        f"Use well-fitted masks and indoor HEPA filtration in {city_tag} on high-pollution days, especially for children and asthma patients.",
        f"For {city_tag}, prioritize local actions that reduce {dominant_name} sources (traffic management, cleaner fuels, and industrial controls).",
    ]
    return problems, precautions


def _fallback_city_testimonials(cities):
    """Create deterministic testimonial cards when AI generation is unavailable."""
    cards = []
    for city in cities:
        city_name = city.get('city', 'This city')
        country = city.get('country') or 'Unknown'
        avg_pm25 = city.get('avg_pm25')
        sample_count = city.get('sample_count')
        pm25_text = f"{avg_pm25:.2f}" if isinstance(avg_pm25, (int, float)) else 'unknown'
        sample_text = str(sample_count) if isinstance(sample_count, int) else 'n/a'

        cards.append(
            {
                'quote': f"In {city_name}, bad-air days shape our daily routine more than the weather forecast.",
                'author': f"Resident voice, {city_name}, {country}",
                'details': (
                    f"Average PM2.5 is around {pm25_text} based on {sample_text} records; families describe adjusting school, commute, "
                    f"and outdoor time around pollution peaks."
                ),
            }
        )
    return cards


def _prefer_city_specific_items(ai_items, fallback_items, city_name):
    """Prefer AI items only when they contain city context or concrete metrics."""
    if not isinstance(ai_items, list) or not ai_items:
        return fallback_items

    city_token = (city_name or '').strip().lower()

    def _is_specific(text):
        if not isinstance(text, str):
            return False
        candidate = text.strip()
        if not candidate:
            return False
        has_city = bool(city_token and city_token in candidate.lower())
        has_metric = bool(re.search(r'\d', candidate))
        return has_city or has_metric

    if not any(_is_specific(item) for item in ai_items):
        return fallback_items

    cleaned = [item.strip() for item in ai_items if isinstance(item, str) and item.strip()]
    return cleaned or fallback_items


def _fallback_city_reasons(
    city_name,
    country_name,
    city_aqi_avg,
    global_aqi_avg,
    top_pollutants,
    sample_count,
    strongest_deviations,
    source_signals,
):
    """Fallback city-specific reasons grounded in measured city metrics."""
    city_tag = city_name or 'This city'
    country_tag = country_name or 'Unknown country'
    city_aqi_text = f"{city_aqi_avg:.2f}" if city_aqi_avg is not None else 'unknown'
    global_aqi_text = f"{global_aqi_avg:.2f}" if global_aqi_avg is not None else 'unknown'

    if strongest_deviations:
        top_dev = strongest_deviations[0]
        deviation_text = (
            f"{top_dev['name']} in {city_tag} averages {top_dev['city_value']:.2f}, "
            f"about {top_dev['ratio']:.2f}x the global baseline ({top_dev['global_value']:.2f})."
        )
    elif top_pollutants:
        top_pollutant = top_pollutants[0]
        deviation_text = f"{top_pollutant['name']} is a dominant pollutant in {city_tag} at {top_pollutant['value']:.2f}."
    else:
        deviation_text = f"Available measurements indicate recurring air-quality pressure in {city_tag}."

    source_reason = _compose_source_reason(city_tag, source_signals)

    return [
        f"{city_tag}, {country_tag} has an average AQI of {city_aqi_text} across {sample_count} records versus a global average near {global_aqi_text}.",
        deviation_text,
        source_reason,
    ]


def _derive_city_source_signals(strongest_deviations):
    """Infer likely emission source signals from measured pollutant deviations."""
    signal_map = {
        'no2': 'Traffic emissions are a strong signal (vehicle combustion and road congestion).',
        'so2': 'Industrial or power-generation emissions are a strong signal (sulfur-containing fuel combustion).',
        'pm25': 'Fine-particle combustion sources are a strong signal (traffic exhaust, fuel burning, mixed urban emissions).',
        'pm10': 'Dust and coarse particles are a strong signal (construction activity, road dust, mechanical abrasion).',
        'co': 'Incomplete combustion is a strong signal (traffic queues, fuel burning, inefficient combustion sources).',
        'o3': 'Photochemical pollution is a strong signal (sunlight-driven reactions of NOx/VOCs in urban air).',
    }

    signals = []
    for item in strongest_deviations:
        key = item.get('key')
        if key not in signal_map:
            continue
        signals.append(
            {
                'pollutant': item.get('name'),
                'ratio': item.get('ratio'),
                'city_value': item.get('city_value'),
                'global_value': item.get('global_value'),
                'source_signal': signal_map[key],
            }
        )
    return signals


def _compose_source_reason(city_name, source_signals):
    """Compose one city-specific source explanation sentence from pollutant evidence."""
    if not source_signals:
        return (
            f"Measured pollutant patterns in {city_name} indicate mixed local emission sources, and additional source-apportionment data is needed "
            f"to separate traffic, industry, and dust contributions with higher certainty."
        )

    primary = source_signals[0]
    lead_text = (
        f"In {city_name}, {primary['pollutant']} is {primary['ratio']:.2f}x the global average "
        f"({primary['city_value']:.2f} vs {primary['global_value']:.2f}), and this pattern suggests: {primary['source_signal']}"
    )

    if len(source_signals) == 1:
        return lead_text

    secondary = source_signals[1]
    return (
        f"{lead_text} A second signal appears in {secondary['pollutant']} at {secondary['ratio']:.2f}x global, "
        f"which supports a combined-source pressure rather than a single pollution driver."
    )


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
