# Event Analytics Platform

## Overview

This is a scalable Event Analytics Platform built with **TypeScript + Node.js + MongoDB**.\
It supports high-frequency event ingestion, real-time metrics, funnel analysis, user journeys, and retention tracking—similar to tools like PostHog or Segment.

The system is multi-tenant, supports multiple projects, and includes caching, rate-limiting, and API key-based authentication.\
A React dashboard is included for visualization of metrics, funnels, retention, and user journeys.

---

## Architecture & Design Decisions

- **Backend:** Node.js + Express + TypeScript
- **Database:** MongoDB (time-series optimized, multi-tenant indexing)
- **Caching:** Redis for frequently accessed analytics
- **Security:** API key auth, Helmet for HTTP headers
- **Rate Limiting:** Per-IP and per-API-key using Redis
- **Event Processing:** Asynchronous ingestion using workers (queue-based)
- **Frontend:** React dashboard for analytics visualization

**Key Design Highlights:**

- Multi-tenant support (`orgId`, `projectId`)
- Aggregation pipelines for fast analytics queries
- Modular folder structure for maintainability
- Environment variables managed via `.env`
- Full TypeScript support with proper typings
- Scripts for local event seeding

---

## Folder Structure

```
backend/
├─ src/
│  ├─ config/       # DB, cache, Redis setup
│  ├─ controllers/  # API logic
│  ├─ middleware/   # API key auth, rate limiter
│  ├─ models/       # MongoDB schemas
│  ├─ queues/       # Event ingestion queues
│  ├─ routes/       # Express routes
│  ├─ workers/      # Background job processors
│  └─ index.ts      # Server entrypoint
├─ .env             # Environment variables
├─ package.json
├─ tsconfig.json
└─ README.md

frontend/
├─ src/             # React source code
├─ public/
├─ package.json
├─ tsconfig.json
└─ .env             # Frontend env (API URLs)
```

---

## Local Setup

### Backend

1. Clone the repository:

```bash
git clone https://github.com/avanilodhi/event-analytics.git
cd event-analytics
```

2. Install dependencies:

```bash
npm install
```

3. Setup `.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/event_analytics
REDIS_URL=redis://localhost:6379
```

4. Start backend server:

```bash
npm run dev
```

5. Seed fake events (optional):

```bash
node src/scripts/seedEvents.js
```

### Frontend

1. Navigate to frontend folder:

```bash
cd analytics-dashboard
```

2. Install dependencies:

```bash
npm install
```

3. Setup `.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_API_KEY=dev_key_1
```

4. Start frontend server:

```bash
npm start
```

---

## API Endpoints

### Event Ingestion

```
POST /api/events
```

- Accepts batched user events (up to 1000 per request)
- Fields: `userId`, `eventName`, `timestamp`, `orgId`, `projectId`, `metadata`

---

### Metrics

```
GET /api/analytics/metrics?event=signup&interval=daily&orgId=org_1&projectId=proj_1&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

- Returns aggregated counts of events
- Supports `daily`, `hourly`, and `weekly` intervals

---

### Funnels

```
POST /api/analytics/funnels
```

- Body:

```json
{
  "steps": ["signup", "page_view", "purchase"],
  "orgId": "org_1",
  "projectId": "proj_1",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

- Returns total users and users completing each step (with order)

---

### User Journey

```
GET /api/analytics/users/:id/journey?orgId=org_1&projectId=proj_1&limit=100
```

- Returns ordered event timeline for a single user

---

### Retention

```
GET /api/analytics/retention?cohort=signup&startDate=YYYY-MM-DD&days=7&orgId=org_1&projectId=proj_1
```

- Returns cohort retention per day

---

## Postman / API Test Suite

- Include a Postman collection to test all endpoints with sample events.
- Save as `EventAnalytics.postman_collection.json` in the repo.


---

## Submission Notes

- Modular backend code using TypeScript + Node.js (Express)
- MongoDB schema design & indexing implemented
- REST APIs with authentication & rate-limiting
- OpenAPI/Swagger documentation can be added if required
- Scripts for local setup and fake event seeding included
- Frontend dashboard ready for metrics visualization

---

## License

MIT

