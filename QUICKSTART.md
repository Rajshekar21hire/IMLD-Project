# Quick Start Guide

## 5-Minute Setup

### Step 1: Install Ollama (one-time, free local AI)

Download from [ollama.com](https://ollama.com/) and pull a model:

```bash
ollama pull llama3.2:3b
```

This must match `OLLAMA_MODEL` in `backend/.env` exactly (tag included). If you change the model, update `.env` and **restart the backend** — it only reads `.env` at startup. Run `ollama list` anytime to check what's actually pulled.

> If you still get a 404 for a model you never set in `.env`, check for a stale OS-level environment variable (`OLLAMA_MODEL` / `OLLAMA_STORY_MODEL`) — those silently override `.env`. See the Troubleshooting section in [README.md](./README.md).

### Step 2: Backend

```bash
cd backend

# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # defaults work with Ollama out of the box
python run.py
```

Expected: `Running on http://127.0.0.1:5000`

### Step 3: Frontend

```bash
# New terminal
cd frontend
npm install
npm start
```

Browser opens at `http://localhost:3001`.

### Step 4: Generate your first story

1. Click **Dashboard**
2. Click **"Add Sample Data"**
3. Pick a country, city, and pollution type
4. Click **"Generate Data Story"**

---

## Using a different AI provider

Edit `backend/.env` and change `CHAT_PROVIDER`:

```env
# Claude (Anthropic)
CHAT_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...

# Gemini (Google)
CHAT_PROVIDER=gemini
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

---

## Key Commands

```bash
# Backend
cd backend && venv\Scripts\activate && python run.py   # Windows
cd backend && source venv/bin/activate && python run.py  # macOS/Linux

# Frontend
cd frontend && npm start

# Seed sample data
curl -X POST http://localhost:5000/api/data/sample-data

# Generate a story via API
curl -X POST http://localhost:5000/api/stories/generate \
  -H "Content-Type: application/json" \
  -d '{"country":"India","city":"Delhi","pollution_type":"pm25","days":30}'
```

---

See [README.md](./README.md) for full documentation.
