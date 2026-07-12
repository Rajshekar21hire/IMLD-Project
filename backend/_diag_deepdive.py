from app.services.chat_provider_service import ChatProviderService
from app import create_app

app = create_app()
with app.app_context():
    svc = ChatProviderService()
    prompt = """
You are writing framing narration for an air-quality storytelling dashboard about five of the world's
most polluted cities (Lahore, Delhi, New Delhi, Dhaka, Ghaziabad).

Established facts you must stay grounded in (do not invent new numbers or claims):
- The five cities share a structural cluster of causes: fossil-fuel transport, coal-fired brick kilns, and unregulated industrial emissions.
- Flat basin geography causes winter temperature inversions that trap pollutants and turn ordinary emissions into hazardous seasonal spikes.
- Overlapping jurisdictions across states and countries mean no single authority owns the airshed, undermining enforcement.
- Proven interventions exist across Personal, Household, Policy, and Community categories (electric vehicles, clean cookstoves, industrial emission standards, low-emission zones, etc).
- If these interventions were adopted globally: 3.7 million lives could be saved per year, visible city-level change is possible within 5 years, indoor PM2.5 can drop 90 percent immediately with clean cookstoves, and 48-hour advance pollution warnings are now technically possible.

Write with emotional intelligence: warm, hopeful, human-centered and positive in tone, as if speaking to someone who cares about the people affected - while staying strictly grounded in the facts above. Do not invent new statistics or claims.

Return valid JSON only with this exact shape:
{"intro": ["paragraph 1", "paragraph 2"], "pattern_cards": [{"eyebrow": "...", "title": "...", "body": "..."}, {"eyebrow": "...", "title": "...", "body": "..."}, {"eyebrow": "...", "title": "...", "body": "..."}], "intervention_intro": "...", "impact_intro": "..."}

Rules:
- intro reframes why these five cities are the worst-affected (2 short paragraphs).
- pattern_cards mirrors three angles in this order: the shared structural cluster of causes, the geography that amplifies it, and the governance gap that undermines fixes.
- intervention_intro is 1-2 sentences framing that proven fixes exist across personal, household, policy, and community action.
- impact_intro is 1 sentence framing what would happen if these interventions were adopted everywhere.
- No markdown fences. No extra keys. Keep each field concise (2-3 sentences max).
"""
    text, provider = svc.generate_local_answer(prompt, model=svc.story_ollama_model, num_predict=900, timeout_seconds=340)
    print('=====RAW OUTPUT START=====')
    print(text)
    print('=====RAW OUTPUT END=====')
    print('LENGTH:', len(text))
