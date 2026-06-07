"""Provider client for chat responses from Ollama or Gemini."""
import os
import requests


class ChatProviderService:
    """Route chat prompts to a selected AI provider."""

    def __init__(self):
        self.default_provider = os.getenv('CHAT_PROVIDER', 'ollama').strip().lower()
        self.ollama_base_url = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434').rstrip('/')
        self.ollama_model = os.getenv('OLLAMA_MODEL', 'llama3.2:3b')
        self.story_ollama_model = os.getenv('OLLAMA_STORY_MODEL', self.ollama_model)
        self.story_timeout_seconds = float(os.getenv('OLLAMA_STORY_TIMEOUT_SECONDS', '120'))
        self.gemini_api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
        self.gemini_model = os.getenv('GEMINI_MODEL', 'gemini-2.5-flash')
        self.timeout_seconds = float(os.getenv('CHAT_TIMEOUT_SECONDS', '60'))

    def supported_providers(self):
        return ['ollama', 'gemini']

    def resolve_provider(self, provider=None):
        selected = (provider or self.default_provider or 'ollama').strip().lower()
        if selected not in self.supported_providers():
            raise ValueError(
                f"Unsupported chat provider '{selected}'. Supported providers: {', '.join(self.supported_providers())}"
            )
        return selected

    def generate_answer(self, prompt, provider=None):
        selected = self.resolve_provider(provider)

        if selected == 'ollama':
            try:
                return self._ask_ollama(prompt), selected
            except RuntimeError as exc:
                if self.gemini_api_key:
                    try:
                        return self._ask_gemini(prompt), 'gemini'
                    except RuntimeError:
                        pass
                raise RuntimeError(
                    f"{exc} If Ollama is not available, either start it or switch to Gemini in the chat provider selector."
                ) from exc
        if selected == 'gemini':
            return self._ask_gemini(prompt), selected

        raise ValueError(f"Unsupported chat provider '{selected}'")

    def generate_local_answer(self, prompt, model=None, num_predict=None, timeout_seconds=None):
        """Generate a response from Ollama only, without any paid fallback."""
        return self._ask_ollama(prompt, model=model, num_predict=num_predict, timeout_seconds=timeout_seconds), 'ollama'

    def _ask_ollama(self, prompt, model=None, num_predict=None, timeout_seconds=None):
        url = f"{self.ollama_base_url}/api/chat"
        payload = {
            "model": model or self.ollama_model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "stream": False,
        }

        if num_predict is not None:
            payload["options"] = {
                "num_predict": num_predict,
            }

        try:
            response = requests.post(url, json=payload, timeout=timeout_seconds or self.timeout_seconds)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise RuntimeError(
                f"Ollama request failed. Make sure Ollama is running at {self.ollama_base_url} and the model '{model or self.ollama_model}' is available. "
                f"Details: {exc}"
            ) from exc

        message = data.get('message') or {}
        content = message.get('content', '').strip()
        if not content:
            raise RuntimeError("Ollama returned an empty response.")

        return content

    def _ask_gemini(self, prompt):
        if not self.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY or GOOGLE_API_KEY is not set. Add a Gemini API key or switch back to Ollama."
            )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.gemini_model}:generateContent"
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.gemini_api_key,
        }
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=self.timeout_seconds)
            response.raise_for_status()
            data = response.json()
        except requests.RequestException as exc:
            raise RuntimeError(
                f"Gemini request failed. Check your API key and model '{self.gemini_model}'. Details: {exc}"
            ) from exc

        candidates = data.get('candidates') or []
        if not candidates:
            raise RuntimeError("Gemini returned no candidates.")

        content = candidates[0].get('content') or {}
        parts = content.get('parts') or []
        text = ''.join(part.get('text', '') for part in parts).strip()
        if not text:
            raise RuntimeError("Gemini returned an empty response.")

        return text
