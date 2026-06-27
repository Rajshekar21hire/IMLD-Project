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
- Node.js 18 or 20 LTS and npm
- [Ollama](https://ollama.com/) (for the default local AI — no API key needed)

> Note: `react-scripts` 5 in this project is not stable on Node 22/24. Use Node 18/20 LTS for frontend development.

## Quick Start

### 1. Clone the repository

```bash
git clone <repository-url>
cd "IMLD Project"
```

### 2. Start with Docker

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)

```bash
# Copy the environment template
cp .env.example .env
# Edit .env and set a SECRET_KEY (and any API keys if not using Ollama)

# Build and start all services
docker compose up --build

# (First time only) Pull the default Ollama model
docker compose exec ollama ollama pull llama3.2:3b
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3001 |
| Backend API | http://localhost:5000/api |
| Ollama | http://localhost:11434 |

The frontend nginx container proxies all `/api/` requests to the backend, so there are no CORS issues and no extra ports to configure.

Then click **"Add Sample Data"** on the Dashboard and hit **"Generate Data Story"**.

### Using a different AI provider (skip Ollama)

If you prefer Gemini or OpenAI, set the relevant variables in `.env` and start only the backend and frontend:

```env
CHAT_PROVIDER=gemini
GEMINI_API_KEY=your-key-here
```

```bash
docker compose up --build backend frontend
```

### Useful Docker commands

```bash
# Stop all services
docker compose down

# Stop and wipe volumes (resets the database and downloaded Ollama models)
docker compose down -v

# View backend logs
docker compose logs -f backend

# Rebuild a single service after code changes
docker compose up --build backend
```

## Manual Setup (without Docker)

> **Note:** Without Docker, Ollama runs directly on your machine without container resource management. The AI model will respond **slower** — especially on first load and for long story generation requests. Docker is strongly recommended for the best experience.

### 1. Backend

```bash
cd backend

# Activate the virtual environment
.\venv311\Scripts\Activate.ps1          # Windows (PowerShell)
# source venv311/bin/activate           # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Edit .env if needed

# Start the server
python run.py
```

Backend runs at `http://localhost:5000`

### 2. Frontend

```bash
# Open a new terminal
cd frontend
npm install
npm start
```

Frontend opens at `http://localhost:3001`

### 3. Pull an Ollama model (first time only)

```bash
ollama pull llama3.2:3b
```

Make sure [Ollama](https://ollama.com/) is installed and running (`ollama serve`) before starting the backend.

---

## Environment Variables

### Backend (`backend/.env`)

```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite:///air_quality_portal.db
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5000

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
- `GET /api/data/date-range` — available date range
- `GET /api/data/statistics` — pollution statistics
- `POST /api/data/summary` — summarized data
- `GET /api/data/live` — live air quality readings
- `GET /api/data/world-aqi` — world AQI map data
- `GET /api/data/cities-aqi` — per-city AQI data
- `GET /api/data/yearly-trends` — yearly trend data
- `GET /api/data/pm25-gini` — PM2.5 inequality (Gini) data
- `POST /api/data/sample-data` — seed sample data (demo)

### Stories
- `POST /api/stories/generate` — generate a new story
- `GET /api/stories/` — list stories
- `GET /api/stories/<id>` — get a specific story
- `GET /api/stories/<id>/visualizations` — chart configs for a story
- `POST /api/stories/theme-story` — generate a themed story
- `POST /api/stories/humanize-story` — generate a human-style version of a story
- `POST /api/stories/city-rankings` — ranked cities by pollution
- `POST /api/stories/city-details` — detailed city pollution data

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

**`404 Client Error: ... /api/chat` / "model not available"** — the model name being requested doesn't match a model you've pulled. Fix:
1. Run `ollama list` to see exactly which models are pulled locally.
2. Make sure `OLLAMA_MODEL` (and `OLLAMA_STORY_MODEL`, if you use a separate model for story generation) in `backend/.env` matches one of them exactly, including the tag (e.g. `llama3.2:3b`, not `llama3.2:1b` or `llama3.2`).
3. **Check for a system/user environment variable with the same name** — `OLLAMA_MODEL` or `OLLAMA_STORY_MODEL` set at the OS level (Windows: `[System.Environment]::GetEnvironmentVariable("OLLAMA_STORY_MODEL","User")`) silently overrides `.env`, since `python-dotenv` does not override variables that already exist in the environment. If one is set and stale, remove it (`[System.Environment]::SetEnvironmentVariable("OLLAMA_STORY_MODEL", $null, "User")`) or update it to match `.env`.
4. **Restart the backend** (`python run.py`) — Flask only reads `.env` (and the OS environment) at startup, so editing either while the server is running has no effect until you restart.

Keep `OLLAMA_MODEL` the same everywhere it's referenced (`backend/.env`, `backend/.env.example`, this README, QUICKSTART.md, and any OS-level env vars) to avoid drift between docs and what's actually pulled.

**CORS errors** — verify `CORS_ORIGINS` in `backend/.env` includes `http://localhost:3001`.

**Database errors** — delete `backend/air_quality_portal.db` and restart; Flask recreates it.

**Frontend install issues**
```bash
npm cache clean --force
npm install
```

**Frontend crashes with out-of-memory or `RpcIpcMessagePortClosedError`**
```bash
# 1) Use Node 18 or 20 LTS (recommended)
node -v

# 2) Start frontend with project defaults
cd frontend
npm start
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
