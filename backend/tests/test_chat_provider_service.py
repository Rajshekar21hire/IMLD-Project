"""Unit tests for the chat provider service."""
import requests

from app.services.chat_provider_service import ChatProviderService


class DummyResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_default_provider_is_ollama(monkeypatch):
    monkeypatch.delenv('CHAT_PROVIDER', raising=False)
    service = ChatProviderService()
    assert service.resolve_provider() == 'ollama'


def test_ollama_provider_uses_local_api(monkeypatch):
    monkeypatch.setenv('CHAT_PROVIDER', 'ollama')
    monkeypatch.setenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    monkeypatch.setenv('OLLAMA_MODEL', 'llama3.2:3b')

    captured = {}

    def fake_post(url, json=None, timeout=None):
        captured['url'] = url
        captured['json'] = json
        captured['timeout'] = timeout
        return DummyResponse({'message': {'content': 'Local answer'}})

    monkeypatch.setattr('app.services.chat_provider_service.requests.post', fake_post)

    service = ChatProviderService()
    answer = service.generate_answer('hello world', provider='ollama')

    assert answer[0] == 'Local answer'
    assert answer[1] == 'ollama'
    assert captured['url'] == 'http://localhost:11434/api/chat'
    assert captured['json']['model'] == 'llama3.2:3b'


def test_gemini_provider_uses_api_key(monkeypatch):
    monkeypatch.setenv('CHAT_PROVIDER', 'gemini')
    monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
    monkeypatch.setenv('GEMINI_MODEL', 'gemini-2.5-flash')

    captured = {}

    def fake_post(url, headers=None, json=None, timeout=None):
        captured['url'] = url
        captured['headers'] = headers
        captured['json'] = json
        captured['timeout'] = timeout
        return DummyResponse({
            'candidates': [
                {
                    'content': {
                        'parts': [
                            {'text': 'Gemini answer'}
                        ]
                    }
                }
            ]
        })

    monkeypatch.setattr('app.services.chat_provider_service.requests.post', fake_post)

    service = ChatProviderService()
    answer = service.generate_answer('hello world', provider='gemini')

    assert answer[0] == 'Gemini answer'
    assert answer[1] == 'gemini'
    assert 'x-goog-api-key' in captured['headers']
    assert captured['headers']['x-goog-api-key'] == 'test-key'
    assert captured['url'].endswith('/models/gemini-2.5-flash:generateContent')


def test_ollama_falls_back_to_gemini_when_unreachable(monkeypatch):
    monkeypatch.setenv('CHAT_PROVIDER', 'ollama')
    monkeypatch.setenv('OLLAMA_BASE_URL', 'http://localhost:11434')
    monkeypatch.setenv('GEMINI_API_KEY', 'test-key')
    monkeypatch.setenv('GEMINI_MODEL', 'gemini-2.5-flash')

    calls = []

    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append(url)
        if url.startswith('http://localhost:11434'):
            raise requests.ConnectionError('Ollama offline')
        return DummyResponse({
            'candidates': [
                {
                    'content': {
                        'parts': [
                            {'text': 'Fallback answer'}
                        ]
                    }
                }
            ]
        })

    monkeypatch.setattr('app.services.chat_provider_service.requests.post', fake_post)

    service = ChatProviderService()
    answer = service.generate_answer('hello world', provider='ollama')

    assert answer[0] == 'Fallback answer'
    assert answer[1] == 'gemini'
    assert calls[0] == 'http://localhost:11434/api/chat'
    assert calls[1].endswith('/models/gemini-2.5-flash:generateContent')
