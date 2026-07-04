import json
import re
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request
from app.services.data_service import DataService
from app.services.chat_provider_service import ChatProviderService
from app.services.live_air_quality_service import LiveAirQualityService
from app.models import AirQualityData
from app import db

bp = Blueprint('data', __name__, url_prefix='/api/data')
chat_provider_service = ChatProviderService()


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


def _format_location_label(country, city):
    location_parts = [part for part in [city, country] if part]
    return ', '.join(location_parts) if location_parts else 'the selected dataset'


def _format_sample_records(data_list, selected_pollutants, limit=5):
    if not data_list:
        return 'No records available.'

    compact_rows = []
    for record in data_list[:limit]:
        row_parts = [
            f"date={record.measurement_date.strftime('%Y-%m-%d') if record.measurement_date else 'unknown'}",
            f"country={record.country}",
            f"city={record.city}",
        ]
        for pollutant in selected_pollutants:
            value = getattr(record, pollutant, None)
            if value is not None:
                row_parts.append(f"{pollutant}={value}")
        row_parts.append(f"aqi={record.aqi}" if record.aqi is not None else "aqi=unknown")
        compact_rows.append("- " + ', '.join(row_parts))

    return '\n'.join(compact_rows)


def _build_fallback_summary(country, city, pollution_type, selected_pollutants, stats_map, data_count, aqi_dist):
    location = _format_location_label(country, city)
    main_stats = stats_map.get(pollution_type) or {}
    main_avg = main_stats.get('avg')
    main_min = main_stats.get('min')
    main_max = main_stats.get('max')
    distribution_bits = ', '.join(
        f"{category}: {count}"
        for category, count in sorted(aqi_dist.items(), key=lambda item: item[0])
    ) or 'no AQI distribution data'

    if main_avg is None:
        summary = f"No usable readings were found for {location}."
    else:
        summary = (
            f"The filtered CSV-backed air-quality data for {location} contains {data_count} records. "
            f"{pollution_type.upper()} averages {main_avg:.2f} with a range from {main_min:.2f} to {main_max:.2f}."
        )

    highlights = [
        f"Records analysed: {data_count}",
        f"Primary metric: {pollution_type.upper()}",
        f"AQI distribution: {distribution_bits}",
    ]

    if len(selected_pollutants) > 1:
        highlights.append(f"Compared pollutants: {', '.join(p.upper() for p in selected_pollutants)}")

    return {
        'summary': summary,
        'highlights': highlights,
        'risks': [
            'Check for spikes in the highest readings when planning interventions.',
            'Use the chart trends below to verify whether the pattern is improving or worsening.',
        ],
        'recommendations': [
            'Review the filter selection and compare nearby cities or longer time windows.',
            'Combine the summary with the trend and AQI charts below to confirm the overall pattern.',
        ],
        'overall_assessment': 'fallback-summary',
    }


def _build_analytics_prompt(country, city, pollution_type, selected_pollutants, period_unit, period_value, start_date, end_date, data_list, stats_map, aqi_dist, trends):
    location_label = _format_location_label(country, city)
    selected_pollutant_labels = ', '.join(p.upper() for p in selected_pollutants)
    time_window_label = f"{period_value} {period_unit}" if period_value else 'not specified'
    trend_preview = []

    for date_key in sorted(trends.keys())[:4]:
        values = trends[date_key]
        preview_bits = [f"{key}={values.get(key)}" for key in selected_pollutants if values.get(key) is not None]
        if values.get('aqi') is not None:
            preview_bits.append(f"aqi={values.get('aqi')}")
        if preview_bits:
            trend_preview.append(f"- {date_key}: " + ', '.join(preview_bits))

    prompt = f"""
You are analyzing CSV-backed air-quality data for a dashboard.
Use only the provided data. Do not invent facts.
Return valid JSON only with this exact shape:
{{
  "summary": "2-4 sentences explaining the selected data",
  "highlights": ["...", "...", "..."],
  "risks": ["...", "..."],
  "recommendations": ["...", "..."],
  "overall_assessment": "brief label such as improving, stable, worsening, or mixed"
}}

Rules:
- Keep the summary concise and grounded in the selected filters.
- Mention the selected location and time window.
- Focus on the primary pollutant, but compare the selected pollutants when compare mode is enabled.
- Tie the observations to the charts and AQI distribution when relevant.
- No markdown fences and no extra keys.

Selected filters:
- Location: {location_label}
- Pollution type: {pollution_type.upper()}
- Compare pollutants: {selected_pollutant_labels}
- Time window: {time_window_label}
- Start date: {start_date or 'not specified'}
- End date: {end_date or 'not specified'}
- Records: {len(data_list)}

Statistics by pollutant:
{chr(10).join(
    f"- {pollutant.upper()}: avg={stats.get('avg'):.2f}, min={stats.get('min'):.2f}, max={stats.get('max'):.2f}, count={stats.get('count')}"
    for pollutant, stats in stats_map.items()
    if stats
)}

AQI distribution:
{chr(10).join(f"- {category}: {count}" for category, count in sorted(aqi_dist.items(), key=lambda item: item[0])) or '- No AQI distribution available'}

Trend preview:
{chr(10).join(trend_preview) or '- No trend preview available'}

Sample rows:
{_format_sample_records(data_list, selected_pollutants)}
"""
    return prompt

