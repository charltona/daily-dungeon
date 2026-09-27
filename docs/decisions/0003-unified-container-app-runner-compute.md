# ADR 0003: Unified Container Deployment on Amazon ECS Express Mode / Fargate

- **Status:** Accepted (Updated from App Runner due to AWS service deprecation)
- **Date:** 2026-09-27
- **Deciders:** Engineering & Product

---

## Context & Problem Statement
*Daily Dungeon* requires cloud deployment to enable:
1. Public HTTPS/WSS accessibility for multiplayer playtesting on mobile devices across external networks.
2. Persistent stateful WebSocket connections for the Node.js game engine (`@daily-dungeon/server`).
3. Hosting the client frontend (`@daily-dungeon/client`, a React + Vite SPA).
4. Secure private network connectivity to PostgreSQL on AWS Aurora Serverless v2.

### Deprecation Update (April 2026):
AWS announced that **AWS App Runner is no longer accepting new customers starting April 30, 2026**, and officially recommends **Amazon ECS Express Mode** as its direct successor. Consequently, we updated our compute target to Amazon ECS Express Mode / Fargate.

---

## Decision Outcome
We decided to adopt **Unified Single Container Deployment on Amazon ECS Express Mode / Fargate** behind an Application Load Balancer (ALB).

### 1. Architecture Topology

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 AWS VPC (Virtual Cloud)                │
                  │                                                        │
                  │   ┌────────────────────────────────────────────────┐   │
Client Browser ───┼──►│        Application Load Balancer (ALB)         │   │
(HTTPS / WSS)     │   │      (SSL Termination & WebSocket Support)     │   │
                  │   └───────────────────────┬────────────────────────┘   │
                  │                           │                            │
                  │   ┌───────────────────────▼────────────────────────┐   │
                  │   │        Amazon ECS Fargate (Express Mode)       │   │
                  │   │                                                │   │
                  │   │   • Express serves React: packages/client/dist │   │
                  │   │   • Socket.io WebSockets: Game Engine          │   │
                  │   │   • REST API: Auth & Leaderboards              │   │
                  │   └───────────────────────┬────────────────────────┘   │
                  │                           │ (Private Subnet)           │
                  │   ┌───────────────────────▼────────────────────────┐   │
                  │   │            AWS Aurora Serverless v2            │   │
                  │   │               (PostgreSQL DB)                  │   │
                  │   └────────────────────────────────────────────────┘   │
                  └────────────────────────────────────────────────────────┘
```

#### Why Amazon ECS Express Mode / Fargate Won:
1. **Tier-1 Flagship Stability:** Amazon ECS and AWS Fargate are core, permanent AWS services with zero sunset risk.
2. **Native WebSocket Support:** The Application Load Balancer (ALB) natively supports HTTP/1.1 WebSockets (`Upgrade: websocket`) with configurable stickiness and idle timeouts.
3. **Zero-CORS & Single-Origin Simplicity:** Serving both static React assets and WebSockets/REST from the same origin completely eliminates CORS and cross-domain mobile cookie issues.
4. **Direct Private VPC Integration:** Because Fargate tasks run directly inside the VPC, they communicate privately with Aurora Serverless v2 across private subnets with zero public database exposure.
5. **Express Mode Automation:** ECS Express Mode collapses the complexity of manually creating Task Definitions, Target Groups, Auto-scaling policies, and Security Groups into a streamlined, automated deployment.

---

### 2. Multi-Stage Monorepo Dockerfile Blueprint

```dockerfile
# Stage 1: Build Monorepo (Shared, Server, and Client)
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/shared/package*.json packages/shared/
COPY packages/server/package*.json packages/server/
COPY packages/client/package*.json packages/client/
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Minimal Production Runtime
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

### 3. AWS CDK Construct Pattern
In [`infra/lib/infra-stack.ts`](file:///g:/Projects/daily-dungeon/infra/lib/infra-stack.ts), the service is provisioned cleanly using `aws-cdk-lib/aws-ecs-patterns`:
```ts
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';

// Application Load Balanced Fargate Service
const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'DailyDungeonService', {
  vpc,
  memoryLimitMiB: 512,
  cpu: 256,
  desiredCount: 1,
  taskImageOptions: {
    image: ecs.ContainerImage.fromAsset('../'), // Builds root Dockerfile
    containerPort: 3001,
    environment: {
      NODE_ENV: 'production',
    },
  },
  publicLoadBalancer: true,
});
```

---

## Consequences
- **Positive:** Future-proof architecture backed by Amazon's flagship container orchestration engine.
- **Positive:** Native ALB support for WebSockets and custom domain SSL certificates.
- **Positive:** Private VPC security between compute and database.
