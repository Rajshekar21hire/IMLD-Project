# 📖 Project Navigation & File Index

## 🎯 Where to Start

### 1️⃣ New to the Project?
**Start here**: [QUICKSTART.md](./QUICKSTART.md) (5 min read)
- Get the application running in 5 minutes
- Learn basic usage
- Run your first story generation

### 2️⃣ Want Full Details?
**Read here**: [README.md](./README.md) (15 min read)
- Complete project overview
- Features and technology stack
- Comprehensive usage guide
- Troubleshooting

### 3️⃣ Installation Issues?
**Check here**: [docs/SETUP.md](./docs/SETUP.md) (10 min read)
- Step-by-step installation
- Troubleshooting common problems
- Docker setup option
- Virtual environment configuration

### 4️⃣ Understanding Architecture?
**Learn here**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) (15 min read)
- System overview diagrams
- Component hierarchy
- Data flow explanation
- Design patterns used

### 5️⃣ Building with the API?
**Explore here**: [docs/API.md](./docs/API.md) (20 min read)
- All 12+ API endpoints
- Request/response examples
- Error handling
- Code examples with cURL

### 6️⃣ Project Completion Summary?
**Review here**: [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) (10 min read)
- What was built
- Technology stack
- Features overview
- Deployment ready status

---

## 📁 File Structure & Navigation

### Root Level
```
IMLD Project/
├── README.md                 ← START HERE (comprehensive guide)
├── QUICKSTART.md            ← OR START HERE (5-min setup)
├── PROJECT_SUMMARY.md       ← Project completion overview
├── .gitignore               ← Git configuration
└── FILE_INDEX.md            ← YOU ARE HERE
```

### Backend Directory
```
backend/
├── run.py                           ← START BACKEND SERVER
├── requirements.txt                 ← Python dependencies
├── .env.example                     ← Copy to .env and configure
└── app/
    ├── __init__.py                  ← App factory
    ├── models/                      ← Database models
    │   ├── __init__.py
    │   ├── data_models.py           ← AirQualityData model
    │   └── story_models.py          ← DataStory, StoryRating models
    ├── routes/                      ← REST API endpoints
    │   ├── __init__.py
    │   ├── data_routes.py           ← /api/data/* endpoints
    │   ├── story_routes.py          ← /api/stories/* endpoints
    │   └── rating_routes.py         ← /api/ratings/* endpoints
    ├── services/                    ← Business logic
    │   ├── __init__.py
    │   ├── data_service.py          ← Data processing
    │   └── story_service.py         ← Story management
    ├── agents/                      ← AI components
    │   ├── __init__.py
    │   └── story_agent.py           ← Story generation engine
    └── utils/                       ← Utility functions
        └── __init__.py
```

### Frontend Directory
```
frontend/
├── package.json                     ← NPM dependencies & scripts
├── tsconfig.json                    ← TypeScript configuration
├── tailwind.config.js               ← Tailwind CSS setup
├── postcss.config.js                ← PostCSS configuration
├── .env.example                     ← Copy to .env and configure
├── public/
│   └── index.html                   ← HTML template
└── src/
    ├── index.tsx                    ← React entry point
    ├── App.tsx                      ← Main app component
    ├── components/                  ← React components
    │   ├── FilterComponent.tsx      ← Data filtering UI
    │   ├── StoryDisplay.tsx         ← Story renderer
    │   ├── RatingModal.tsx          ← Rating form
    │   └── Chart.tsx                ← Chart wrapper
    ├── pages/                       ← Page components
    │   ├── HomePage.tsx             ← Landing page
    │   └── DashboardPage.tsx        ← Main dashboard
    ├── services/                    ← API client
    │   └── api.ts                   ← Axios instance & endpoints
    ├── hooks/                       ← Custom React hooks
    │   └── useFilters.tsx           ← Filter state management
    ├── types/                       ← TypeScript definitions
    │   └── index.ts                 ← Type definitions
    └── styles/                      ← CSS & styling
        ├── index.css                ← Global styles
        └── App.css                  ← Component styles
```

### Documentation Directory
```
docs/
├── SETUP.md                         ← Installation guide
├── ARCHITECTURE.md                  ← Technical architecture
└── API.md                           ← API reference
```

---

## 🔑 Key Files by Purpose

