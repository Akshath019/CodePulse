# ⚡ CodePulse

Real-time code execution and collaboration platform.

## Tech Stack
- **Frontend:** React + TypeScript + Vite + Monaco Editor + Tailwind CSS
- **Backend API:** Node.js + Express + TypeScript
- **Worker:** Node.js + Dockerode (executes code in isolated containers)
- **Database:** PostgreSQL
- **Message Queue:** Apache Kafka (in progress)
- **Real-time:** WebSockets (in progress)

## Status
🚧 Currently building — see progress in commits.

## Local Setup
```bash
# Start infrastructure
docker compose up -d

# API (terminal 1)
cd api && npm install && npm run dev

# Frontend (terminal 2)
cd frontend && npm install && npm run dev

# Worker (terminal 3)
cd worker && npm install && npm run dev