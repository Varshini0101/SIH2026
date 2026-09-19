# SIH 26184 - Cybercrime Complaint Prediction MVP

This project is the stable MVP foundation for a cybercrime intelligence platform focused on complaint analysis, suspicious transaction review, and basic withdrawal location prediction.

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Authentication: JWT + demo users
- Data layer: modular demo dataset with Mongo-ready models and fallback in-memory storage
- Map: Leaflet + OpenStreetMap
- Charts: Recharts

## Project structure

- `frontend/` - dashboard, investigation pages, complaints, transactions, map, auth UI
- `backend/` - REST API, controllers, routes, services, middleware, data layer, and demo dataset

## Environment variables

Create a `.env` file in the `backend` folder:

```env
PORT=5000
JWT_SECRET=your_jwt_secret
MONGO_URI=your_mongodb_atlas_connection_string
CLIENT_URL=http://localhost:5173
```

## Installation

```bash
npm install
```

## Run locally

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:5000`.

Authentication uses the local seeded/demo account when running in fallback mode. Keep credentials out of committed documentation and configure local secrets through `backend/.env`.

## MVP features included

- Login and protected routes
- Dashboard summary with charts
- Complaint CRUD and filtering
- Transaction listing and filtering
- Risk scoring and explainability
- Basic withdrawal prediction engine
- Map intelligence interface
- Investigation case view
- Modular architecture for future extension
- Money Trail & PONR graph workspace with counterfactual intervention replay
- Risk Intelligence heatmap, explainability, priority scoring, and false-positive simulation

## Deferred features

- Production graph persistence and streaming ingestion
- GNN and complex AI models
- Live interception queue

## Notes

This is intentionally a stable MVP foundation designed for future extension by other team members.
