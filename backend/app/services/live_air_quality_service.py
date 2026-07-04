from functools import lru_cache
from datetime import datetime, timezone

from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

import requests

from app import db
from app.models import AirQualityData


class LiveAirQualityService:
    """Fetch live air-quality readings from Open-Meteo with DB fallback."""

    GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'
    AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
    REQUEST_TIMEOUT = 10
    CACHE_TTL_SECONDS = 45
    MAX_WORKERS = 8
    _cache = {}
    _cache_lock = Lock()

    @staticmethod
    def _aqi_category(us_aqi):
        if us_aqi is None:
            return 'Unknown'
        if us_aqi <= 50:
            return 'Good'
        if us_aqi <= 100:
            return 'Moderate'
        if us_aqi <= 150:
            return 'Unhealthy for Sensitive Groups'
        if us_aqi <= 200:
            return 'Unhealthy'
        if us_aqi <= 300:
            return 'Very Unhealthy'
        return 'Hazardous'

    @staticmethod
    @lru_cache(maxsize=512)
    def _geocode_location(city, country):
        """Resolve a city name to coordinates.

        The query is cached because the realtime dashboard polls repeatedly.
        """
        search_terms = [f'{city}, {country}', f'{city}']

        for term in search_terms:
            response = requests.get(
                LiveAirQualityService.GEOCODING_URL,
                params={'name': term, 'count': 1, 'format': 'json'},
                timeout=LiveAirQualityService.REQUEST_TIMEOUT,
            )
            response.raise_for_status()
            payload = response.json()
            results = payload.get('results') or []
            if not results:
                continue

            if country:
                for result in results:
                    if (result.get('country') or '').lower() == country.lower():
                        return result

            return results[0]

        return None

    @staticmethod
    def _fetch_live_reading(location):
        """Fetch the current air quality reading for a single location."""
        response = requests.get(
            LiveAirQualityService.AIR_QUALITY_URL,
            params={
                'latitude': location['latitude'],
                'longitude': location['longitude'],
                'current': ','.join([
                    'pm10',
                    'pm2_5',
                    'carbon_monoxide',
                    'nitrogen_dioxide',
                    'sulphur_dioxide',
                    'ozone',
                    'us_aqi',
                ]),
                'timezone': 'auto',
            },
            timeout=LiveAirQualityService.REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        return response.json()

    @staticmethod
    def _cache_key(country, city):
        return f'{(country or "").strip().lower()}::{(city or "").strip().lower()}'

    @classmethod
    def _get_cached_live_reading(cls, country, city):
        cache_key = cls._cache_key(country, city)
        with cls._cache_lock:
            entry = cls._cache.get(cache_key)
            if not entry:
                return None
            cached_at, payload = entry
            age = (datetime.now(timezone.utc) - cached_at).total_seconds()
            if age > cls.CACHE_TTL_SECONDS:
                cls._cache.pop(cache_key, None)
                return None
            return payload

    @classmethod
    def _set_cached_live_reading(cls, country, city, payload):
        cache_key = cls._cache_key(country, city)
        with cls._cache_lock:
            cls._cache[cache_key] = (datetime.now(timezone.utc), payload)

    @staticmethod
    def _latest_database_reading(country, city):
        query = AirQualityData.query.filter_by(country=country, city=city)
        return query.order_by(AirQualityData.measurement_date.desc()).first()

    @staticmethod
    def _reading_to_payload(record, source='database', source_label='Historical database fallback'):
        units = {
            'pm25': 'µg/m³',
            'pm10': 'µg/m³',
            'o3': 'µg/m³',
            'no2': 'µg/m³',
            'so2': 'µg/m³',
            'co': 'mg/m³',
        }

        return {
            'country': record.country,
            'city': record.city,
            'latitude': record.latitude,
            'longitude': record.longitude,
            'pm25': record.pm25,
            'pm10': record.pm10,
            'o3': record.o3,
            'no2': record.no2,
            'so2': record.so2,
            'co': record.co,
            'aqi': record.aqi,
            'aqi_category': record.aqi_category or LiveAirQualityService._aqi_category(record.aqi),
            'measurement_date': record.measurement_date.isoformat() if record.measurement_date else datetime.now(timezone.utc).isoformat(),
            'health_impact': record.health_impact,
            'source': source,
            'source_label': source_label,
            'units': units,
        }

    @staticmethod
    def _live_payload_from_response(country, city, location, payload):
        current = payload.get('current') or {}
        current_units = payload.get('current_units') or {}
        timestamp = current.get('time') or datetime.now(timezone.utc).isoformat()
        us_aqi = current.get('us_aqi')

        record = AirQualityData(
            country=country,
            city=city,
            latitude=location.get('latitude'),
            longitude=location.get('longitude'),
            pm25=current.get('pm2_5'),
            pm10=current.get('pm10'),
            o3=current.get('ozone'),
            no2=current.get('nitrogen_dioxide'),
            so2=current.get('sulphur_dioxide'),
            co=current.get('carbon_monoxide'),
            aqi=us_aqi,
            aqi_category=LiveAirQualityService._aqi_category(us_aqi),
            measurement_date=datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
            health_impact=f"Air quality is {LiveAirQualityService._aqi_category(us_aqi).lower()}",
        )

        return {
            'country': record.country,
            'city': record.city,
            'latitude': record.latitude,
            'longitude': record.longitude,
            'pm25': record.pm25,
            'pm10': record.pm10,
            'o3': record.o3,
            'no2': record.no2,
            'so2': record.so2,
            'co': record.co,
            'aqi': record.aqi,
            'aqi_category': record.aqi_category,
            'measurement_date': record.measurement_date.isoformat(),
            'health_impact': record.health_impact,
            'source': 'open-meteo',
            'source_label': 'Live Open-Meteo readings',
            'units': {
                'pm25': current_units.get('pm2_5') or 'µg/m³',
                'pm10': current_units.get('pm10') or 'µg/m³',
                'o3': current_units.get('ozone') or 'µg/m³',
                'no2': current_units.get('nitrogen_dioxide') or 'µg/m³',
                'so2': current_units.get('sulphur_dioxide') or 'µg/m³',
                'co': current_units.get('carbon_monoxide') or 'µg/m³',
            },
        }

    @staticmethod
    def get_live_readings(country=None, cities=None):
        """Return live readings for the requested locations.

        If Open-Meteo cannot resolve a location or returns an error, the
        service falls back to the latest stored database value for that city.
        """
        MAX_LOCATIONS = 25

        if cities:
            locations = []
            for city in cities:
                query = db.session.query(AirQualityData.city, AirQualityData.country).distinct()
                if country:
                    query = query.filter_by(country=country)
                query = query.filter(AirQualityData.city == city)
                result = query.first()
                if result:
                    locations.append({'city': result[0], 'country': result[1]})
            if not locations and country:
                query = db.session.query(AirQualityData.city, AirQualityData.country).distinct()
                query = query.filter_by(country=country)
                locations = [{'city': row[0], 'country': row[1]} for row in query.limit(MAX_LOCATIONS).all()]
        else:
            query = db.session.query(AirQualityData.city, AirQualityData.country).distinct()
            if country:
                query = query.filter_by(country=country)
            locations = [{'city': row[0], 'country': row[1]} for row in query.limit(MAX_LOCATIONS).all()]

        readings = []
        warnings = []

        db_fallbacks = {}
        for location in locations:
            fallback = LiveAirQualityService._latest_database_reading(location['country'], location['city'])
            if fallback:
                db_fallbacks[LiveAirQualityService._cache_key(location['country'], location['city'])] = fallback

        def resolve_location(location):
            city = location['city']
            loc_country = location['country']

            cached = LiveAirQualityService._get_cached_live_reading(loc_country, city)
            if cached:
                return cached, None

            try:
                geocoded = LiveAirQualityService._geocode_location(city, loc_country)
                if geocoded:
                    live_payload = LiveAirQualityService._fetch_live_reading(geocoded)
                    payload = LiveAirQualityService._live_payload_from_response(
                        loc_country,
                        city,
                        geocoded,
                        live_payload,
                    )
                    LiveAirQualityService._set_cached_live_reading(loc_country, city, payload)
                    return payload, None
                return None, f'No live coordinates found for {city}, {loc_country}'
            except Exception as exc:
                fallback = db_fallbacks.get(LiveAirQualityService._cache_key(loc_country, city))
                if fallback:
                    return LiveAirQualityService._reading_to_payload(fallback), f'Live lookup failed for {city}, {loc_country}: {exc}'
                return None, f'Live lookup failed for {city}, {loc_country}: {exc}'

        with ThreadPoolExecutor(max_workers=min(LiveAirQualityService.MAX_WORKERS, max(1, len(locations)))) as executor:
            future_map = {executor.submit(resolve_location, location): location for location in locations}

            for future in as_completed(future_map):
                payload, warning = future.result()
                if payload:
                    readings.append(payload)
                if warning:
                    warnings.append(warning)

        return readings, warnings
