# Project Architecture Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  - Pages: Home, Dashboard                                      │
│  - Components: Filter, Story, Charts, Rating                  │
│  - State Management: Context API                              │
│  - API Client: Axios                                          │
│  - Styling: Tailwind CSS                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP (REST API)
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Backend (Flask/Python)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Routes Layer                                             │  │
│  │ - /api/data - Air quality data endpoints               │  │
│  │ - /api/stories - Story generation & retrieval          │  │
│  │ - /api/ratings - User ratings & feedback               │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │ Services Layer                                           │  │
│  │ - DataService: Data processing & queries               │  │
│  │ - StoryService: Story creation & management            │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │ AI Agent Layer                                           │  │
│  │ - StoryAgent: Generates narratives from data           │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │ Models Layer (SQLAlchemy ORM)                           │  │
│  │ - AirQualityData                                         │  │
│  │ - DataStory                                              │  │
│  │ - StoryRating                                            │  │
│  └────────────────────────┬─────────────────────────────────┘  │
└────────────────────────┬──────────────────────────────────────┘
                         │
                         ▼
            ┌──────────────────────────┐
            │ SQLite Database          │
            │ (air_quality_portal.db)  │
            └──────────────────────────┘
```

## Component Hierarchy

```
App
├── HomePage
│   └── Features showcase
│
├── DashboardPage
│   ├── FilterComponent
│   │   └── Country/City/Type selection
│   │
│   ├── StoryDisplay
│   │   ├── Story metadata
│   │   ├── Key insights
│   │   ├── Main narrative
│   │   ├── Recommendations
│   │   └── Rating button
│   │
│   ├── RatingModal
│   │   ├── Star ratings
│   │   ├── Detailed feedback
│   │   └── Email capture
│   │
│   └── Charts
│       ├── Trend chart (Recharts)
│       └── Distribution chart
```

## Data Flow

### Story Generation Flow
1. User selects filters (country, city, pollution type, days)
2. Frontend sends POST request to `/api/stories/generate`
3. Backend DataService fetches matching AirQualityData
4. AI StoryAgent analyzes data and generates narrative
5. Story saved to database
6. Story returned to frontend with formatting
7. Frontend displays story with visualizations

### Rating Flow
1. User clicks "Rate Story" button
2. RatingModal opens
3. User provides ratings and feedback
4. Frontend sends POST to `/api/ratings/story/{id}`
5. Rating saved to database
6. Average rating recalculated and displayed

## Key Design Patterns

### Backend
- **Service Layer Pattern**: Business logic separated from routes
- **Repository Pattern**: Data access through models
- **Agent Pattern**: AI logic isolated in dedicated classes
- **Factory Pattern**: App creation through create_app()

### Frontend
- **Context API**: Global state management for filters
- **Custom Hooks**: useFilters hook for state access
- **Component Composition**: Reusable, focused components
- **API Client**: Centralized axios instance

## Data Transformations

### AirQualityData → StatisticsAggregation
```
Raw Data Points → Aggregation → Statistics
  (pm25, pm10, etc.)      (filtering, grouping)     (min, max, avg)
```

### AirQualityData → Story Generation
```
Data Points → Analysis → Insights → Narrative → Story Object
   (raw)    (statistics)  (trends)   (generation)
```

## File Organization Philosophy

- **Separation of Concerns**: Each file has single responsibility
- **Scalability**: Easy to add new pollution types or metrics
- **Maintainability**: Clear structure and naming conventions
- **Testability**: Independent components for unit testing

## Environment & Configuration

### Backend Configuration
- Loaded from .env file via python-dotenv
- Database URL configurable
- CORS origins configurable
- Secret key for session management

### Frontend Configuration
- API URL from environment variable
- Tailwind CSS via CDN and config
- TypeScript strict mode enabled
- React Router configured with basename

## Performance Considerations

- **Database Indexing**: Country, city, measurement_date indexed
- **Pagination**: Stories listing supports limit/offset
- **Lazy Loading**: Charts rendered only when data available
- **Memoization**: React components use proper key prop

## Security Considerations

- **CORS Protection**: Configurable allowed origins
- **Input Validation**: Backend validates all inputs
- **SQL Injection Prevention**: SQLAlchemy ORM used
- **Environment Secrets**: Sensitive data in .env files

## Scalability Paths

1. **Database**: Switch from SQLite to PostgreSQL
2. **Caching**: Add Redis for frequently accessed data
3. **API**: Add API rate limiting and authentication
4. **Frontend**: Implement code splitting with React.lazy
5. **AI**: Use advanced models from OpenAI or other providers
6. **Analytics**: Add tracking for user behavior

## Testing Strategy

### Backend Testing
- Unit tests for services
- Integration tests for routes
- Mock data for testing

### Frontend Testing
- Component testing with React Testing Library
- Integration testing with API mocks
- E2E testing with Cypress

## Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.
