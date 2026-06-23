from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv
from sqlalchemy import inspect, text

load_dotenv()

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///air_quality_portal.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001').split(',')}})
    
    # Register blueprints
    from app.routes import data_routes, story_routes, rating_routes, chat_routes
    app.register_blueprint(data_routes.bp)
    app.register_blueprint(story_routes.bp)
    app.register_blueprint(rating_routes.bp)
    app.register_blueprint(chat_routes.bp)
    
    # Create tables
    with app.app_context():
        db.create_all()
        _ensure_table_schema()

        # Auto-load CSV data if database is empty
        from app.models import AirQualityData
        if AirQualityData.query.count() == 0:
            _load_csv_data(app)

    return app


def _ensure_table_schema():
    """Backfill missing columns for older SQLite databases.

    Flask-SQLAlchemy's ``create_all`` will create missing tables, but it does
    not alter existing ones. This syncs the live database to the current model
    definitions for the story tables.
    """
    from app.models import DataStory, StoryRating

    _ensure_model_columns(DataStory)
    _ensure_model_columns(StoryRating)


def _ensure_model_columns(model):
    """Add any columns that exist in the model but not in the database."""
    inspector = inspect(db.engine)
    table_name = model.__tablename__
    if table_name not in inspector.get_table_names():
        return

    existing_columns = {column['name'] for column in inspector.get_columns(table_name)}
    missing_columns = []

    for column in model.__table__.columns:
        if column.name in existing_columns:
            continue
        if column.primary_key:
            continue

        column_type = column.type.compile(dialect=db.engine.dialect)
        missing_columns.append(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}")

    if not missing_columns:
        return

    with db.engine.begin() as connection:
        for statement in missing_columns:
            connection.execute(text(statement))

def _load_csv_data(app):
    """Load air quality data from CSV file on startup"""
    import csv
    from datetime import datetime
    from calendar import monthrange
    from app.models import AirQualityData

    csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'waqi-airquality-master-dataset.csv')

    if not os.path.exists(csv_path):
        print(f"Warning: CSV file not found at {csv_path}")
        return

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

    def calculate_aqi(pm25_value):
        if pm25_value is None:
            return None
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

    try:
        rows_added = 0
        skipped = 0
        with open(csv_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.DictReader(file)
            for idx, row in enumerate(csv_reader):
                try:
                    country = row.get('Country', '').strip()
                    city = row.get('City', '').strip()

                    if not country or not city:
                        skipped += 1
                        continue

                    year = int(row.get('Year', '2014'))
                    month_str = row.get('Month', '1').strip()
                    if not month_str:
                        month = 1
                    else:
                        # Handle month name or number
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

                    pm25 = float(row.get('pm25')) if row.get('pm25') and row.get('pm25').strip() else None
                    pm10 = float(row.get('pm10')) if row.get('pm10') and row.get('pm10').strip() else None
                    o3 = float(row.get('o3')) if row.get('o3') and row.get('o3').strip() else None
                    no2 = float(row.get('no2')) if row.get('no2') and row.get('no2').strip() else None
                    so2 = float(row.get('so2')) if row.get('so2') and row.get('so2').strip() else None
                    co = float(row.get('co')) if row.get('co') and row.get('co').strip() else None

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

                    if rows_added % 100 == 0:
                        db.session.commit()
                except ValueError as ve:
                    skipped += 1
                    if idx < 5:
                        print(f"  Row {idx} parse error: {str(ve)}")
                    continue
                except Exception as row_error:
                    skipped += 1
                    if idx < 5:
                        print(f"  Row {idx} error: {str(row_error)}")
                    continue

        db.session.commit()
        print(f"✓ CSV data loaded: {rows_added} records added ({skipped} skipped)")
    except Exception as e:
        db.session.rollback()
        print(f"✗ Error loading CSV data: {str(e)}")
