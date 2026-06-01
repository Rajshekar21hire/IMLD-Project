from app import db
from datetime import datetime

class AirQualityData(db.Model):
    """Model for air quality data points"""
    __tablename__ = 'air_quality_data'
    
    id = db.Column(db.Integer, primary_key=True)
    country = db.Column(db.String(100), nullable=False, index=True)
    city = db.Column(db.String(100), nullable=False, index=True)
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    
    # Pollution metrics
    pm25 = db.Column(db.Float)  # PM2.5 in µg/m³
    pm10 = db.Column(db.Float)  # PM10 in µg/m³
    o3 = db.Column(db.Float)    # Ozone in ppb
    no2 = db.Column(db.Float)   # Nitrogen Dioxide in ppb
    so2 = db.Column(db.Float)   # Sulfur Dioxide in ppb
    co = db.Column(db.Float)    # Carbon Monoxide in ppm
    
    # Air Quality Index
    aqi = db.Column(db.Float)   # Air Quality Index
    aqi_category = db.Column(db.String(50))  # Good, Moderate, Unhealthy, etc.
    
    # Timestamp
    measurement_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Health impact
    health_impact = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'country': self.country,
            'city': self.city,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'pm25': self.pm25,
            'pm10': self.pm10,
            'o3': self.o3,
            'no2': self.no2,
            'so2': self.so2,
            'co': self.co,
            'aqi': self.aqi,
            'aqi_category': self.aqi_category,
            'measurement_date': self.measurement_date.isoformat(),
            'health_impact': self.health_impact
        }