### To Run the Project
| File | Purpose |
|------|---------|
| [backend/run.py](./backend/run.py) | Start Flask server |
| [frontend/package.json](./frontend/package.json) | Start React dev server |
| [backend/requirements.txt](./backend/requirements.txt) | Install backend deps |

### To Understand the Architecture
| File | Purpose |
|------|---------|
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design |
| [backend/app/__init__.py](./backend/app/__init__.py) | App initialization |
| [frontend/src/App.tsx](./frontend/src/App.tsx) | Frontend structure |

### To Work with Data
| File | Purpose |
|------|---------|
| [backend/app/models/data_models.py](./backend/app/models/data_models.py) | Data schema |
| [backend/app/services/data_service.py](./backend/app/services/data_service.py) | Data operations |
| [backend/app/routes/data_routes.py](./backend/app/routes/data_routes.py) | Data endpoints |

### To Work with Stories
| File | Purpose |
|------|---------|
| [backend/app/models/story_models.py](./backend/app/models/story_models.py) | Story schema |
| [backend/app/services/story_service.py](./backend/app/services/story_service.py) | Story operations |
| [backend/app/agents/story_agent.py](./backend/app/agents/story_agent.py) | AI story generation |
| [backend/app/routes/story_routes.py](./backend/app/routes/story_routes.py) | Story endpoints |

### To Understand the UI
| File | Purpose |
|------|---------|
| [frontend/src/pages/HomePage.tsx](./frontend/src/pages/HomePage.tsx) | Home page |
| [frontend/src/pages/DashboardPage.tsx](./frontend/src/pages/DashboardPage.tsx) | Dashboard |
| [frontend/src/components/FilterComponent.tsx](./frontend/src/components/FilterComponent.tsx) | Filter UI |
| [frontend/src/components/StoryDisplay.tsx](./frontend/src/components/StoryDisplay.tsx) | Story display |

### Configuration Files
| File | Purpose |
|------|---------|
| [backend/.env.example](./backend/.env.example) | Backend config template |
| [frontend/.env.example](./frontend/.env.example) | Frontend config template |
| [frontend/tailwind.config.js](./frontend/tailwind.config.js) | Tailwind CSS config |
| [frontend/tsconfig.json](./frontend/tsconfig.json) | TypeScript config |

---

## 🚀 Common Tasks

### Task: Start the Application
1. Read: [QUICKSTART.md](./QUICKSTART.md)
2. Backend: `cd backend && python run.py`
3. Frontend: `cd frontend && npm start`
4. Open: http://localhost:3000

### Task: Add Features
1. Backend endpoint: Edit [backend/app/routes/](./backend/app/routes/)
2. Backend service: Edit [backend/app/services/](./backend/app/services/)
3. Frontend component: Edit [frontend/src/components/](./frontend/src/components/)
4. Frontend page: Edit [frontend/src/pages/](./frontend/src/pages/)

### Task: Modify Database Schema
1. Edit: [backend/app/models/](./backend/app/models/)
2. Delete: `backend/air_quality_portal.db`
3. Restart: `python run.py` (recreates DB)

### Task: Use the API
1. Read: [docs/API.md](./docs/API.md)
2. Backend running: `http://localhost:5000`
3. Test endpoint: `curl http://localhost:5000/api/data/countries`

### Task: Understand Data Flow
1. Read: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
2. Data path: Models → Service → Routes → Frontend
3. Story path: Raw Data → Analysis → Narrative → Display

### Task: Deploy to Production
1. Read: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) (Scalability section)
2. Set up: PostgreSQL, environment variables
3. Build: `npm run build` (frontend)
4. Deploy: Use Gunicorn, Nginx, Docker

---

## 📊 API Endpoints Quick Reference

### Data Endpoints
```
GET    /api/data/countries
GET    /api/data/cities?country=India
GET    /api/data/filter?country=India&city=Delhi&days=30
GET    /api/data/statistics?country=India&pollution_type=pm25
POST   /api/data/sample-data
```

### Story Endpoints
```
POST   /api/stories/generate
GET    /api/stories
GET    /api/stories/1
GET    /api/stories/1/visualizations
```

### Rating Endpoints
```
POST   /api/ratings/story/1
GET    /api/ratings/story/1
```

See [docs/API.md](./docs/API.md) for complete details.

---

## 🐛 Troubleshooting by File

