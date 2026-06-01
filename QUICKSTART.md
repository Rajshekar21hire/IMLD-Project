# 🚀 Quick Start Guide

## Welcome to AirStory!

Your AI-powered air quality storytelling portal is ready to use. Follow these simple steps to get started.

## 5-Minute Quick Start

### Step 1: Backend Setup (2 minutes)
```bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env file (copy example)
cp .env.example .env

# Start server
python run.py
```

**Expected Output:**
```
* Serving Flask app 'app'
* Debug mode: on
* Running on http://127.0.0.1:5000
```

### Step 2: Frontend Setup (2 minutes)
```bash
# Open new terminal/tab
cd frontend

npm install
npm start
```

**Expected Output:**
- Browser opens automatically to http://localhost:3000
- You see the AirStory home page

### Step 3: Add Sample Data & Generate Story (1 minute)
1. Click "Dashboard" in navigation
2. Click "Add Sample Data" button
3. Select filters:
   - **Country**: India
   - **City**: Delhi
   - **Pollution Type**: PM2.5 (Fine Particulate)
   - **Time Period**: Last 30 days
4. Click "Generate Data Story"
5. Watch your AI-powered story appear!

## What You Can Do

✅ **Generate Stories**: Create AI-powered narratives from air quality data
✅ **Filter Data**: By country, city, and pollution type
✅ **View Visualizations**: Interactive charts and trends
✅ **Rate Stories**: Provide feedback (1-5 stars + comments)
✅ **Explore Insights**: See key findings and health impacts
✅ **Discover Solutions**: Get recommendations for pollution reduction

## Key Features

### Dashboard Features
- **Interactive Filters**: Select country, city, pollution type, time range
- **Story Generation**: One-click AI story creation
- **Rich Visualizations**: Trend charts and distribution graphs
- **Rating System**: 5-star ratings with detailed feedback
- **Export Data**: View raw data behind stories

### Story Includes
- Executive summary
- Current air quality status
- Temporal trend analysis
- Health impact information
- Solutions and recommendations
- Statistical analysis

## API Endpoints

### Data
- `GET /api/data/countries` - List countries
- `GET /api/data/cities` - List cities
- `GET /api/data/filter` - Get air quality data
- `GET /api/data/statistics` - Statistical analysis

### Stories
- `POST /api/stories/generate` - Generate new story
- `GET /api/stories` - List stories
- `GET /api/stories/<id>` - Get specific story

### Ratings
- `POST /api/ratings/story/<id>` - Add rating
- `GET /api/ratings/story/<id>` - Get ratings

## Customization

### Change Database
Edit `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost/air_quality
```

### Change API URL
Edit `frontend/.env`:
```
REACT_APP_API_URL=https://api.example.com
```

### Add Real Data
Replace sample data with real air quality data:
1. Prepare CSV with columns: country, city, pm25, pm10, o3, no2, so2, co, aqi, aqi_category
2. Use DataService to load data
3. Generate stories from real data

## Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is in use
# Windows:
netstat -ano | findstr :5000

# macOS/Linux:
lsof -ti:5000

# Kill process if needed, or change port in run.py
```

### Frontend errors
```bash
# Clear npm cache
npm cache clean --force
npm install
npm start
```

### Database issues
```bash
# Delete and recreate database
rm backend/air_quality_portal.db
python run.py
```

## Environment Variables

### Backend (.env)
```
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///air_quality_portal.db
OPENAI_API_KEY=sk-xxxx  # Optional, for advanced AI features
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Next Steps

1. **Explore Different Filters**: Try different countries, cities, and pollution types
2. **Rate Stories**: Help improve the system with your feedback
3. **Understand Data**: Read health impact sections to learn about pollution
4. **Integrate Real Data**: Connect to air quality data APIs
5. **Deploy**: Follow [DEPLOYMENT.md](./docs/DEPLOYMENT.md) for production setup

## Production Deployment

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for deployment guidelines:
- Docker containerization
- PostgreSQL database
- Nginx reverse proxy
- SSL/TLS certificates
- Load balancing

## Learning Resources

- [Complete README](./README.md) - Full project documentation
- [Architecture Guide](./docs/ARCHITECTURE.md) - Technical architecture
- [API Documentation](./docs/API.md) - All API endpoints
- [Setup Guide](./docs/SETUP.md) - Detailed installation

## Support

For issues or questions:
1. Check [SETUP.md](./docs/SETUP.md) troubleshooting section
2. Review [API.md](./docs/API.md) for endpoint details
3. Check browser console for frontend errors
4. Check terminal for backend errors

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend | Flask 2.3 |
| Database | SQLite (SQLAlchemy ORM) |
| AI/ML | Story Agent (extensible) |

## File Structure

```
IMLD Project/
├── backend/                 # Flask API
│   ├── app/
│   │   ├── models/         # Database models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── agents/         # AI story generation
│   ├── requirements.txt
│   ├── run.py
│   └── .env.example
│
├── frontend/               # React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   ├── types/         # TypeScript types
│   │   └── styles/        # Styling
│   ├── package.json
│   └── .env.example
│
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   └── API.md
│
└── README.md              # Main documentation
```

## Key Commands

```bash
# Backend
cd backend && source venv/bin/activate && python run.py

# Frontend
cd frontend && npm start

# Add sample data
curl -X POST http://localhost:5000/api/data/sample-data

# Get countries
curl http://localhost:5000/api/data/countries

# Generate story
curl -X POST http://localhost:5000/api/stories/generate \
  -H "Content-Type: application/json" \
  -d '{"country":"India","city":"Delhi","pollution_type":"pm25","days":30}'
```

---

**Happy Storytelling! 🌍📊✨**

*AirStory - Making air quality data accessible through AI-powered narratives*