@bp.route('/countries', methods=['GET'])
def get_countries():
    """Get list of all countries"""
    try:
        countries = db.session.query(AirQualityData.country).distinct().all()
        country_list = [c[0] for c in countries if c[0]]
        return jsonify({'success': True, 'data': sorted(country_list)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/cities', methods=['GET'])
def get_cities():
    """Get list of cities, optionally filtered by country"""
    try:
        country = request.args.get('country')
        query = db.session.query(AirQualityData.city, AirQualityData.country).distinct()
        
        if country:
            query = query.filter(AirQualityData.country == country)
        
        cities = query.all()
        city_list = [{'city': c[0], 'country': c[1]} for c in cities if c[0]]
        
        return jsonify({'success': True, 'data': city_list})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/filter', methods=['GET'])
def filter_data():
    """Get filtered air quality data"""
    try:
        country = request.args.get('country')
        city = request.args.get('city')
        days = request.args.get('days', default=None, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', default=100, type=int)

        data_list = DataService.get_data_by_filters(
            country, city, None, days=days,
            start_date=start_date, end_date=end_date
        )[:limit]
        data_dict = [d.to_dict() for d in data_list]

        return jsonify({'success': True, 'data': data_dict, 'count': len(data_dict)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/date-range', methods=['GET'])
def get_date_range():
    """Get the available date range in the database"""
    try:
        date_range = DataService.get_date_range()
        return jsonify({'success': True, 'data': {
            'min_date': date_range['min_date'].isoformat() if date_range['min_date'] else None,
            'max_date': date_range['max_date'].isoformat() if date_range['max_date'] else None
        }})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get statistics for specific pollution type"""
    try:
        country = request.args.get('country')
        city = request.args.get('city')
        pollution_type = request.args.get('pollution_type', default='aqi')
        days = request.args.get('days', default=None, type=int)
        period_unit = request.args.get('period_unit', default='days')
        period_value = request.args.get('period_value', default=None, type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        data_list = DataService.get_data_by_filters(
            country, city, pollution_type, days=days,
            start_date=start_date, end_date=end_date,
            period_unit=period_unit, period_value=period_value
        )

        if not data_list:
            return jsonify({'success': False, 'error': 'No data available for the selected filters'}), 200

        stats = DataService.get_pollution_statistics(data_list, pollution_type)
        aqi_dist = DataService.get_aqi_distribution(data_list)
        trends = DataService.get_temporal_trends(data_list)

        return jsonify({
            'success': True,
            'statistics': stats,
            'aqi_distribution': aqi_dist,
            'trends': trends
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/summary', methods=['POST'])
def get_analytics_summary():
    """Generate an Ollama summary for filtered CSV-backed analytics data."""
    try:
        payload = request.get_json(silent=True) or {}
        country = payload.get('country')
        city = payload.get('city')
        pollution_type = payload.get('pollution_type', 'aqi')
        selected_pollutants = payload.get('selected_pollutants') or [pollution_type]
        compare_mode = bool(payload.get('compare_mode', False))
        days = payload.get('days')
        period_unit = payload.get('period_unit', 'days')
        period_value = payload.get('period_value')
        start_date = payload.get('start_date')
        end_date = payload.get('end_date')

        if isinstance(days, str) and days.strip():
            try:
                days = int(days)
            except ValueError:
                return jsonify({'success': False, 'error': 'days must be an integer'}), 400
        elif days in ('', None):
            days = None

        if isinstance(selected_pollutants, str):
            selected_pollutants = [item.strip() for item in selected_pollutants.split(',') if item.strip()]
        selected_pollutants = [item for item in selected_pollutants if item] or [pollution_type]
        if pollution_type not in selected_pollutants:
            selected_pollutants.insert(0, pollution_type)

        data_list = DataService.get_data_by_filters(
            country, city, pollution_type, days=days,
            start_date=start_date, end_date=end_date,
            period_unit=period_unit, period_value=period_value
        )

        if not data_list:
            return jsonify({'success': False, 'error': 'No data available for the selected filters'}), 200

        stats_map = {}
        for pollutant in sorted(set(selected_pollutants)):
            stats = DataService.get_pollution_statistics(data_list, pollutant)
            if stats:
                stats_map[pollutant] = stats

        aqi_dist = DataService.get_aqi_distribution(data_list)
        trends = DataService.get_temporal_trends(data_list)

        prompt = _build_analytics_prompt(
            country=country,
            city=city,
            pollution_type=pollution_type,
            selected_pollutants=selected_pollutants,
            period_unit=period_unit,
            period_value=period_value,
            start_date=start_date,
            end_date=end_date,
            data_list=data_list,
            stats_map=stats_map,
            aqi_dist=aqi_dist,
            trends=trends,
        )

        provider_used = 'ollama'
        model_used = chat_provider_service.story_ollama_model
        parsed = None

        try:
            response_text, provider_used = chat_provider_service.generate_local_answer(
                prompt,
                model=model_used,
                num_predict=450,
                timeout_seconds=chat_provider_service.story_timeout_seconds,
            )
            parsed = _safe_json_loads(response_text)
        except Exception:
            provider_used = 'fallback'

        fallback = _build_fallback_summary(
            country=country,
            city=city,
            pollution_type=pollution_type,
            selected_pollutants=selected_pollutants,
            stats_map=stats_map,
            data_count=len(data_list),
            aqi_dist=aqi_dist,
        )

        summary_payload = {
            'summary': (parsed or {}).get('summary') or fallback['summary'],
            'highlights': (parsed or {}).get('highlights') or fallback['highlights'],
            'risks': (parsed or {}).get('risks') or fallback['risks'],
            'recommendations': (parsed or {}).get('recommendations') or fallback['recommendations'],
            'overall_assessment': (parsed or {}).get('overall_assessment') or fallback['overall_assessment'],
        }

        return jsonify({
            'success': True,
            'data': {
                'provider': provider_used,
                'model': model_used if provider_used != 'fallback' else 'rules',
                'filters': {
                    'country': country,
                    'city': city,
                    'pollution_type': pollution_type,
                    'selected_pollutants': selected_pollutants,
                    'compare_mode': compare_mode,
                    'days': days,
                    'period_unit': period_unit,
                    'period_value': period_value,
                    'start_date': start_date,
                    'end_date': end_date,
                },
                'record_count': len(data_list),
                'summary': summary_payload,
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/live', methods=['GET'])
def get_live_readings():
    """Get live air-quality readings from Open-Meteo with DB fallback."""
    try:
        country = request.args.get('country')
        cities_param = request.args.get('cities', default='', type=str).strip()
        cities = [city.strip() for city in cities_param.split(',') if city.strip()] if cities_param else None

        readings, warnings = LiveAirQualityService.get_live_readings(country=country, cities=cities)

        if not readings:
            return jsonify({
                'success': False,
                'error': 'No locations available for live readings',
                'warnings': warnings,
            }), 404

        live_count = sum(1 for reading in readings if reading.get('source') == 'open-meteo')
        source_label = 'Live Open-Meteo readings'
        if live_count != len(readings):
            source_label = 'Live Open-Meteo readings with historical fallback'

        return jsonify({
            'success': True,
            'data': readings,
            'count': len(readings),
            'source': source_label,
            'generated_at': datetime.now(timezone.utc).isoformat(),
            'warnings': warnings,
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/world-aqi', methods=['GET'])
def get_world_aqi():
    """Get average AQI per country for world map visualization."""
    try:
        from sqlalchemy import func

        def _aqi_category(aqi):
            if aqi is None: return 'Unknown'
            if aqi <= 50: return 'Good'
            if aqi <= 100: return 'Moderate'
            if aqi <= 150: return 'Unhealthy for Sensitive Groups'
            if aqi <= 200: return 'Unhealthy'
            if aqi <= 300: return 'Very Unhealthy'
            return 'Hazardous'

        results = (
            db.session.query(
                AirQualityData.country,
                func.avg(AirQualityData.aqi).label('avg_aqi'),
                func.count(AirQualityData.id).label('record_count'),
            )
            .filter(AirQualityData.aqi.isnot(None))
            .group_by(AirQualityData.country)
            .all()
        )

        data = [
            {
                'country': row.country,
                'avg_aqi': round(row.avg_aqi, 1),
                'record_count': row.record_count,
                'aqi_category': _aqi_category(row.avg_aqi),
            }
            for row in results
            if row.country
        ]

        return jsonify({'success': True, 'data': data, 'count': len(data)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# City name aliases not present (or present under a different spelling) in geonamescache.
_CITY_NAME_ALIASES = {
    ('gifu-shi', 'jp'): 'gifu',
    ('mecca', 'sa'): 'makkah',
    ('mysore', 'in'): 'mysuru',
    ('nur-sultan', 'kz'): 'astana',
    ('odessa', 'ua'): 'odesa',
    ('taitung city', 'tw'): 'taitung',
    ('washington d.c.', 'us'): 'washington',
    ('zanjān', 'ir'): 'zanjan',
    ('zaporizhia', 'ua'): 'zaporizhzhya',
    ('kryvyi rih', 'ua'): 'kryvyy rih',
}

# Manual coordinates for cities absent from geonamescache entirely.
_CITY_COORD_OVERRIDES = {
    ('kamianske', 'ua'): (48.5111, 34.6017),
    ('petaẖ tiqwa', 'il'): (32.0917, 34.8872),
}


def _build_city_coord_lookup():
    """Build a (lowercase city name, lowercase ISO-2 country) -> (lat, lon) lookup."""
    import geonamescache
    gc = geonamescache.GeonamesCache()
    lookup = {}
    for c in gc.get_cities().values():
        key = (c['name'].lower(), c['countrycode'].lower())
        lookup[key] = (c['latitude'], c['longitude'])
    return lookup


_CITY_COORD_LOOKUP = None


def _city_coordinates(city, country):
    global _CITY_COORD_LOOKUP
    if _CITY_COORD_LOOKUP is None:
        _CITY_COORD_LOOKUP = _build_city_coord_lookup()

    city_key = city.strip().lower()
    country_key = (country or '').strip().lower()
    city_key = _CITY_NAME_ALIASES.get((city_key, country_key), city_key)

    if (city_key, country_key) in _CITY_COORD_OVERRIDES:
        return _CITY_COORD_OVERRIDES[(city_key, country_key)]
    return _CITY_COORD_LOOKUP.get((city_key, country_key))


@bp.route('/cities-aqi', methods=['GET'])
def get_cities_aqi():
    """Get average AQI per city with latitude/longitude for map markers."""
    try:
        from sqlalchemy import func

        def _aqi_category(aqi):
            if aqi is None: return 'Unknown'
            if aqi <= 50: return 'Good'
            if aqi <= 100: return 'Moderate'
            if aqi <= 150: return 'Unhealthy for Sensitive Groups'
            if aqi <= 200: return 'Unhealthy'
            if aqi <= 300: return 'Very Unhealthy'
            return 'Hazardous'

        results = (
            db.session.query(
                AirQualityData.city,
                AirQualityData.country,
                func.avg(AirQualityData.aqi).label('avg_aqi'),
                func.count(AirQualityData.id).label('record_count'),
            )
            .filter(AirQualityData.aqi.isnot(None))
            .filter(AirQualityData.city.isnot(None))
            .filter(AirQualityData.country.isnot(None))
            .group_by(AirQualityData.city, AirQualityData.country)
            .all()
        )

        data = []
        for row in results:
            coords = _city_coordinates(row.city, row.country)
            if not coords:
                continue
            lat, lon = coords
            data.append({
                'city': row.city,
                'country': row.country,
                'latitude': lat,
                'longitude': lon,
                'avg_aqi': round(row.avg_aqi, 1),
                'record_count': row.record_count,
                'aqi_category': _aqi_category(row.avg_aqi),
            })

        return jsonify({'success': True, 'data': data, 'count': len(data)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/yearly-trends', methods=['GET'])
def get_yearly_trends():
    """Return yearly pollutant trends (2015-2026 by default)."""
    try:
        start_year = int(request.args.get('start_year', 2015))
        end_year = int(request.args.get('end_year', 2026))
        country = request.args.get('country')

        data = DataService.get_yearly_pollutant_trends(start_year=start_year, end_year=end_year, country=country)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/pm25-gini', methods=['GET'])
def get_pm25_gini():
    """Return PM2.5 Gini and intra-country statistics per year."""
    try:
        start_year = int(request.args.get('start_year', 2015))
        end_year = int(request.args.get('end_year', 2026))

        data = DataService.get_pm25_gini_stats(start_year=start_year, end_year=end_year)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@bp.route('/sample-data', methods=['POST'])
def add_sample_data():
    """Load air quality data from CSV file"""
    try:
        import csv
        import os
        from datetime import datetime
        from calendar import monthrange

        # Path to CSV file
        csv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'data', 'waqi-airquality-master-dataset.csv')

        if not os.path.exists(csv_path):
            return jsonify({'success': False, 'error': 'CSV file not found'}), 404

        # AQI category mapping based on AQI values
        def get_aqi_category(pm25_value):
            if pm25_value is None:
                return 'Unknown'
            if pm25_value <= 12:
                return 'Good'
            elif pm25_value <= 35.4:
                return 'Moderate'
            elif pm25_value <= 55.4:
                return 'Unhealthy for Sensitive Groups'
            elif pm25_value <= 150.4:
                return 'Unhealthy'
            else:
                return 'Very Unhealthy'

        # Calculate AQI from PM2.5
        def calculate_aqi(pm25_value):
            if pm25_value is None:
                return None
            # Simple AQI calculation from PM2.5
            if pm25_value <= 12:
                return pm25_value * (50 / 12)
            elif pm25_value <= 35.4:
                return 50 + (pm25_value - 12) * (50 / 23.4)
            elif pm25_value <= 55.4:
                return 100 + (pm25_value - 35.4) * (50 / 20)
            elif pm25_value <= 150.4:
                return 150 + (pm25_value - 55.4) * (50 / 95)
            else:
                return 200 + (pm25_value - 150.4) * (100 / 249.6)

        rows_added = 0
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for row in csv_reader:
                try:
                    country = row.get('Country', '').strip()
                    city = row.get('City', '').strip()

                    if not country or not city:
                        continue

                    # Parse year and month to create date (use last day of month)
                    year = int(row.get('Year', '2014'))
                    month_str = row.get('Month', '1').strip()
                    if not month_str:
                        month = 1
                    else:
                        month_names = ['January', 'February', 'March', 'April', 'May', 'June',
                                      'July', 'August', 'September', 'October', 'November', 'December']
                        if month_str.isdigit():
                            month = int(month_str)
                        else:
                            month = month_names.index(month_str) + 1 if month_str in month_names else 1
                    try:
                        last_day = monthrange(year, month)[1]
                        measurement_date = datetime(year, month, last_day)
                    except Exception:
                        measurement_date = datetime.utcnow()

                    # Parse pollution values
                    pm25 = float(row.get('pm25')) if row.get('pm25') and row.get('pm25').strip() else None
                    pm10 = float(row.get('pm10')) if row.get('pm10') and row.get('pm10').strip() else None
                    o3 = float(row.get('o3')) if row.get('o3') and row.get('o3').strip() else None
                    no2 = float(row.get('no2')) if row.get('no2') and row.get('no2').strip() else None
                    so2 = float(row.get('so2')) if row.get('so2') and row.get('so2').strip() else None
                    co = float(row.get('co')) if row.get('co') and row.get('co').strip() else None

                    # Calculate AQI from PM2.5
                    aqi = calculate_aqi(pm25)
                    aqi_category = get_aqi_category(pm25)

                    data = AirQualityData(
                        country=country,
                        city=city,
                        latitude=None,
                        longitude=None,
                        pm25=pm25,
                        pm10=pm10,
                        o3=o3,
                        no2=no2,
                        so2=so2,
                        co=co,
                        aqi=aqi,
                        aqi_category=aqi_category,
                        measurement_date=measurement_date,
                        health_impact=f"Air quality is {aqi_category.lower()}"
                    )
                    db.session.add(data)
                    rows_added += 1

                    # Commit every 100 rows to avoid memory issues
                    if rows_added % 100 == 0:
                        db.session.commit()
                except Exception as row_error:
                    continue

        db.session.commit()
        return jsonify({'success': True, 'message': f'Data loaded successfully. {rows_added} records added'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
