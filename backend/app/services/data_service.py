from calendar import monthrange
from datetime import datetime, timedelta
from app.models import AirQualityData
from app import db

class DataService:
    """Service for fetching and processing air quality data"""

    @staticmethod
    def get_data_by_filters(
        country=None,
        city=None,
        pollution_type=None,
        days=None,
        start_date=None,
        end_date=None,
        period_unit=None,
        period_value=None,
    ):
        """
        Fetch air quality data with optional filters

        Args:
            country: Filter by country
            city: Filter by city
            pollution_type: Filter by pollution type (pm25, pm10, o3, etc.)
            days: Number of days to look back (legacy, used if start_date/end_date not provided)
            start_date: Start date for range (datetime object or ISO string)
            end_date: End date for range (datetime object or ISO string)
            period_unit: Optional time unit for relative filters (days, months, years)
            period_value: Optional numeric value for the selected time unit
        """
        query = AirQualityData.query

        # Apply filters
        if country:
            query = query.filter_by(country=country)
        if city:
            query = query.filter_by(city=city)

        # Time filter - handle both date range and legacy days parameter
        if start_date or end_date:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date)
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date)

            if start_date:
                query = query.filter(AirQualityData.measurement_date >= start_date)
            if end_date:
                query = query.filter(AirQualityData.measurement_date <= end_date)
        else:
            # Relative period filter: preserve legacy days input but allow months and years.
            unit = (period_unit or 'days').strip().lower() if period_unit else 'days'
            value = period_value if period_value is not None else days
            value = int(value or 30)
            cutoff_date = DataService._subtract_period(datetime.utcnow(), unit, value)
            query = query.filter(AirQualityData.measurement_date >= cutoff_date)

        return query.order_by(AirQualityData.measurement_date.desc()).all()

    @staticmethod
    def _subtract_period(reference_date, unit, value):
        """Subtract a relative time period from a datetime."""
        if unit == 'months':
            year = reference_date.year
            month = reference_date.month - value
            day = reference_date.day
            while month <= 0:
                month += 12
                year -= 1
            day = min(day, monthrange(year, month)[1])
            return reference_date.replace(year=year, month=month, day=day)
        if unit == 'years':
            year = reference_date.year - value
            month = reference_date.month
            day = min(reference_date.day, monthrange(year, month)[1])
            return reference_date.replace(year=year, month=month, day=day)
        return reference_date - timedelta(days=value)

    @staticmethod
    def get_countries():
        """Get list of all countries with data"""
        return db.session.query(AirQualityData.country).distinct().all()

    @staticmethod
    def get_cities(country=None):
        """Get list of cities, optionally filtered by country"""
        query = db.session.query(AirQualityData.city, AirQualityData.country).distinct()
        if country:
            query = query.filter_by(country=country)
        return query.all()

    @staticmethod
    def get_date_range():
        """Get the date range available in the database"""
        min_date = db.session.query(db.func.min(AirQualityData.measurement_date)).scalar()
        max_date = db.session.query(db.func.max(AirQualityData.measurement_date)).scalar()
        return {'min_date': min_date, 'max_date': max_date}

    @staticmethod
    def get_pollution_statistics(data_list, pollution_type):
        """Calculate statistics for a specific pollution type"""
        values = []

        if pollution_type == 'pm25':
            values = [d.pm25 for d in data_list if d.pm25 is not None]
        elif pollution_type == 'pm10':
            values = [d.pm10 for d in data_list if d.pm10 is not None]
        elif pollution_type == 'o3':
            values = [d.o3 for d in data_list if d.o3 is not None]
        elif pollution_type == 'no2':
            values = [d.no2 for d in data_list if d.no2 is not None]
        elif pollution_type == 'so2':
            values = [d.so2 for d in data_list if d.so2 is not None]
        elif pollution_type == 'co':
            values = [d.co for d in data_list if d.co is not None]
        elif pollution_type == 'aqi':
            values = [d.aqi for d in data_list if d.aqi is not None]

        if not values:
            return None

        return {
            'min': min(values),
            'max': max(values),
            'avg': sum(values) / len(values),
            'count': len(values)
        }

    @staticmethod
    def get_aqi_distribution(data_list):
        """Get distribution of AQI categories"""
        distribution = {}
        for data in data_list:
            if data.aqi_category:
                distribution[data.aqi_category] = distribution.get(data.aqi_category, 0) + 1
        return distribution

    @staticmethod
    def get_temporal_trends(data_list):
        """Get temporal trends in data"""
        trends = {}
        for data in data_list:
            date_key = data.measurement_date.strftime('%Y-%m-%d')
            if date_key not in trends:
                trends[date_key] = {
                    'pm25': [],
                    'pm10': [],
                    'o3': [],
                    'no2': [],
                    'so2': [],
                    'co': [],
                    'aqi': []
                }
            if data.pm25:
                trends[date_key]['pm25'].append(data.pm25)
            if data.pm10:
                trends[date_key]['pm10'].append(data.pm10)
            if data.o3:
                trends[date_key]['o3'].append(data.o3)
            if data.no2:
                trends[date_key]['no2'].append(data.no2)
            if data.so2:
                trends[date_key]['so2'].append(data.so2)
            if data.co:
                trends[date_key]['co'].append(data.co)
            if data.aqi:
                trends[date_key]['aqi'].append(data.aqi)

        # Calculate averages
        for date_key in trends:
            for pollution_type in trends[date_key]:
                if trends[date_key][pollution_type]:
                    values = trends[date_key][pollution_type]
                    trends[date_key][pollution_type] = sum(values) / len(values)
                else:
                    trends[date_key][pollution_type] = None

        return trends
