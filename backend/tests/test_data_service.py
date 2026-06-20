"""
Unit tests for DataService pure methods.
These tests use simple mock objects and require no database or Flask app context.
"""
from datetime import datetime
from unittest.mock import MagicMock

from app.services.data_service import DataService


def make_record(**kwargs):
    """Build a minimal mock AirQualityData record."""
    r = MagicMock()
    r.pm25 = kwargs.get('pm25')
    r.pm10 = kwargs.get('pm10')
    r.o3 = kwargs.get('o3')
    r.no2 = kwargs.get('no2')
    r.so2 = kwargs.get('so2')
    r.co = kwargs.get('co')
    r.aqi = kwargs.get('aqi')
    r.aqi_category = kwargs.get('aqi_category')
    r.measurement_date = kwargs.get('measurement_date', datetime(2026, 1, 15))
    return r


class TestGetPollutionStatistics:
    def test_pm25_basic_stats(self):
        data = [make_record(pm25=10.0), make_record(pm25=20.0), make_record(pm25=30.0)]
        stats = DataService.get_pollution_statistics(data, 'pm25')
        assert stats['min'] == 10.0
        assert stats['max'] == 30.0
        assert stats['avg'] == 20.0
        assert stats['count'] == 3

    def test_ignores_none_values(self):
        data = [make_record(pm25=10.0), make_record(pm25=None), make_record(pm25=30.0)]
        stats = DataService.get_pollution_statistics(data, 'pm25')
        assert stats['count'] == 2
        assert stats['avg'] == 20.0

    def test_returns_none_when_all_none(self):
        data = [make_record(pm25=None), make_record(pm25=None)]
        assert DataService.get_pollution_statistics(data, 'pm25') is None

    def test_returns_none_for_empty_list(self):
        assert DataService.get_pollution_statistics([], 'aqi') is None

    def test_single_value(self):
        data = [make_record(aqi=75.0)]
        stats = DataService.get_pollution_statistics(data, 'aqi')
        assert stats['min'] == stats['max'] == stats['avg'] == 75.0
        assert stats['count'] == 1

    def test_all_pollution_types_are_handled(self):
        for ptype in ('pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi'):
            data = [make_record(**{ptype: 42.0})]
            stats = DataService.get_pollution_statistics(data, ptype)
            assert stats is not None, f"Expected stats for {ptype}"
            assert stats['avg'] == 42.0

    def test_unknown_type_returns_none(self):
        data = [make_record(pm25=10.0)]
        assert DataService.get_pollution_statistics(data, 'unknown') is None


class TestGetAqiDistribution:
    def test_counts_categories(self):
        data = [
            make_record(aqi_category='Good'),
            make_record(aqi_category='Good'),
            make_record(aqi_category='Moderate'),
        ]
        dist = DataService.get_aqi_distribution(data)
        assert dist['Good'] == 2
        assert dist['Moderate'] == 1

    def test_ignores_none_category(self):
        data = [make_record(aqi_category=None), make_record(aqi_category='Good')]
        dist = DataService.get_aqi_distribution(data)
        assert None not in dist
        assert dist.get('Good') == 1

    def test_empty_list_returns_empty_dict(self):
        assert DataService.get_aqi_distribution([]) == {}

    def test_all_same_category(self):
        data = [make_record(aqi_category='Unhealthy')] * 5
        dist = DataService.get_aqi_distribution(data)
        assert dist == {'Unhealthy': 5}


class TestGetTemporalTrends:
    def test_groups_records_by_date(self):
        data = [
            make_record(pm25=10.0, measurement_date=datetime(2026, 1, 1)),
            make_record(pm25=20.0, measurement_date=datetime(2026, 1, 1)),
            make_record(pm25=30.0, measurement_date=datetime(2026, 1, 2)),
        ]
        trends = DataService.get_temporal_trends(data)
        assert '2026-01-01' in trends
        assert '2026-01-02' in trends

    def test_averages_values_within_a_day(self):
        data = [
            make_record(pm25=10.0, measurement_date=datetime(2026, 1, 1)),
            make_record(pm25=20.0, measurement_date=datetime(2026, 1, 1)),
        ]
        trends = DataService.get_temporal_trends(data)
        assert trends['2026-01-01']['pm25'] == 15.0

    def test_none_for_missing_pollutant_in_period(self):
        data = [make_record(pm25=None, measurement_date=datetime(2026, 1, 1))]
        trends = DataService.get_temporal_trends(data)
        assert trends['2026-01-01']['pm25'] is None

    def test_empty_list_returns_empty_dict(self):
        assert DataService.get_temporal_trends([]) == {}

    def test_all_pollutant_keys_present_per_date(self):
        data = [make_record(pm25=5.0, measurement_date=datetime(2026, 1, 1))]
        trends = DataService.get_temporal_trends(data)
        for key in ('pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi'):
            assert key in trends['2026-01-01']
