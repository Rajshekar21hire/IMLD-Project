from app.services.data_service import DataService
from app.agents.worst_cities_agent import WorstCitiesAgent
import re


class WorstCitiesService:
    """Service for analyzing and ranking the worst cities in the dataset."""

    def __init__(self):
        self.agent = WorstCitiesAgent()

    def get_top_worst_cities(self, country=None, city=None, days=30, limit=None):
        """Fetch data and return a ranked top-worst-cities analysis."""
        data_list = DataService.get_data_by_filters(country=country, city=city, days=days)

        if not data_list and days is not None:
            data_list = DataService.get_data_by_filters(country=country, city=city, days=None)

        if not data_list:
            return None, 'No data available for the specified filters'

        if limit is None:
            return None, 'Please specify the number of cities you want to rank.'

        analysis = self.agent.analyze_top_worst_cities(data_list, limit=limit)
        analysis['filters'] = {
            'country': country,
            'city': city,
            'days': days,
        }
        analysis['records_analyzed'] = len(data_list)
        return analysis, None

    def analyze_prompt(self, prompt, country=None, city=None, days=30, limit=None):
        """Fetch data and return a prompt-driven analysis response."""
        data_list = DataService.get_data_by_filters(country=country, city=city, days=days)

        if not data_list and days is not None:
            data_list = DataService.get_data_by_filters(country=country, city=city, days=None)

        if not data_list:
            return None, 'No data available for the specified filters'

        prompt_text = prompt or ''
        inferred_limit = self._extract_limit_from_prompt(prompt_text)
        effective_limit = limit if limit is not None else inferred_limit

        if effective_limit is None:
            return None, 'Please specify the number of cities in your prompt, for example: "top 6 worst cities" or "worst six cities".'

        analysis = self.agent.analyze_prompt(prompt_text, data_list, default_limit=effective_limit)
        analysis['filters'] = {
            'country': country,
            'city': city,
            'days': days,
            'limit': effective_limit,
        }
        analysis['records_analyzed'] = len(data_list)
        return analysis, None

    def _extract_limit_from_prompt(self, prompt_text):
        """Extract top-N from prompt text for requests that omit explicit limit."""
        word_to_num = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
        }

        def parse_limit(raw_value):
            if raw_value is None:
                return None

            cleaned = raw_value.lower()
            if cleaned.isdigit():
                return max(1, int(cleaned))
            if cleaned in word_to_num and word_to_num[cleaned] > 0:
                return max(1, word_to_num[cleaned])
            return None

        patterns = [
            r'(?:top|best|worst|cleanest)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)',
            r'(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s+(?:top|best|worst|cleanest|cities?|city)',
        ]

        for pattern in patterns:
            match = re.search(pattern, prompt_text, flags=re.IGNORECASE)
            if match:
                limit = parse_limit(match.group(1))
                if limit is not None:
                    return limit

        return None