# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, the API is open (no authentication required). For production, add API key authentication.

---

## Data Endpoints

### 1. Get Countries
**Endpoint:** `GET /data/countries`

**Description:** Get list of all countries with air quality data

**Response:**
```json
{
  "success": true,
  "data": ["India", "China", "USA", "Indonesia", "Pakistan"]
}
```

---

### 2. Get Cities
**Endpoint:** `GET /data/cities`

**Query Parameters:**
- `country` (optional): Filter by country

**Response:**
```json
{
  "success": true,
  "data": [
    {"city": "Delhi", "country": "India"},
    {"city": "Mumbai", "country": "India"},
    ...
  ]
}
```

---

### 3. Get Filtered Data
**Endpoint:** `GET /data/filter`

**Query Parameters:**
- `country` (optional): Filter by country
- `city` (optional): Filter by city
- `days` (optional, default: 30): Number of days to look back
- `limit` (optional, default: 100): Maximum records to return

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "country": "India",
      "city": "Delhi",
      "latitude": 28.7041,
      "longitude": 77.1025,
      "pm25": 85.5,
      "pm10": 120.3,
      "o3": 45.2,
      "no2": 65.1,
      "so2": 35.8,
      "co": 2.1,
      "aqi": 220,
      "aqi_category": "Very Unhealthy",
      "measurement_date": "2026-05-16T10:30:00",
      "health_impact": "Air quality is very unhealthy"
    },
    ...
  ],
  "count": 15
}
```

---

### 4. Get Statistics
**Endpoint:** `GET /data/statistics`

**Query Parameters:**
- `country` (optional): Filter by country
- `city` (optional): Filter by city
- `pollution_type` (default: 'aqi'): Type of pollution to analyze
- `days` (optional, default: 30): Number of days to look back

**Pollution Types:** `aqi`, `pm25`, `pm10`, `o3`, `no2`, `so2`, `co`

**Response:**
```json
{
  "success": true,
  "statistics": {
    "min": 45.5,
    "max": 289.3,
    "avg": 156.8,
    "count": 30
  },
  "aqi_distribution": {
    "Good": 2,
    "Moderate": 5,
    "Unhealthy for Sensitive Groups": 8,
    "Unhealthy": 10,
    "Very Unhealthy": 5
  },
  "trends": {
    "2026-05-16": {
      "pm25": 85.5,
      "pm10": 120.3,
      ...
    },
    ...
  }
}
```

---

### 5. Add Sample Data
**Endpoint:** `POST /data/sample-data`

**Description:** Generate and add 30 days of sample data (for demo purposes)

**Response:**
```json
{
  "success": true,
  "message": "Sample data added successfully"
}
```

---

## Story Endpoints

### 1. Generate Story
**Endpoint:** `POST /stories/generate`

**Request Body:**
```json
{
  "country": "India",
  "city": "Delhi",
  "pollution_type": "pm25",
  "days": 30
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Air Quality Story: Delhi, India",
    "content": "## Air Quality Report for Delhi, India\n\n...",
    "summary": "Analysis of PM2.5 levels...",
    "country": "India",
    "city": "Delhi",
    "pollution_type": "pm25",
    "key_insights": [
      "Average pollution level: 85.5 units",
      "Peak level recorded: 150.2 units",
      "Trend: 12.5% increase"
    ],
    "recommendations": [
      "Reduce vehicle emissions...",
      "Promote renewable energy sources...",
      ...
    ],
    "data_points_analyzed": 30,
    "time_period": "30 days",
    "created_at": "2026-05-16T10:30:00",
    "average_rating": null
  }
}
```

---

### 2. Get Story
**Endpoint:** `GET /stories/<story_id>`

**Response:** (Same as story generation response)

---

### 3. List Stories
**Endpoint:** `GET /stories`

**Query Parameters:**
- `country` (optional): Filter by country
- `city` (optional): Filter by city
- `pollution_type` (optional): Filter by pollution type
- `limit` (optional, default: 10): Pagination limit
- `offset` (optional, default: 0): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "title": "...", ...},
    { "id": 2, "title": "...", ...}
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

---

### 4. Get Visualizations
**Endpoint:** `GET /stories/<story_id>/visualizations`

**Response:**
```json
{
  "success": true,
  "data": {
    "trend_chart": {...},
    "distribution_chart": {...}
  }
}
```

---

## Rating Endpoints

### 1. Add Rating
**Endpoint:** `POST /ratings/story/<story_id>`

**Request Body:**
```json
{
  "rating": 5,
  "feedback": "Great story with excellent insights!",
  "story_quality": 5,
  "accuracy": 4,
  "clarity": 5,
  "usefulness": 5,
  "user_email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "story_id": 1,
    "rating": 5,
    "feedback": "Great story...",
    "story_quality": 5,
    "accuracy": 4,
    "clarity": 5,
    "usefulness": 5,
    "created_at": "2026-05-16T10:35:00"
  }
}
```

---

### 2. Get Ratings
**Endpoint:** `GET /ratings/story/<story_id>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "story_id": 1,
      "rating": 5,
      "feedback": "Great!",
      "created_at": "2026-05-16T10:35:00"
    }
  ],
  "average_rating": 4.5,
  "count": 2
}
```

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Description of what went wrong"
}
```

### Common HTTP Status Codes
- `200`: Success
- `201`: Created (for POST requests)
- `400`: Bad Request (invalid parameters)
- `404`: Not Found (resource doesn't exist)
- `500`: Server Error (internal error)

### Example Error Response
```json
{
  "success": false,
  "error": "Story not found"
}
```

---

## Rate Limiting
Currently not implemented. For production, add rate limiting:
- 100 requests per minute per IP
- 1000 requests per hour per IP

---

## Best Practices

### Request Examples

#### Generate Story with cURL
```bash
curl -X POST http://localhost:5000/api/stories/generate \
  -H "Content-Type: application/json" \
  -d '{
    "country": "India",
    "city": "Delhi",
    "pollution_type": "pm25",
    "days": 30
  }'
```

#### Get Filtered Data with cURL
```bash
curl http://localhost:5000/api/data/filter?country=India&city=Delhi&days=30
```

#### Add Rating with cURL
```bash
curl -X POST http://localhost:5000/api/ratings/story/1 \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "feedback": "Excellent story!",
    "user_email": "user@example.com"
  }'
```

### Response Handling (JavaScript/Fetch)

```javascript
// Fetch data from API
fetch('http://localhost:5000/api/data/countries')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      console.log('Countries:', data.data);
    } else {
      console.error('Error:', data.error);
    }
  })
  .catch(error => console.error('Fetch error:', error));
```

---

## Webhooks (Future Feature)
Not currently implemented. Planned for future releases to enable:
- Story completion notifications
- New pollution alerts
- Rating summaries

---

## API Versioning
Current Version: **v1** (implied in URLs)

Future plan: Support `/api/v2/` for backward compatibility

---

## CORS Configuration
The API accepts requests from configured origins in `.env`:
```
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
```

---

## Authentication (Future)
Future releases will add JWT-based authentication:
- User registration and login
- Token-based API access
- Rate limiting per user

---

For issues or questions about the API, please refer to the [Support](./SUPPORT.md) section.
