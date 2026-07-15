"""One-time local cache warmer for the Ollama-generated story/agentic content.

Run this once on a machine with Ollama actually running:

    cd backend
    python scripts/warm_ollama_cache.py

It POSTs to every story/agentic endpoint that has a small, enumerable input space (deep-dive
modes, inversion-chamber presets, the closing-beat city/for-whom/concern grid, etc.) using the
Flask test client - the exact same route code the frontend hits, so cache keys match exactly.
Each successful call gets written to the CachedNarrative table by the route itself (via
_set_cached_narrative), same as a real user's first request would.

After warming, it exports the whole CachedNarrative table to backend/app/data/ollama_cache_seed.json,
which is committed to the repo and auto-loaded into a fresh, empty database on startup (see
_load_ollama_cache_seed in backend/app/__init__.py). That's what lets someone else's `docker
compose up`, with no Ollama installed at all, serve real pre-generated content on first boot
instead of 502ing or falling back to filler text for every single request.

Routes with free-text or otherwise unbounded input (agentic-fact-detail, agentic-caption,
ollama-text, agentic-cigarette-story, agentic-simulation-story, agentic-explain, theme-story,
humanize-story, scale-ladder-*) are intentionally not warmed here - they already have deterministic
fallback text (see story_routes.py) for when Ollama isn't reachable, so skipping them doesn't
reintroduce the 502-or-blank-section problem this whole cache exists to solve, it just means an
uncommon combination gets fallback phrasing instead of literal Ollama output until it's requested
once for real.

Safe to re-run: every route checks the cache before calling Ollama, so already-warmed
combinations are skipped almost instantly.
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import CachedNarrative
from app.routes.story_routes import (
    AGENTIC_CITIES,
    AGENTIC_CLOSING_CITIES,
    AGENTIC_CLOUD_SOURCES,
    AGENTIC_CONCERNS,
    AGENTIC_FOR_WHOM,
    AGENTIC_HELP_SOURCES,
)

SEED_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app', 'data', 'ollama_cache_seed.json')


def _build_requests():
    """Yield (label, method_path, json_body) for every enumerable-input route/combo."""
    for mode in ('ai', 'agentic'):
        yield (f'deep-dive-narrative:{mode}', '/api/stories/deep-dive-narrative', {'mode': mode})
        yield (f'deep-dive-interventions:{mode}', '/api/stories/deep-dive-interventions', {'mode': mode})
        yield (f'deep-dive-impact:{mode}', '/api/stories/deep-dive-impact', {'mode': mode})

    for preset in ('default', 'monsoon', 'october', 'january'):
        yield (f'inversion-chamber-explain:{preset}', '/api/stories/inversion-chamber-explain', {'preset': preset})

    for city in AGENTIC_CLOSING_CITIES:
        for for_whom in AGENTIC_FOR_WHOM:
            for concern in AGENTIC_CONCERNS:
                args = {'city': city, 'for_whom': for_whom, 'concern': concern}
                slug = f'{city}:{for_whom}:{concern}'
                yield (f'agentic-meaning:{slug}', '/api/stories/agentic-meaning', args)
                yield (f'agentic-action:{slug}', '/api/stories/agentic-action', args)
                yield (f'agentic-neighbours:{slug}', '/api/stories/agentic-neighbours', args)
                yield (f'agentic-breath:{slug}', '/api/stories/agentic-breath', args)

    for city in AGENTIC_CITIES:
        yield (f'agentic-air-words:{city}', '/api/stories/agentic-air-words', {'city': city})
        yield (f'agentic-day-ribbon:{city}', '/api/stories/agentic-day-ribbon', {'city': city})

    for source in AGENTIC_HELP_SOURCES:
        yield (f'agentic-help:{source}', '/api/stories/agentic-help', {'source': source})

    for source in AGENTIC_CLOUD_SOURCES:
        yield (f'agentic-cloud:{source}', '/api/stories/agentic-cloud', {'source': source})

    yield ('agentic-good-day', '/api/stories/agentic-good-day', {})
    yield ('agentic-good-day-timeline', '/api/stories/agentic-good-day-timeline', {})
    yield ('agentic-bubbles', '/api/stories/agentic-bubbles', {})


def warm():
    app = create_app()
    client = app.test_client()

    requests_list = list(_build_requests())
    total = len(requests_list)
    print(f'Warming {total} requests against Ollama. This calls the real routes, so already-cached '
          f'combinations return almost instantly and only genuine misses hit Ollama.')

    ok, failed = 0, 0
    started = time.time()
    for index, (label, path, body) in enumerate(requests_list, start=1):
        attempt_started = time.time()
        try:
            response = client.post(path, json=body)
            data = response.get_json() or {}
            success = bool(data.get('success'))
            provider = (data.get('data') or {}).get('provider')
            elapsed = time.time() - attempt_started
            if success and provider != 'fallback':
                ok += 1
                print(f'[{index}/{total}] OK    {label} ({provider}, {elapsed:.1f}s)')
            else:
                failed += 1
                print(f'[{index}/{total}] MISS  {label} (provider={provider}, http={response.status_code})')
        except Exception as exc:  # noqa: BLE001 - a warm-script failure shouldn't kill the whole run
            failed += 1
            print(f'[{index}/{total}] ERROR {label}: {exc}')

    total_elapsed = time.time() - started
    print(f'\nDone in {total_elapsed / 60:.1f} min - {ok} warmed live, {failed} still missing/fallback.')
    if failed:
        print('Re-run this script to retry the missing ones - already-cached entries are skipped fast.')


def export_seed():
    app = create_app()
    with app.app_context():
        rows = CachedNarrative.query.all()
        seed = {
            row.cache_key: {'payload': row.payload, 'provider': row.provider}
            for row in rows
        }

    os.makedirs(os.path.dirname(SEED_PATH), exist_ok=True)
    with open(SEED_PATH, 'w', encoding='utf-8') as fh:
        json.dump(seed, fh, indent=2, ensure_ascii=False, sort_keys=True)

    print(f'Exported {len(seed)} cached entries to {os.path.abspath(SEED_PATH)}')


if __name__ == '__main__':
    warm()
    export_seed()