### Backend Won't Start
1. Check: [backend/run.py](./backend/run.py) port (default 5000)
2. Fix: [backend/.env](./backend/.env) configuration
3. See: [docs/SETUP.md](./docs/SETUP.md#troubleshooting-installation)

### Frontend Won't Load
1. Check: [frontend/.env](./frontend/.env) API URL
2. Verify: [frontend/src/services/api.ts](./frontend/src/services/api.ts) endpoints
3. See: [docs/SETUP.md](./docs/SETUP.md#troubleshooting-installation)

### Database Issues
1. Delete: `backend/air_quality_portal.db`
2. Check: [backend/app/models/](./backend/app/models/) schemas
3. Restart: `python run.py`

### API Not Responding
1. Check: Backend running on `http://localhost:5000`
2. Check: [frontend/.env](./frontend/.env) `REACT_APP_API_URL`
3. Check: [backend/app/__init__.py](./backend/app/__init__.py) CORS config

---

## 📚 Documentation Map

```
Quick Overview
    ↓
    ├→ QUICKSTART.md (5 min)
    │
Detailed Learning
    ├→ README.md (comprehensive)
    │   ├→ Feature List
    │   ├→ Technology Stack
    │   ├→ Architecture
    │   └→ Usage Guide
    │
Technical Deep Dive
    ├→ docs/ARCHITECTURE.md
    │   ├→ System Design
    │   ├→ Component Structure
    │   └→ Data Flow
    │
Setup & Deployment
    ├→ docs/SETUP.md
    │   ├→ Installation Steps
    │   ├→ Troubleshooting
    │   └→ Docker Setup
    │
API Integration
    └→ docs/API.md
        ├→ Endpoint Reference
        ├→ Request/Response
        └→ Code Examples
```

---

## 🎯 Learning Path

### Beginner
1. [QUICKSTART.md](./QUICKSTART.md) - Get it running
2. [README.md](./README.md) - Understand features

### Intermediate
1. [docs/SETUP.md](./docs/SETUP.md) - Deep installation
2. [docs/API.md](./docs/API.md) - API usage

### Advanced
1. [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
2. Source code review in order:
   - Models: [backend/app/models/](./backend/app/models/)
   - Services: [backend/app/services/](./backend/app/services/)
   - Routes: [backend/app/routes/](./backend/app/routes/)
   - Components: [frontend/src/components/](./frontend/src/components/)

---

## 🔗 Related Resources

### Inside Project
- Configuration: [backend/.env.example](./backend/.env.example), [frontend/.env.example](./frontend/.env.example)
- Type Definitions: [frontend/src/types/index.ts](./frontend/src/types/index.ts)
- Styling: [frontend/src/styles/](./frontend/src/styles/)

### External Resources
- Flask: https://flask.palletsprojects.com/
- React: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- SQLAlchemy: https://www.sqlalchemy.org/

---

## ✨ File Statistics

| Component | Files | Lines of Code |
|-----------|-------|--------------|
| Backend Models | 2 | ~200 |
| Backend Services | 2 | ~350 |
| Backend Routes | 3 | ~200 |
| Backend Agent | 1 | ~400 |
| Frontend Components | 4 | ~600 |
| Frontend Pages | 2 | ~400 |
| Frontend Services | 1 | ~50 |
| Frontend Hooks | 1 | ~50 |
| Documentation | 5 | ~1000+ |
| **Total** | **23** | **~3250+** |

---

## 🎉 Quick Links

| Need | Link |
|------|------|
| 🚀 Get Started | [QUICKSTART.md](./QUICKSTART.md) |
| 📖 Full Guide | [README.md](./README.md) |
| 🛠 Setup Help | [docs/SETUP.md](./docs/SETUP.md) |
| 🏗 Architecture | [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| 🔌 API Docs | [docs/API.md](./docs/API.md) |
| ✅ Summary | [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) |

---

## 📞 Support

1. **Quick questions** → Check [docs/SETUP.md](./docs/SETUP.md) FAQ
2. **API issues** → See [docs/API.md](./docs/API.md)
3. **Architecture questions** → Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
4. **General help** → Review [README.md](./README.md)

---

**Last Updated**: May 16, 2026  
**Project Version**: 1.0.0  
**Status**: ✅ Complete and Ready

*Happy exploring! 🌍📊✨*
