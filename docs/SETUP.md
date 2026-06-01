# Setup & Installation Guide

## System Requirements

- **OS**: Windows, macOS, or Linux
- **Python**: 3.8 or higher
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **RAM**: 2GB minimum
- **Disk Space**: 1GB minimum

## Step-by-Step Installation

### Prerequisites Check

```bash
# Check Python version
python --version  # Should be 3.8+

# Check Node version
node --version   # Should be 16.x+

# Check npm version
npm --version    # Should be 8.x+
```

### Backend Installation

#### 1. Navigate to Backend Directory
```bash
cd backend
```

#### 2. Create Virtual Environment
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

#### 4. Configure Environment
```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings (using your preferred editor)
```

**Edit .env file with these values:**
```
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-change-this
DATABASE_URL=sqlite:///air_quality_portal.db
OPENAI_API_KEY=your-openai-key-here
CORS_ORIGINS=http://localhost:3000
```

#### 5. Initialize Database
```bash
# Database will be created automatically on first run
# Or manually create it with:
python -c "from app import create_app; app = create_app()"
```

### Frontend Installation

#### 1. Navigate to Frontend Directory
```bash
cd frontend
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Configure Environment
```bash
# Create .env file
echo REACT_APP_API_URL=http://localhost:5000/api > .env
```

Or create `.env` manually with:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Docker Setup (Optional)

If you prefer Docker, create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=development
      - FLASK_DEBUG=True
    volumes:
      - ./backend:/app

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    environment:
      - REACT_APP_API_URL=http://localhost:5000/api

  database:
    image: postgres:14
    environment:
      - POSTGRES_DB=air_quality
      - POSTGRES_USER=air_user
      - POSTGRES_PASSWORD=change_me
    ports:
      - "5432:5432"
```

Then run:
```bash
docker-compose up
```

## Running the Application

### Terminal 1: Start Backend Server

```bash
cd backend

# Activate virtual environment if not already active
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Run Flask server
python run.py
```

Output should show:
```
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### Terminal 2: Start Frontend Server

```bash
cd frontend

# Start development server
npm start
```

The browser should automatically open at `http://localhost:3000`

If not, manually visit: http://localhost:3000

## Verification

### Backend Verification

```bash
# Test API is running
curl http://localhost:5000/api/data/countries

# Expected response: {"success": true, "data": []}
# (empty list on first run, will populate after adding sample data)
```

### Frontend Verification

1. Open browser at http://localhost:3000
2. You should see the AirStory home page
3. Navigate to Dashboard
4. Click "Add Sample Data" button
5. Click "Generate Data Story" to test

## Adding Sample Data

Two methods to add sample data:

### Method 1: Via Frontend
1. Go to Dashboard
2. Click "Add Sample Data" button
3. Wait for confirmation

### Method 2: Via API
```bash
curl -X POST http://localhost:5000/api/data/sample-data
```

## Troubleshooting Installation

### Python Issues

```bash
# ModuleNotFoundError: No module named 'flask'
# Solution: Ensure virtual environment is activated
source venv/bin/activate  # macOS/Linux
venv\Scripts\activate      # Windows

# Solution: Reinstall requirements
pip install -r requirements.txt

# Permission denied (macOS/Linux)
chmod +x run.py
python run.py
```

### Node/npm Issues

```bash
# npm ERR! code ERESOLVE
# Solution: Clear npm cache
npm cache clean --force
npm install

# Module not found errors
# Solution: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Database Issues

```bash
# Database locked error
# Solution: Delete database and recreate
rm backend/air_quality_portal.db
python run.py

# Migration errors with PostgreSQL
# Solution: Ensure PostgreSQL is running
psql -U postgres  # Test connection
```

### Port Already in Use

```bash
# Backend port 5000 already in use
# macOS/Linux:
lsof -ti:5000 | xargs kill -9

# Windows (PowerShell as Admin):
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process

# Alternative: Change port in backend/run.py
app.run(debug=True, host='0.0.0.0', port=5001)  # Change 5000 to 5001
```

## Performance Optimization

### Backend Optimization

```python
# In backend/app/__init__.py, add caching
from flask_caching import Cache

cache = Cache(app, config={'CACHE_TYPE': 'simple'})

# Add query optimization
# Index frequently queried columns (already done in migration)
```

### Frontend Optimization

```javascript
// In frontend/.env
# Enable production optimizations
GENERATE_SOURCEMAP=false
```

```bash
# Build optimized production bundle
npm run build
```

## SSL/TLS Setup for Production

```bash
# Generate self-signed certificate (development only)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# Update backend to use HTTPS
# In backend/run.py:
# app.run(ssl_context=('cert.pem', 'key.pem'))
```

## Next Steps

1. Add sample data using the frontend
2. Generate your first data story
3. Rate and provide feedback
4. Explore different filter combinations
5. Read the [Architecture Guide](./ARCHITECTURE.md) for more details
6. Check [API Documentation](./API.md) for endpoint details

## Support

For issues during installation:

1. Check troubleshooting section above
2. Review error messages carefully
3. Check that all prerequisites are installed
4. Consult [FAQ](./FAQ.md) for common issues
5. Open an issue on the repository

---

**Happy storytelling! 🎉**
