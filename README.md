# AirStory - AI Data Storytelling Portal for Air Quality Analysis

An intelligent, interactive web portal that transforms air quality data into compelling narratives through AI-powered storytelling. Users can explore air quality patterns, understand pollution impacts, and discover solutions through richly visualized and interactive data stories.

## Features

- **AI-Powered Story Generation** — Narrative-driven insights from air quality data using your choice of AI provider
- **Interactive Chat** — Ask follow-up questions about any generated story
- **Live World Map** — Zoomable map showing real-time air quality data by country
- **Realtime Pollution Feed** — Live pollution readings with auto-refresh
- **Analytics Dashboard** — Trend charts, bar charts, and distribution graphs
- **Interactive Filtering** — Filter by country, city, pollution type, and time range
- **User Rating System** — Rate generated stories with detailed feedback
- **Health Impact Information** — Health implications per pollutant and population group

## AI Providers

The app supports three AI backends. **Ollama is the default** — it runs locally for free with no API key required.

| Provider | Cost | Setup |
|----------|------|-------|
| **Ollama** (default) | Free, runs locally | Install Ollama + pull a model |
| Claude (Anthropic) | API key required | Set `ANTHROPIC_API_KEY` |
| Gemini (Google) | API key required | Set `GEMINI_API_KEY` |

## Prerequisites

- Python 3.8+
- Node.js 16+ and npm
- [Ollama](https://ollama.com/) (for the default local AI — no API key needed)

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd "IMLD Project"
```

### 2. Backend setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Edit .env if needed (defaults work out of the box with Ollama)

# Start the server
python run.py
```

Backend runs at `http://localhost:5000`

### 3. Frontend setup

```bash
# Open a new terminal
cd frontend
npm install
npm start
```

Frontend opens at `http://localhost:3000`

### 4. Pull an Ollama model (first time only)

```bash
ollama pull llama3.2:3b
```

Then click **"Add Sample Data"** on the Dashboard and hit **"Generate Data Story"**.

## Environment Variables

### Backend (`backend/.env`)

```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///air_quality_portal.db
CORS_ORIGINS=http://localhost:3000

# AI provider — choose one:
CHAT_PROVIDER=ollama           # default (free, local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Optional: use Claude instead
# CHAT_PROVIDER=claude
# ANTHROPIC_API_KEY=sk-ant-...

# Optional: use Gemini instead
# CHAT_PROVIDER=gemini
# GEMINI_API_KEY=...
# GEMINI_MODEL=gemini-2.5-flash
```

### Frontend (`frontend/.env`)

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Project Structure

```
IMLD Project/
├── backend/
│   ├── app/
│   │   ├── agents/          # AI agents (StoryAgent, ClaudeAgent)
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes (data, stories, ratings, chat)
│   │   └── services/        # Business logic + AI provider selection
│   ├── run.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/      # FilterComponent, StoryDisplay, ChatWidget, etc.
│       ├── pages/           # HomePage, AnalyticsPage, LiveMapPage, RealtimePollutionPage
│       ├── services/        # API client
│       └── hooks/           # useFilters
└── README.md
```

## API Endpoints

### Data
- `GET /api/data/countries` — list countries
- `GET /api/data/cities?country=<country>` — list cities
- `GET /api/data/filter` — filtered air quality data
- `GET /api/data/statistics` — pollution statistics
- `POST /api/data/sample-data` — seed sample data (demo)

### Stories
- `POST /api/stories/generate` — generate a new story
- `GET /api/stories` — list stories
- `GET /api/stories/<id>` — get a specific story
- `GET /api/stories/<id>/visualizations` — chart configs for a story

### Ratings
- `POST /api/ratings/story/<id>` — rate a story
- `GET /api/ratings/story/<id>` — get ratings for a story

### Chat
- `POST /api/chat/ask` — ask a question about a story
- `GET /api/chat/history/<story_id>` — get conversation history
- `DELETE /api/chat/history/<story_id>` — clear history
- `GET /api/chat/suggestions/<story_id>` — get suggested questions

## Seeding Sample Data

```bash
curl -X POST http://localhost:5000/api/data/sample-data
```

This generates 30 days of air quality data for multiple countries and cities.

## Troubleshooting

**Port already in use**
```bash
# Windows — find and kill process on port 5000:
netstat -ano | findstr :5000
taskkill /PID <pid> /F
```

**Ollama not responding** — make sure Ollama is running (`ollama serve`) and the model is pulled (`ollama pull llama3.2:3b`).

**CORS errors** — verify `CORS_ORIGINS` in `backend/.env` includes `http://localhost:3000`.

**Database errors** — delete `backend/air_quality_portal.db` and restart; Flask recreates it.

**Frontend install issues**
```bash
npm cache clean --force
npm install
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Flask 2.3, SQLAlchemy, SQLite |
| AI (default) | Ollama (llama3.2:3b or any local model) |
| AI (optional) | Claude (Anthropic), Gemini (Google) |
| Frontend | React 18, TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Map | react-simple-maps |

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit your changes: `git commit -m 'Add your feature'`
3. Push to branch: `git push origin feature/your-feature`
4. Open a Pull Request

## License

MIT License
