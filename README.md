# AirStory - AI Data Storytelling Portal for Air Quality Analysis

An intelligent, interactive web portal that transforms air quality data into compelling narratives through AI-powered storytelling. Users can explore air quality patterns, understand pollution impacts, and discover solutions through richly visualized and interactive data stories.

## 🌍 Features

### Core Features
- **AI-Powered Story Generation**: Intelligent agent that generates narrative-driven insights from air quality data
- **Interactive Filtering**: Filter data by country, city, and pollution type
- **Rich Visualizations**: Interactive charts and graphs showing pollution trends and patterns
- **User Rating System**: Rate and provide feedback on generated stories
- **Metadata Display**: View comprehensive statistics and key insights
- **Health Impact Information**: Understand how different pollutants affect public health
- **Solutions & Recommendations**: Get actionable solutions for pollution reduction

### Supported Pollution Types
- PM2.5 (Fine Particulate Matter)
- PM10 (Coarse Particulate Matter)
- Ozone (O3)
- Nitrogen Dioxide (NO2)
- Sulfur Dioxide (SO2)
- Carbon Monoxide (CO)
- Air Quality Index (AQI)

## 🏗️ Project Architecture

### Backend (Flask + Python)
```
backend/
├── app/
│   ├── models/          # Database models (AirQualityData, DataStory, StoryRating)
│   ├── routes/          # API routes (data, stories, ratings)
│   ├── services/        # Business logic (DataService, StoryService)
│   ├── agents/          # AI agent for story generation
│   └── utils/           # Utility functions
├── run.py              # Main application entry point
├── requirements.txt    # Python dependencies
└── .env.example        # Environment configuration template
```

### Frontend (React + TypeScript)
```
frontend/
├── public/             # Static assets
├── src/
│   ├── components/     # React components (FilterComponent, StoryDisplay, RatingModal, etc.)
│   ├── pages/          # Page components (HomePage, DashboardPage)
│   ├── services/       # API client service
│   ├── hooks/          # Custom React hooks (useFilters)
│   ├── types/          # TypeScript type definitions
│   ├── styles/         # CSS styles and Tailwind config
│   ├── App.tsx         # Main App component
│   └── index.tsx       # React entry point
├── package.json        # NPM dependencies
└── tailwind.config.js  # Tailwind CSS configuration
```

## 🛠️ Technology Stack

### Backend
- **Framework**: Flask 2.3.3
- **Database**: SQLAlchemy with SQLite (default)
- **AI/ML**: LangChain, OpenAI API
- **Data Processing**: Pandas, NumPy
- **Server**: Gunicorn

### Frontend
- **Framework**: React 18.2
- **Language**: TypeScript 5.1
- **Styling**: Tailwind CSS 3.3
- **Visualization**: Recharts, Plotly.js
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Routing**: React Router v6

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- Git

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd IMLD\ Project
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env and set:
# - SECRET_KEY
# - DATABASE_URL (optional, defaults to SQLite)
# - OPENAI_API_KEY (if using AI features)
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Configure environment variables
# Edit .env and set:
# - REACT_APP_API_URL=http://localhost:5000/api
```

## 📖 Usage

### Starting the Backend Server

```bash
cd backend

# Activate virtual environment if not already active
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Run Flask server
python run.py
```

The server will start at `http://localhost:5000`

### Starting the Frontend Development Server

```bash
cd frontend

# Start React dev server
npm start
```

The application will open at `http://localhost:3000`

### Using the Portal

1. **Home Page**: View features and introduction
2. **Dashboard**: 
   - Select country and city filters
   - Choose pollution type to analyze
   - Set time period (7, 14, 30, 60, or 90 days)
   - Click "Generate Data Story" to create an AI-powered narrative
3. **View Story**: Read the generated story with:
   - Executive summary
   - Key insights
   - Detailed analysis
   - Temporal trends
   - Health implications
   - Solutions and recommendations
4. **Visualizations**: View interactive charts showing:
   - Pollution trends over time
   - AQI category distribution
   - Statistical analysis
