from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os
from dotenv import load_dotenv

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
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001')
    cors_origins = [origin.strip() for origin in cors_origins.split(',') if origin.strip()]
    cors_origins.extend([
        r'^https?://localhost(:\d+)?$',
        r'^https?://127\.0\.0\.1(:\d+)?$',
        r'^https?://10\.\d+\.\d+\.\d+(:\d+)?$',
        r'^https?://172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+(:\d+)?$',
        r'^https?://192\.168\.\d+\.\d+(:\d+)?$',
    ])
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})
    
    # Register blueprints
    from app.routes import data_routes, story_routes, rating_routes
    app.register_blueprint(data_routes.bp)
    app.register_blueprint(story_routes.bp)
    app.register_blueprint(rating_routes.bp)
    
    # Create tables
    with app.app_context():
        db.create_all()

        dataset_path = os.getenv(
            'DATASET_CSV_PATH',
            os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'waqi-airquality-master-dataset.csv'),
        )

        if os.path.exists(dataset_path):
            from app.services.dataset_import_service import DatasetImportService

            DatasetImportService.import_csv_if_empty(dataset_path)
    
    return app
