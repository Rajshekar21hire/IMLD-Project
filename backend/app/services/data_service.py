from calendar import monthrange
from datetime import datetime, timedelta
import csv
import os
from app.models import AirQualityData
from app import db
import numpy as np
from sqlalchemy import func
from sqlalchemy.sql import extract

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
            # Use the dataset's max date as the reference so that historical datasets
            # work correctly regardless of the current system date.
            max_date = db.session.query(func.max(AirQualityData.measurement_date)).scalar()
            reference_date = max_date if max_date else datetime.utcnow()
            cutoff_date = DataService._subtract_period(reference_date, unit, value)
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

    @staticmethod
    def get_yearly_pollutant_trends(start_year=2015, end_year=2026, country=None):
        """Return yearly averages for key pollutants between start_year and end_year.

        Use the CSV source if the database contains incomplete or suspicious yearly coverage.
        """
        data = DataService._get_yearly_trends_from_db(start_year, end_year, country)
        years_with_values = [
            i
            for i, year in enumerate(data['years'])
            if any(
                data[pollutant][i] is not None
                for pollutant in ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']
            )
        ]

        if len(years_with_values) >= 3:
            return data

        return DataService._get_yearly_trends_from_csv(start_year, end_year, country)

    @staticmethod
    def _get_yearly_trends_from_db(start_year=2015, end_year=2026, country=None):
        results = (
            db.session.query(
                extract('year', AirQualityData.measurement_date).label('year'),
                func.avg(AirQualityData.pm25).label('pm25'),
                func.avg(AirQualityData.pm10).label('pm10'),
                func.avg(AirQualityData.o3).label('o3'),
                func.avg(AirQualityData.no2).label('no2'),
                func.avg(AirQualityData.so2).label('so2'),
                func.avg(AirQualityData.co).label('co'),
            )
            .filter(AirQualityData.measurement_date >= datetime(start_year, 1, 1))
            .filter(AirQualityData.measurement_date <= datetime(end_year, 12, 31))
        )

        if country:
            results = results.filter(AirQualityData.country == country)

        results = results.group_by('year').order_by('year').all()

        yearly = {int(r.year): {
            'pm25': float(r.pm25) if r.pm25 is not None else None,
            'pm10': float(r.pm10) if r.pm10 is not None else None,
            'o3': float(r.o3) if r.o3 is not None else None,
            'no2': float(r.no2) if r.no2 is not None else None,
            'so2': float(r.so2) if r.so2 is not None else None,
            'co': float(r.co) if r.co is not None else None,
        } for r in results}

        out = {
            'years': [],
            'pm25': [],
            'pm10': [],
            'o3': [],
            'no2': [],
            'so2': [],
            'co': [],
        }
        for y in range(start_year, end_year + 1):
            out['years'].append(y)
            vals = yearly.get(y, {})
            out['pm25'].append(vals.get('pm25'))
            out['pm10'].append(vals.get('pm10'))
            out['o3'].append(vals.get('o3'))
            out['no2'].append(vals.get('no2'))
            out['so2'].append(vals.get('so2'))
            out['co'].append(vals.get('co'))

        return out

    @staticmethod
    def _get_yearly_trends_from_csv(start_year=2015, end_year=2026, country=None):
        csv_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'waqi-airquality-master-dataset.csv')
        csv_path = os.path.normpath(csv_path)
        if not os.path.exists(csv_path):
            return {
                'years': list(range(start_year, end_year + 1)),
                'pm25': [None] * (end_year - start_year + 1),
                'pm10': [None] * (end_year - start_year + 1),
                'o3': [None] * (end_year - start_year + 1),
                'no2': [None] * (end_year - start_year + 1),
                'so2': [None] * (end_year - start_year + 1),
                'co': [None] * (end_year - start_year + 1),
            }

        aggregates = {y: {'pm25': [], 'pm10': [], 'o3': [], 'no2': [], 'so2': [], 'co': []} for y in range(start_year, end_year + 1)}
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    year = int(row.get('Year', '').strip())
                except Exception:
                    continue
                if year < start_year or year > end_year:
                    continue
                if country and row.get('Country', '').strip() != country:
                    continue

                for pollutant in ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co']:
                    raw = row.get(pollutant)
                    if raw and raw.strip():
                        try:
                            value = float(raw)
                            aggregates[year][pollutant].append(value)
                        except ValueError:
                            continue

        out = {
            'years': [],
            'pm25': [],
            'pm10': [],
            'o3': [],
            'no2': [],
            'so2': [],
            'co': [],
        }
        for y in range(start_year, end_year + 1):
            out['years'].append(y)
            year_data = aggregates[y]
            out['pm25'].append(sum(year_data['pm25']) / len(year_data['pm25']) if year_data['pm25'] else None)
            out['pm10'].append(sum(year_data['pm10']) / len(year_data['pm10']) if year_data['pm10'] else None)
            out['o3'].append(sum(year_data['o3']) / len(year_data['o3']) if year_data['o3'] else None)
            out['no2'].append(sum(year_data['no2']) / len(year_data['no2']) if year_data['no2'] else None)
            out['so2'].append(sum(year_data['so2']) / len(year_data['so2']) if year_data['so2'] else None)
            out['co'].append(sum(year_data['co']) / len(year_data['co']) if year_data['co'] else None)
        return out

    @staticmethod
    def _gini(array_like):
        """Compute the Gini coefficient for a 1-D array-like of non-negative numbers."""
        arr = np.array([v for v in array_like if v is not None])
        if arr.size == 0:
            return None
        # Values must be non-negative; shift if necessary
        if (arr < 0).any():
            arr = arr - arr.min()
        arr = arr.astype(float)
        if arr.sum() == 0:
            return 0.0
        arr = np.sort(arr)
        n = arr.size
        index = np.arange(1, n + 1)
        return float(((2 * (index * arr).sum()) - (n + 1) * arr.sum()) / (n * arr.sum()))

    @staticmethod
    def get_pm25_gini_stats(start_year=2015, end_year=2026):
        """Compute PM2.5 Gini index across countries and intra-country statistics for each year.

        Returns dict with per-year country-gini, mean intra-country-gini, and country counts.
        """
        out = {'years': [], 'country_gini': [], 'mean_intra_country_gini': [], 'countries_tracked': []}

        for year in range(start_year, end_year + 1):
            start = datetime(year, 1, 1)
            end = datetime(year, 12, 31)

            # Country-level averages
            country_avgs = (
                db.session.query(
                    AirQualityData.country,
                    func.avg(AirQualityData.pm25).label('avg_pm25')
                )
                .filter(AirQualityData.measurement_date >= start)
                .filter(AirQualityData.measurement_date <= end)
                .filter(AirQualityData.pm25.isnot(None))
                .group_by(AirQualityData.country)
                .all()
            )

            country_vals = [float(r.avg_pm25) for r in country_avgs if r.avg_pm25 is not None]

            country_gini = DataService._gini(country_vals)

            # Intra-country Gini: compute for each country the gini of city averages, then take mean
            intra_ginis = []
            for row in country_avgs:
                country = row.country
                city_avgs = (
                    db.session.query(
                        AirQualityData.city,
                        func.avg(AirQualityData.pm25).label('city_avg')
                    )
                    .filter(AirQualityData.measurement_date >= start)
                    .filter(AirQualityData.measurement_date <= end)
                    .filter(AirQualityData.country == country)
                    .filter(AirQualityData.pm25.isnot(None))
                    .group_by(AirQualityData.city)
                    .all()
                )
                city_vals = [float(c.city_avg) for c in city_avgs if c.city_avg is not None]
                g = DataService._gini(city_vals)
                if g is not None:
                    intra_ginis.append(g)

            mean_intra = float(np.mean(intra_ginis)) if intra_ginis else None

            out['years'].append(year)
            out['country_gini'].append(country_gini)
            out['mean_intra_country_gini'].append(mean_intra)
            out['countries_tracked'].append(len(country_vals))

        return out
