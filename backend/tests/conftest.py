import os
import sys
import pytest
from unittest.mock import patch, MagicMock

# anthropic is not installed in the dev venv — stub it out so the app imports cleanly
sys.modules.setdefault('anthropic', MagicMock())


@pytest.fixture(scope='session')
def app():
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

    # Patch CSV auto-load so tests start with a clean, empty DB
    with patch('app._load_csv_data'):
        from app import create_app, db as database
        application = create_app()

    application.config['TESTING'] = True

    with application.app_context():
        database.drop_all()
        database.create_all()
        yield application
        database.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    from app import db as database
    return database


@pytest.fixture
def sample_air_quality(app, db):
    """Seed a small set of known air quality records and clean up after."""
    from app.models import AirQualityData
    from datetime import datetime, timedelta

    # Use a recent date so records fall within the default 30-day filter window
    recent = datetime.utcnow() - timedelta(days=1)

    records = [
        AirQualityData(
            country='India', city='Delhi',
            pm25=85.0, pm10=120.0, aqi=180.0, aqi_category='Unhealthy',
            measurement_date=recent,
            health_impact='Air quality is unhealthy'
        ),
        AirQualityData(
            country='India', city='Mumbai',
            pm25=45.0, pm10=65.0, aqi=120.0,
            aqi_category='Unhealthy for Sensitive Groups',
            measurement_date=recent,
            health_impact='Air quality is unhealthy for sensitive groups'
        ),
        AirQualityData(
            country='USA', city='New York',
            pm25=12.0, pm10=20.0, aqi=50.0, aqi_category='Good',
            measurement_date=recent,
            health_impact='Air quality is good'
        ),
    ]

    with app.app_context():
        for r in records:
            db.session.add(r)
        db.session.commit()

        yield records

        db.session.query(AirQualityData).delete()
        db.session.commit()
