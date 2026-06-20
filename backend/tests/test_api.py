"""
Integration tests for data and story API routes.
Uses the Flask test client with an in-memory SQLite database.
"""
import json
import pytest
from unittest.mock import patch, MagicMock


# ---------------------------------------------------------------------------
# Data API tests
# ---------------------------------------------------------------------------

class TestCountriesEndpoint:
    def test_returns_success_shape(self, client, sample_air_quality):
        resp = client.get('/api/data/countries')
        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        assert isinstance(body['data'], list)

    def test_countries_are_sorted(self, client, sample_air_quality):
        resp = client.get('/api/data/countries')
        data = resp.get_json()['data']
        assert data == sorted(data)

    def test_seeded_countries_present(self, client, sample_air_quality):
        resp = client.get('/api/data/countries')
        data = resp.get_json()['data']
        assert 'India' in data
        assert 'USA' in data

    def test_empty_db_returns_empty_list(self, client):
        resp = client.get('/api/data/countries')
        assert resp.status_code == 200
        assert resp.get_json()['data'] == []


class TestCitiesEndpoint:
    def test_returns_all_cities(self, client, sample_air_quality):
        resp = client.get('/api/data/cities')
        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        cities = [c['city'] for c in body['data']]
        assert 'Delhi' in cities
        assert 'New York' in cities

    def test_filters_by_country(self, client, sample_air_quality):
        resp = client.get('/api/data/cities?country=India')
        body = resp.get_json()
        cities = [c['city'] for c in body['data']]
        assert 'Delhi' in cities
        assert 'Mumbai' in cities
        assert 'New York' not in cities

    def test_city_objects_have_country_field(self, client, sample_air_quality):
        resp = client.get('/api/data/cities')
        for city_obj in resp.get_json()['data']:
            assert 'city' in city_obj
            assert 'country' in city_obj


class TestFilterDataEndpoint:
    def test_returns_data_list(self, client, sample_air_quality):
        resp = client.get('/api/data/filter')
        body = resp.get_json()
        assert body['success'] is True
        assert isinstance(body['data'], list)
        assert body['count'] == len(body['data'])

    def test_filter_by_country(self, client, sample_air_quality):
        resp = client.get('/api/data/filter?country=USA')
        body = resp.get_json()
        assert all(d['country'] == 'USA' for d in body['data'])

    def test_filter_by_city(self, client, sample_air_quality):
        resp = client.get('/api/data/filter?country=India&city=Delhi')
        body = resp.get_json()
        assert all(d['city'] == 'Delhi' for d in body['data'])

    def test_limit_parameter(self, client, sample_air_quality):
        resp = client.get('/api/data/filter?limit=1')
        body = resp.get_json()
        assert len(body['data']) <= 1

    def test_record_shape(self, client, sample_air_quality):
        resp = client.get('/api/data/filter?country=USA')
        records = resp.get_json()['data']
        assert len(records) > 0
        record = records[0]
        for field in ('id', 'country', 'city', 'aqi', 'measurement_date'):
            assert field in record


class TestStatisticsEndpoint:
    def test_returns_statistics(self, client, sample_air_quality):
        resp = client.get('/api/data/statistics?pollution_type=aqi')
        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        assert 'statistics' in body
        assert 'aqi_distribution' in body
        assert 'trends' in body

    def test_statistics_shape(self, client, sample_air_quality):
        resp = client.get('/api/data/statistics?pollution_type=pm25')
        stats = resp.get_json()['statistics']
        for key in ('min', 'max', 'avg', 'count'):
            assert key in stats

    def test_no_data_returns_404(self, client):
        resp = client.get('/api/data/statistics?country=NonExistent&pollution_type=aqi')
        assert resp.status_code == 404


class TestAnalyticsSummaryEndpoint:
    def test_returns_ollama_summary(self, client, sample_air_quality, monkeypatch):
        captured = {}

        def fake_generate_local_answer(prompt, model=None, num_predict=None, timeout_seconds=None):
            captured['prompt'] = prompt
            captured['model'] = model
            return (
                json.dumps({
                    'summary': 'Delhi shows elevated AQI levels in the selected period.',
                    'highlights': ['AQI is elevated', 'Recent trend is steady'],
                    'risks': ['Sensitive groups should limit exposure'],
                    'recommendations': ['Review traffic emissions'],
                    'overall_assessment': 'mixed',
                }),
                'ollama',
            )

        monkeypatch.setattr(
            'app.routes.data_routes.chat_provider_service.generate_local_answer',
            fake_generate_local_answer,
        )

        resp = client.post(
            '/api/data/summary',
            json={
                'country': 'India',
                'city': 'Delhi',
                'pollution_type': 'aqi',
                'days': 30,
                'selected_pollutants': ['aqi', 'pm25'],
                'compare_mode': True,
            },
            content_type='application/json',
        )

        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        data = body['data']
        assert data['provider'] == 'ollama'
        assert data['record_count'] > 0
        assert data['summary']['summary']
        assert 'Delhi' in captured['prompt']
        assert 'AQI' in captured['prompt']


