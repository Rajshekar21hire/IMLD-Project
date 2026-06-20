#!/usr/bin/env python
"""Main entry point for the Flask application"""

import os

from app import create_app

if __name__ == '__main__':
    app = create_app()
    debug_enabled = os.getenv('FLASK_DEBUG', 'true').strip().lower() in {'1', 'true', 'yes', 'on'}
    app.run(debug=debug_enabled, use_reloader=False, host='0.0.0.0', port=5000)
