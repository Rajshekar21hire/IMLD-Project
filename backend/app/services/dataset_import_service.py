import csv
import os
from datetime import datetime

from app import db
from app.models import AirQualityData


class DatasetImportService:
    """Import air-quality readings from a local CSV dataset."""

    MONTH_LOOKUP = {
        'january': 1,
        'february': 2,
        'march': 3,
        'april': 4,
        'may': 5,
        'june': 6,
        'july': 7,
        'august': 8,
        'september': 9,
        'october': 10,
        'november': 11,
        'december': 12,
    }

    @classmethod
    def import_csv_if_empty(cls, csv_path):
        """Populate the database from the CSV if no air-quality rows exist yet."""
        if not csv_path or not os.path.exists(csv_path):
            return 0

        existing_count = AirQualityData.query.count()
        if existing_count > 0:
            return 0

        imported_count = 0
        with open(csv_path, 'r', encoding='utf-8-sig', newline='') as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                air_quality_row = cls._build_model(row)
                if air_quality_row is None:
                    continue
                db.session.add(air_quality_row)
                imported_count += 1

        db.session.commit()
        return imported_count

    @classmethod
    def _build_model(cls, row):
        """Convert a CSV record into an AirQualityData model."""
        country = (row.get('Country') or '').strip()
        city = (row.get('City') or '').strip()
        year = cls._to_int(row.get('Year'))
        month = cls._month_to_number(row.get('Month'))

        if not country or not city or year is None or month is None:
            return None

        pm25 = cls._to_float(row.get('pm25'))
        pm10 = cls._to_float(row.get('pm10'))
        o3 = cls._to_float(row.get('o3'))
        no2 = cls._to_float(row.get('no2'))
        so2 = cls._to_float(row.get('so2'))
        co = cls._to_float(row.get('co'))

        aqi = cls._estimate_aqi(pm25=pm25, pm10=pm10, no2=no2, o3=o3, so2=so2, co=co)
        aqi_category = cls._aqi_category(aqi)

        return AirQualityData(
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
            measurement_date=datetime(year, month, 1),
            health_impact=f'Air quality is {aqi_category.lower()}',
        )

    @staticmethod
    def _to_float(value):
        try:
            if value is None or str(value).strip() == '':
                return None
            return float(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _to_int(value):
        try:
            if value is None or str(value).strip() == '':
                return None
            return int(float(value))
        except (TypeError, ValueError):
            return None

    @classmethod
    def _month_to_number(cls, value):
        if value is None:
            return None

        cleaned = str(value).strip().lower()
        if cleaned.isdigit():
            number = int(cleaned)
            return number if 1 <= number <= 12 else None

        return cls.MONTH_LOOKUP.get(cleaned)

    @staticmethod
    def _estimate_aqi(pm25=None, pm10=None, no2=None, o3=None, so2=None, co=None):
        """Create a usable AQI proxy from the pollutant columns in the CSV."""
        candidates = []

        if pm25 is not None:
            candidates.append(pm25 * 2.0)
        if pm10 is not None:
            candidates.append(pm10)
        if no2 is not None:
            candidates.append(no2 * 1.5)
        if o3 is not None:
            candidates.append(o3 * 1.2)
        if so2 is not None:
            candidates.append(so2 * 2.0)
        if co is not None:
            candidates.append(co * 10.0)

        return round(max(candidates), 2) if candidates else None

    @staticmethod
    def _aqi_category(aqi):
        if aqi is None:
            return 'Unknown'
        if aqi <= 50:
            return 'Good'
        if aqi <= 100:
            return 'Moderate'
        if aqi <= 150:
            return 'Unhealthy for Sensitive Groups'
        if aqi <= 200:
            return 'Unhealthy'
        if aqi <= 300:
            return 'Very Unhealthy'
        return 'Hazardous'