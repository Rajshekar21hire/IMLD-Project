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
    CORS(app, resources={r"/api/*": {"origins": os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')}})
    
    # Register blueprints
    from app.routes import data_routes, story_routes, rating_routes
    app.register_blueprint(data_routes.bp)
    app.register_blueprint(story_routes.bp)
    app.register_blueprint(rating_routes.bp)
    
    # Create tables
    with app.app_context():
        db.create_all()
    
    return app