5. **Rate Stories**: Provide feedback through:
   - Overall rating (1-5 stars)
   - Detailed ratings (Story Quality, Accuracy, Clarity, Usefulness)
   - Written feedback
   - Optional email for follow-up

## 🔌 API Endpoints

### Data Endpoints
- `GET /api/data/countries` - Get list of all countries
- `GET /api/data/cities?country=<country>` - Get cities by country
- `GET /api/data/filter` - Get filtered air quality data
- `GET /api/data/statistics` - Get pollution statistics
- `POST /api/data/sample-data` - Add sample data (demo)

### Story Endpoints
- `POST /api/stories/generate` - Generate new story
- `GET /api/stories/<id>` - Get specific story
- `GET /api/stories` - List stories with filters
- `GET /api/stories/<id>/visualizations` - Get visualization configs

### Rating Endpoints
- `POST /api/ratings/story/<id>` - Add rating to story
- `GET /api/ratings/story/<id>` - Get story ratings

## 📊 Database Schema

### AirQualityData
- id, country, city, latitude, longitude
- Pollution metrics: pm25, pm10, o3, no2, so2, co
- aqi, aqi_category, measurement_date
- health_impact

### DataStory
- id, title, content, summary
- Filters: country, city, pollution_type
- Metadata: key_insights, recommendations, visualizations
- Statistics: data_points_analyzed, time_period
- Timestamps: created_at, updated_at

### StoryRating
- id, story_id, rating (1-5)
- Detailed ratings: story_quality, accuracy, clarity, usefulness
- feedback, user_email, created_at

## 🤖 AI Story Generation

The Story Agent analyzes air quality data and generates narratives including:

1. **Introduction**: Context and period analysis
2. **Current Situation**: Key statistics and status
3. **Trends Analysis**: Changes over time
4. **Health Implications**: Specific to pollution type
5. **AQI Distribution**: Category breakdown
6. **Recommendations**: Solutions for pollution reduction

## 📝 Configuration

### Backend (.env)
```
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=sqlite:///air_quality_portal.db
OPENAI_API_KEY=your-api-key
CORS_ORIGINS=http://localhost:3000
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## 🧪 Adding Sample Data

The application includes an endpoint to add sample data for testing:

```bash
curl -X POST http://localhost:5000/api/data/sample-data
```

This generates 30 days of air quality data for 5 countries and 5 cities each.

## 🐛 Troubleshooting

### Port Already in Use
- Change port in `backend/run.py` or `frontend/package.json`
- Kill process: `lsof -ti:5000` (macOS/Linux) or `netstat -ano | findstr :5000` (Windows)

### CORS Issues
- Ensure CORS_ORIGINS in backend .env includes frontend URL
- Check browser console for exact error

### Database Errors
- Delete existing database: `rm backend/air_quality_portal.db`
- Let Flask create new database on startup

### API Connection Issues
- Verify both servers are running
- Check REACT_APP_API_URL in frontend .env
- Check backend logs for errors

## 📚 API Documentation

For detailed API documentation, visit `/api/docs` (if Swagger enabled)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/YourFeature`
2. Commit changes: `git commit -m 'Add YourFeature'`
3. Push to branch: `git push origin feature/YourFeature`
4. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🙋 Support & Contact

For issues or questions, please open an issue on the repository or contact the development team.

## 🎯 Future Enhancements

- [ ] Real-time data integration with air quality APIs
- [ ] Advanced ML models for pollution prediction
- [ ] User accounts and story history
- [ ] Email notifications for pollution alerts
- [ ] Mobile app version
- [ ] Multi-language support
- [ ] Export reports as PDF
- [ ] Social sharing features
- [ ] Community insights and comparisons
- [ ] Data caching and optimization

## 📊 Project Status

**Status**: Active Development
**Version**: 1.0.0
**Last Updated**: May 16, 2026

---

**AirStory** - Making air quality data accessible and actionable through AI-powered storytelling.
