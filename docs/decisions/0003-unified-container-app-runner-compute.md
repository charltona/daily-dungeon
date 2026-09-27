# ADR 0003: Unified Container Deployment on AWS App Runner

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Engineering & Product

---

## Context & Problem Statement
*Daily Dungeon* requires cloud deployment to enable:
1. Public HTTPS/WSS accessibility for multiplayer playtesting on mobile devices across external networks.
2. Persistent stateful WebSocket connections for the Node.js game engine (`@daily-dungeon/server`).
3. Hosting the client frontend (`@daily-dungeon/client`, a React + Vite SPA).
4. Secure private network connectivity to PostgreSQL on AWS Aurora Serverless v2.

We evaluated three compute and hosting topologies:
- **Option 1: Split Architecture with AWS Amplify + ECS/App Runner** (Amplify for static client, App Runner/ECS for WebSocket server).
- **Option 2: AWS ECS Fargate + Application Load Balancer (ALB)**.
- **Option 3: Unified Single Container on AWS App Runner** (Node.js/Express serves static client assets, REST endpoints, and Socket.io WebSockets).

---

## Decision Outcome
We decided to adopt **Option 3: Unified Single Container on AWS App Runner**.

### 1. Rationale & Architecture

```
                  ┌──────────────────────────────────────────┐
                  │              AWS App Runner              │
                  │                                          │
                  │   ┌───────────────────────────────────┐  │
                  │   │      Express Server (:3001)       │  │
Client Browser ───┼──►│                                   │  │
(Mobile / Web)    │   │  • GET /*  ➔ packages/client/dist │  │
                  │   │  • /api/*  ➔ Auth & Leaderboards  │  │
                  │   │  • /socket.io/* ➔ Game Engine     │  │
                  │   └─────────────────┬─────────────────┘  │
                  └─────────────────────┼────────────────────┘
                                        │ (AWS App Runner VPC Connector)
                                        ▼
                  ┌──────────────────────────────────────────┐
                  │        AWS Aurora Serverless v2          │
                  │         (Private Subnet / VPC)           │
                  └──────────────────────────────────────────┘
```

#### Why AWS App Runner Won:
1. **Native WebSocket Support:** App Runner maintains long-lived TCP/WebSocket connections without the 30-second timeouts inherent to API Gateway or Lambda.
2. **Zero-CORS & Single-Origin Simplicity:** Because the React bundle is served from the same origin as the API and WebSockets, cross-origin resource sharing (CORS), cross-domain cookie restrictions, and `SameSite` cookie issues on mobile browsers are completely eliminated.
3. **Private VPC Connector:** App Runner connects seamlessly to private VPC subnets to reach Aurora Serverless v2 with zero public IP exposure for the database.
4. **Git-Driven Automated Deployments:** App Runner connects directly to GitHub. Pushing to `main` triggers a multi-stage Docker build and rolls out with zero downtime.
5. **Operational Simplicity:** Eliminates the complexity of managing an Application Load Balancer (ALB), Target Groups, Task Definitions, and ECS cluster infrastructure for early-stage development.

---

### 2. Multi-Stage Dockerfile Blueprint

The deployment uses a single, lightweight multi-stage Dockerfile:

```dockerfile
# Stage 1: Build Shared, Server, and Client
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY packages/server/package*.json packages/server/
COPY packages/client/package*.json packages/client/
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Minimal Runtime Container
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY packages/server/package*.json packages/server/
COPY packages/client/package*.json packages/client/
RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/packages/server/dist packages/server/dist
COPY --from=builder /app/packages/client/dist packages/client/dist

EXPOSE 3001
CMD ["node", "packages/server/dist/server.js"]
```

### 3. Server Static Hosting Integration

In `packages/server/src/server.ts`, when running in production:
```ts
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}
```

---

## Consequences
- **Positive:** Single URL, single deployment artifact, zero CORS errors, automatic SSL certificates.
- **Positive:** Low monthly operational overhead with fine-grained CPU/memory auto-scaling.
- **Positive:** Clean path to split the frontend onto a dedicated CDN (CloudFront / Amplify) later if global asset traffic justifies it, with zero application code refactoring.
