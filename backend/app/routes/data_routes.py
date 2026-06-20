from flask import Blueprint, jsonify, request
from app.services.data_service import DataService
from app.services.worst_cities_service import WorstCitiesService
from app.models import AirQualityData
from app import db

bp = Blueprint('data', __name__, url_prefix='/api/data')
worst_cities_service = WorstCitiesService()

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
        days = request.args.get('days', default=30, type=int)
        limit = request.args.get('limit', default=100, type=int)
        
        data_list = DataService.get_data_by_filters(country, city, None, days)[:limit]
        data_dict = [d.to_dict() for d in data_list]
        
        return jsonify({'success': True, 'data': data_dict, 'count': len(data_dict)})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/statistics', methods=['GET'])
def get_statistics():
    """Get statistics for specific pollution type"""
    try:
        country = request.args.get('country')
        city = request.args.get('city')
        pollution_type = request.args.get('pollution_type', default='aqi')
        days = request.args.get('days', default=30, type=int)
        
        data_list = DataService.get_data_by_filters(country, city, pollution_type, days)
        
        if not data_list:
            return jsonify({'success': False, 'error': 'No data available'}), 404
        
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

@bp.route('/worst-cities', methods=['GET'])
def get_worst_cities():
    """Rank the worst cities from the available air quality data."""
    try:
        country = request.args.get('country')
        city = request.args.get('city')
        days = request.args.get('days', default=30, type=int)
        limit = request.args.get('limit', type=int)

        analysis, error = worst_cities_service.get_top_worst_cities(
            country=country,
            city=city,
            days=days,
            limit=limit,
        )

        if error:
            return jsonify({'success': False, 'error': error}), 404

        return jsonify({'success': True, 'data': analysis})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/worst-cities/analyze', methods=['POST'])
def analyze_worst_cities():
    """Interpret a user prompt and return prompt-driven ranked city analysis."""
    try:
        data = request.get_json() or {}
        prompt = data.get('prompt', '')
        country = data.get('country')
        city = data.get('city')
        days = data.get('days', 30)
        limit = data.get('limit')

        analysis, error = worst_cities_service.analyze_prompt(
            prompt=prompt,
            country=country,
            city=city,
            days=days,
            limit=limit,
        )

        if error:
            return jsonify({'success': False, 'error': error}), 404

        return jsonify({'success': True, 'data': analysis}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/sample-data', methods=['POST'])
def add_sample_data():
    """Add sample air quality data (for demo purposes)"""
    try:
        from datetime import datetime, timedelta
        import random
        
        countries = ['India', 'China', 'USA', 'Indonesia', 'Pakistan']
        cities_map = {
            'India': ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata'],
            'China': ['Beijing', 'Shanghai', 'Chongqing', 'Xi\'an', 'Chengdu'],
            'USA': ['Los Angeles', 'New York', 'Chicago', 'Houston', 'Phoenix'],
            'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang'],
            'Pakistan': ['Lahore', 'Karachi', 'Islamabad', 'Faisalabad', 'Multan']
        }
        
        aqi_categories = ['Good', 'Moderate', 'Unhealthy for Sensitive Groups', 'Unhealthy', 'Very Unhealthy']
        
        # Generate data for past 30 days
        for day in range(30):
            date = datetime.utcnow() - timedelta(days=day)
            for country in countries:
                for city in cities_map[country]:
                    # Random but somewhat realistic values
                    pm25 = random.uniform(15, 150)
                    pm10 = random.uniform(30, 250)
                    o3 = random.uniform(20, 80)
                    no2 = random.uniform(15, 100)
                    so2 = random.uniform(10, 80)
                    co = random.uniform(0.5, 5)
                    aqi = random.uniform(20, 300)
                    aqi_cat = random.choice(aqi_categories)
                    
                    data = AirQualityData(
                        country=country,
                        city=city,
                        latitude=random.uniform(-90, 90),
                        longitude=random.uniform(-180, 180),
                        pm25=pm25,
                        pm10=pm10,
                        o3=o3,
                        no2=no2,
                        so2=so2,
                        co=co,
                        aqi=aqi,
                        aqi_category=aqi_cat,
                        measurement_date=date,
                        health_impact=f"Air quality is {aqi_cat.lower()}"
                    )
                    db.session.add(data)
        
        db.session.commit()
        return jsonify({'success': True, 'message': 'Sample data added successfully'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