class TestDateRangeEndpoint:
    def test_returns_date_range(self, client, sample_air_quality):
        resp = client.get('/api/data/date-range')
        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        data = body['data']
        assert 'min_date' in data
        assert 'max_date' in data


class TestLiveReadingsEndpoint:
    def test_returns_live_readings_shape(self, client):
        with patch('app.routes.data_routes.LiveAirQualityService.get_live_readings') as mock_live:
            mock_live.return_value = (
                [
                    {
                        'country': 'India',
                        'city': 'Delhi',
                        'pm25': 32.1,
                        'pm10': 58.4,
                        'o3': 21.0,
                        'no2': 18.3,
                        'so2': 4.2,
                        'co': 0.6,
                        'aqi': 82.0,
                        'aqi_category': 'Moderate',
                        'measurement_date': '2026-06-07T12:00:00',
                        'source': 'open-meteo',
                        'source_label': 'Live Open-Meteo readings',
                        'units': {
                            'pm25': 'ug/m3',
                            'pm10': 'ug/m3',
                            'o3': 'ug/m3',
                            'no2': 'ug/m3',
                            'so2': 'ug/m3',
                            'co': 'mg/m3',
                        },
                    }
                ],
                [],
            )

            resp = client.get('/api/data/live?country=India')
            assert resp.status_code == 200
            body = resp.get_json()
            assert body['success'] is True
            assert body['count'] == 1
            assert body['source']
            assert body['data'][0]['city'] == 'Delhi'


# ---------------------------------------------------------------------------
# Story API tests
# ---------------------------------------------------------------------------

class TestListStoriesEndpoint:
    def test_empty_list_on_fresh_db(self, client):
        resp = client.get('/api/stories/')
        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        assert body['data'] == []
        assert body['total'] == 0

    def test_pagination_fields_present(self, client):
        resp = client.get('/api/stories/?limit=5&offset=0')
        body = resp.get_json()
        assert 'limit' in body
        assert 'offset' in body


class TestGenerateStoryEndpoint:
    def test_returns_400_when_no_data(self, client):
        """Generate story with no data in DB should return an error."""
        resp = client.post(
            '/api/stories/generate',
            json={'pollution_type': 'aqi', 'days': 30},
            content_type='application/json',
        )
        assert resp.status_code == 400
        body = resp.get_json()
        assert body['success'] is False

    def test_generates_story_with_data(self, client, sample_air_quality):
        """Story generation should succeed when data exists."""
        resp = client.post(
            '/api/stories/generate',
            json={'pollution_type': 'aqi', 'days': 365},
            content_type='application/json',
        )
        assert resp.status_code == 201
        body = resp.get_json()
        assert body['success'] is True
        story = body['data']
        assert 'id' in story
        assert 'title' in story
        assert 'content' in story
        assert 'key_insights' in story
        assert 'recommendations' in story

    def test_generated_story_appears_in_list(self, client, sample_air_quality, app, db):
        client.post(
            '/api/stories/generate',
            json={'pollution_type': 'pm25', 'days': 365},
            content_type='application/json',
        )
        resp = client.get('/api/stories/')
        assert resp.get_json()['total'] >= 1

        # Cleanup stories created during this test
        with app.app_context():
            from app.models import DataStory
            db.session.query(DataStory).delete()
            db.session.commit()


class TestGetStoryEndpoint:
    def test_returns_404_for_missing_story(self, client):
        resp = client.get('/api/stories/99999')
        assert resp.status_code == 404
        assert resp.get_json()['success'] is False

    def test_returns_story_by_id(self, client, sample_air_quality, app, db):
        create_resp = client.post(
            '/api/stories/generate',
            json={'pollution_type': 'aqi', 'days': 365},
            content_type='application/json',
        )
        story_id = create_resp.get_json()['data']['id']

        resp = client.get(f'/api/stories/{story_id}')
        assert resp.status_code == 200
        body = resp.get_json()
        assert body['success'] is True
        assert body['data']['id'] == story_id

        # Cleanup
        with app.app_context():
            from app.models import DataStory
            db.session.query(DataStory).delete()
            db.session.commit()
