from app import db
from datetime import datetime

class CachedNarrative(db.Model):
    """Stores AI-generated narrative payloads so repeat requests for the same
    parameters (e.g. same ranking_type/count, or same deep-dive mode) skip the
    Ollama call entirely instead of regenerating identical text."""
    __tablename__ = 'cached_narratives'

    id = db.Column(db.Integer, primary_key=True)
    cache_key = db.Column(db.String(100), unique=True, nullable=False, index=True)
    payload = db.Column(db.JSON, nullable=False)
    provider = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
