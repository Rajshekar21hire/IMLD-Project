"""AI-style agent for ranking the worst cities from air quality data."""

from collections import defaultdict
import re
from statistics import mean


class WorstCitiesAgent:
    """Analyze city-level air quality data and rank the worst cities."""

    def __init__(self):
        self.metric_weights = {
            'aqi': 0.55,
            'pm25': 0.20,
            'pm10': 0.10,
            'no2': 0.07,
            'so2': 0.04,
            'co': 0.04,
        }

    def analyze_top_worst_cities(self, data_list, limit):
        """Return the top cities with the worst air quality in the given dataset."""
        return self._analyze_cities(data_list, limit=limit, ranking_mode='worst')

    def analyze_top_best_cities(self, data_list, limit):
        """Return the top cities with the best air quality in the given dataset."""
        return self._analyze_cities(data_list, limit=limit, ranking_mode='best')

    def _analyze_cities(self, data_list, limit, ranking_mode='worst'):
        """Rank cities by composite pollution score for best/worst requests."""
        city_groups = defaultdict(list)

        for record in data_list:
            city_groups[(record.country, record.city)].append(record)

        city_rows = []
        for (country, city), records in city_groups.items():
            city_rows.append(self._build_city_row(country, city, records))

        if not city_rows:
            return {
                'title': f"Top {ranking_mode.title()} Cities Analysis",
                'summary': 'No city-level data available for analysis.',
                'cities': [],
                'count': 0,
                'ranking_mode': ranking_mode,
            }

        normalized_scores = self._score_cities(city_rows)

        def ranking_value(item):
            pm25_value = item['averages'].get('pm25')
            if pm25_value is not None:
                return pm25_value
            return item['score']

        ranked_rows = sorted(
            normalized_scores,
            key=ranking_value,
            reverse=(ranking_mode == 'worst'),
        )

        top_rows = ranked_rows[:limit]
        city_names = ', '.join([
            f"{row['city']}, {row['country']}" for row in top_rows[:3]
        ])

        if ranking_mode == 'best':
            summary = (
                f"Ranked {len(city_rows)} cities from the available dataset and identified "
                f"{len(top_rows)} best performers based on average PM2.5."
            )
            if city_names:
                summary += f" The cleanest cities are {city_names}."
            title = f"Top {len(top_rows)} Best Cities in the Available Data"
        else:
            summary = (
                f"Ranked {len(city_rows)} cities from the available dataset and identified "
                f"{len(top_rows)} worst performers based on average PM2.5."
            )
            if city_names:
                summary += f" The highest-risk cities are {city_names}."
            title = f"Top {len(top_rows)} Worst Cities in the Available Data"

        return {
            'title': title,
            'summary': summary,
            'cities': top_rows,
            'count': len(top_rows),
            'ranking_mode': ranking_mode,
        }

    def analyze_prompt(self, prompt, data_list, default_limit=None):
        """Interpret a user prompt and return a structured dataset analysis."""
        prompt_text = (prompt or '').strip()
        limit = self._extract_limit(prompt_text, default_limit)
        prompt_profile = self._detect_prompt_profile(prompt_text)
        ranking_mode = self._detect_ranking_mode(prompt_text)

        if ranking_mode == 'best':
            analysis = self.analyze_top_best_cities(data_list, limit=limit)
        else:
            analysis = self.analyze_top_worst_cities(data_list, limit=limit)
        analysis['records_analyzed'] = len(data_list)
        chart_data = self._build_chart_data(analysis.get('cities', []))

        analysis['prompt'] = prompt_text
        analysis['interpretation'] = self._build_interpretation(prompt_text, analysis)
        analysis['insights'] = self._build_insights(analysis)
        analysis['chart_data'] = chart_data
        analysis['presentation'] = self._build_presentation(analysis, prompt_profile)
        analysis['visualization_notes'] = [
            'Use the summary view for text-first reading, the charts view for visual comparison, and the ranking view for a table-style breakdown.',
            f"The score chart compares the composite air-quality score for the {analysis.get('ranking_mode', 'worst')} cities in the dataset.",
            'The pollutant chart compares AQI and the main pollutant averages for the same cities.',
        ]
        analysis['query_hint'] = (
            f"Prompt interpreted as a {analysis.get('ranking_mode', 'worst')}-cities request with a top-{limit} ranking "
            f'and a {analysis["presentation"]["recommended_view"]} presentation.'
        )

        return analysis

    def _build_city_row(self, country, city, records):
        """Aggregate a single city's pollution profile."""
        averages = {}
        for metric in self.metric_weights:
            values = [getattr(record, metric) for record in records if getattr(record, metric) is not None]
            averages[metric] = mean(values) if values else None

        aqi_categories = defaultdict(int)
        latest_measurement = None
        for record in records:
            if record.aqi_category:
                aqi_categories[record.aqi_category] += 1
            if record.measurement_date and (
                latest_measurement is None or record.measurement_date > latest_measurement
            ):
                latest_measurement = record.measurement_date

        dominant_category = None
        if aqi_categories:
            dominant_category = max(aqi_categories.items(), key=lambda item: item[1])[0]

        return {
            'country': country,
            'city': city,
            'records': len(records),
            'latest_measurement': latest_measurement.isoformat() if latest_measurement else None,
            'averages': averages,
            'dominant_aqi_category': dominant_category,
        }

    def _score_cities(self, city_rows):
        """Compute a normalized composite score for each city."""
        metric_ranges = {}
        for metric in self.metric_weights:
            values = [row['averages'][metric] for row in city_rows if row['averages'][metric] is not None]
            if values:
                metric_ranges[metric] = (min(values), max(values))
            else:
                metric_ranges[metric] = (None, None)

        scored_rows = []
        for row in city_rows:
            score = 0.0
            drivers = []

            for metric, weight in self.metric_weights.items():
                value = row['averages'][metric]
                normalized = self._normalize(value, metric_ranges[metric])
                if normalized is None:
                    continue

                contribution = normalized * weight
                score += contribution
                drivers.append({
                    'metric': metric,
                    'value': round(value, 2),
                    'normalized': round(normalized, 2),
                    'weight': weight,
                    'contribution': round(contribution, 2),
                })

            drivers.sort(key=lambda item: item['contribution'], reverse=True)
            row_copy = dict(row)
            row_copy['score'] = round(score, 2)
            row_copy['drivers'] = drivers[:3]
            scored_rows.append(row_copy)

        return scored_rows

    def _normalize(self, value, value_range):
        """Normalize a metric to a 0-100 scale where higher means worse."""
        if value is None:
            return None

        minimum, maximum = value_range
        if minimum is None or maximum is None:
            return None
        if maximum == minimum:
            return 50.0

        return ((value - minimum) / (maximum - minimum)) * 100

    def _extract_limit(self, prompt_text, default_limit):
        """Detect an explicit top-N ranking request in the prompt."""
        if not prompt_text:
            return default_limit

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

        return default_limit

    def _build_chart_data(self, city_rows):
        """Build chart-ready records for frontend visualizations."""
        chart_rows = []
        for row in city_rows:
            averages = row.get('averages', {})
            chart_rows.append({
                'name': f"{row['city']}, {row['country']}",
                'score': row.get('score', 0),
                'aqi': round(averages.get('aqi') or 0, 2),
                'pm25': round(averages.get('pm25') or 0, 2),
                'pm10': round(averages.get('pm10') or 0, 2),
                'no2': round(averages.get('no2') or 0, 2),
            })
        return chart_rows

    def _detect_prompt_profile(self, prompt_text):
        """Classify the user's requested presentation style from the prompt."""
        lowered = prompt_text.lower()
        keywords = []

        if any(word in lowered for word in ['world', 'global', 'worldwide']):
            keywords.append('global')
        if any(word in lowered for word in ['chart', 'graph', 'graphic', 'visual', 'dashboard']):
            keywords.append('visual')
        if any(word in lowered for word in ['text', 'summary', 'explain', 'interpret']):
            keywords.append('narrative')
        if any(word in lowered for word in ['table', 'list', 'rank', 'ranking']):
            keywords.append('ranking')

        if 'visual' in keywords and 'narrative' in keywords:
            recommended_view = 'summary'
        elif 'visual' in keywords:
            recommended_view = 'charts'
        elif 'ranking' in keywords:
            recommended_view = 'ranking'
        else:
            recommended_view = 'summary'

        return {
            'keywords': keywords,
            'recommended_view': recommended_view,
        }

    def _detect_ranking_mode(self, prompt_text):
        """Determine whether the user is asking for best or worst cities."""
        lowered = (prompt_text or '').lower()
        best_signals = ['best', 'clean', 'cleanest', 'least polluted', 'lowest pollution', 'healthiest']

        if any(signal in lowered for signal in best_signals):
            return 'best'

        return 'worst'

    def _build_presentation(self, analysis, prompt_profile):
        """Create lightweight presentation metadata for the frontend."""
        cities = analysis.get('cities', [])
        top_city = cities[0] if cities else None
        city_count = analysis.get('count', 0)
        record_count = analysis.get('records_analyzed', 0)
        ranking_mode = analysis.get('ranking_mode', 'worst')

        city_detail = (
            'Best-performing cities returned by the current prompt based on PM2.5'
            if ranking_mode == 'best'
            else 'Worst-performing cities returned by the current prompt based on PM2.5'
        )
        top_city_label = 'Best city' if ranking_mode == 'best' else 'Worst city'

        cards = [
            {
                'label': 'Cities ranked',
                'value': str(city_count),
                'detail': city_detail,
            },
            {
                'label': 'Measurements',
                'value': str(record_count),
                'detail': 'Total readings used to build the ranking',
            },
        ]

        if top_city:
            cards.insert(1, {
                'label': top_city_label,
                'value': f"{top_city['city']}, {top_city['country']}",
                'detail': f"Average PM2.5 {top_city['averages'].get('pm25', 0):.2f}",
            })

        return {
            'recommended_view': prompt_profile['recommended_view'],
            'available_views': ['summary', 'charts', 'ranking'],
            'prompt_keywords': prompt_profile['keywords'],
            'cards': cards,
        }

    def _build_interpretation(self, prompt_text, analysis):
        """Generate a concise narrative tailored to the prompt."""
        city_count = analysis.get('count', 0)
        record_count = analysis.get('records_analyzed', 0)
        ranking_mode = analysis.get('ranking_mode', 'worst')
        if city_count == 0:
            return 'No matching cities were found in the provided dataset.'

        ranking_text = 'best performers' if ranking_mode == 'best' else 'worst performers'

        return (
            f"Prompt received: '{prompt_text or 'Show me the top five worst cities in the dataset.'}'. "
            f"The agent reviewed {record_count} measurements across {city_count} cities and ranked the {ranking_text} by average PM2.5."
        )

    def _build_insights(self, analysis):
        """Create human-readable insight bullets from the ranked output."""
        cities = analysis.get('cities', [])
        ranking_mode = analysis.get('ranking_mode', 'worst')
        if not cities:
            return ['No city-level data was available for ranking.']

        top_city = cities[0]
        second_city = cities[1] if len(cities) > 1 else None
        if ranking_mode == 'best':
            insights = [
                f"{top_city['city']}, {top_city['country']} is the cleanest city in this ranking with an average PM2.5 of {top_city['averages'].get('pm25', 0):.2f}.",
                'Lower PM2.5 and particulate levels are the strongest signals for better city rankings.',
            ]

            if second_city:
                insights.append(
                    f"{second_city['city']}, {second_city['country']} follows closely, which indicates multiple cities maintain relatively low pollution pressure."
                )
        else:
            insights = [
                f"{top_city['city']}, {top_city['country']} is the highest-risk city in this ranking with an average PM2.5 of {top_city['averages'].get('pm25', 0):.2f}.",
                'PM2.5 is the dominant driver in the ranking, with PM10 and AQI helping explain the broader pollution pattern across the top cities.',
            ]

            if second_city:
                insights.append(
                    f"{second_city['city']}, {second_city['country']} follows closely, which suggests the pollution burden is shared across multiple urban centers."
                )

        return insights