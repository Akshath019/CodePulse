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

# ⚡ CodePulse

> **Real-time collaborative code execution platform.** Write code together, run it in isolated Docker sandboxes, watch output stream back live.

---

## What Is This? (Explain Like I'm 5)

Imagine Google Docs — but instead of writing essays together, you and your friends write **code** together. When you press "Run", your code doesn't run on your laptop. It flies through the internet, lands on a server, gets locked inside a tiny secure box (a Docker container), runs there safely, and the result comes back to everyone in the room within a second.

That's CodePulse. A **safe, real-time, multiplayer coding playground**.

---

## Why I Built It

I wanted to learn how real distributed systems work — the kind Netflix, Uber, and LinkedIn use. Instead of reading about them, I built one:

- How do you run **untrusted code** without hackers destroying your server? → Docker sandboxes
- How do you handle **thousands of Run requests** without crashing? → Kafka message queue
- How do you make **live collaboration** feel instant? → WebSockets
- How do you package **6 services** so anyone can run them? → Docker Compose

---

## Live Features

- ✅ **Monaco Editor** (same one VS Code uses) with syntax highlighting for Python, JavaScript, Java
- ✅ **Isolated Docker sandbox** per execution (128MB RAM cap, 50% CPU cap, no network — hacker-proof)
- ✅ **Kafka job queue** — decouples the API from execution so nothing ever blocks
- ✅ **Real-time output streaming** via WebSockets — no polling, no refreshing
- ✅ **Live collaborative editing** — see your friend type in real-time (Google-Docs style)
- ✅ **Shareable room URLs** — send a link, they join instantly
- ✅ **Fully Dockerized** — clone repo, run `docker compose up`, everything works

---

## Architecture

```mermaid
flowchart LR
    U1[👤 User 1<br/>Browser] --> FE[React + Monaco Editor]
    U2[👤 User 2<br/>Browser] --> FE

    FE -->|REST POST /execute| API[Express API]
    FE <-->|WebSocket<br/>live sync + results| API

    API -->|Save execution| DB[(PostgreSQL)]
    API -->|Publish job| KAFKA{{Kafka<br/>code.jobs}}

    KAFKA -->|Consume job| WORKER[Worker Node.js]
    WORKER -->|Spawn container| DOCKER[🐳 Docker<br/>Python / JS / Java]
    DOCKER -->|stdout + stderr| WORKER

    WORKER -->|Publish result| KAFKA2{{Kafka<br/>code.results}}
    KAFKA2 -->|Consume result| API
    API -->|UPDATE row| DB
    API -->|emit via WebSocket| FE

    style KAFKA fill:#ff6b35,color:#fff
    style KAFKA2 fill:#ff6b35,color:#fff
    style DOCKER fill:#2496ed,color:#fff
    style DB fill:#336791,color:#fff


To run
docker compose up -d

```
