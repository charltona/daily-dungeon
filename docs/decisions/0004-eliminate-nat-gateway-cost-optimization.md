# ADR 0004: Elimination of AWS NAT Gateway for Fargate Egress Cost Optimization

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Engineering & Product

---

## Context & Problem Statement
*Daily Dungeon* runs on AWS ECS Fargate behind an Application Load Balancer (ALB), with PostgreSQL planned on Aurora Serverless v2 (ADR 0002 & ADR 0003).

In the initial infrastructure setup, the VPC was provisioned with `natGateways: 1`, deploying the Fargate compute tasks into private subnets. However, managed AWS NAT Gateways incur a fixed overhead:
- Hourly charge: ~\$0.045/hr $\times$ 730 hours/month $\approx$ **~\$32.85/month** base.
- Public IPv4 charge: ~\$0.005/hr $\times$ 730 hours/month $\approx$ **~\$3.65/month**.
- Data processing charge: **\$0.045/GB** for all ECR container image pulls and outbound SaaS traffic (e.g. Flagsmith API).

For an early-stage/indie multiplayer project, this idle baseline overhead of ~\$36.50+/month represents 80–90% of the AWS monthly bill with zero game traffic.

---

## Decision Outcome
We decided to **eliminate the AWS NAT Gateway (`natGateways: 0`)** and deploy ECS Fargate tasks into **public subnets with assigned public IPs (`assignPublicIp: true`)**.

### 1. Architectural Topology

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 AWS VPC (Virtual Cloud)                │
                  │                                                        │
                  │   ┌────────────────────────────────────────────────┐   │
Client Browser ───┼──►│        Application Load Balancer (ALB)         │   │
(HTTPS / WSS)     │   │      (Public Subnet - SSL & WebSockets)        │   │
                  │   └───────────────────────┬────────────────────────┘   │
                  │                           │                            │
                  │   ┌───────────────────────▼────────────────────────┐   │
                  │   │        Amazon ECS Fargate Service              │   │
                  │   │     (Public Subnet, assignPublicIp: true)      │   │
                  │   │                                                │   │
                  │   │   • Direct outbound egress via IGW ($0 cost)   │───┼──► Internet (ECR, CloudWatch, Flagsmith)
                  │   │   • Inbound strictly restricted to ALB SG      │   │
                  │   └───────────────────────┬────────────────────────┘   │
                  │                           │ (Private Local VPC Routing)│
                  │   ┌───────────────────────▼────────────────────────┐   │
                  │   │            AWS Aurora Serverless v2            │   │
                  │   │           (Private Isolated Subnet)            │   │
                  │   └────────────────────────────────────────────────┘   │
                  └────────────────────────────────────────────────────────┘
```

### 2. Security & Network Model
1. **Inbound Ingress:** ECS security groups strictly restrict ingress traffic to port 3001 sourced **only from the ALB security group**. Direct public internet requests hitting the task's public IP are dropped at the hypervisor packet filter.
2. **Outbound Egress:** Image pulls from ECR, SSM secrets retrieval, CloudWatch logging, and Flagsmith SDK API requests route directly through the AWS Internet Gateway (IGW), which has **zero base hourly charge and zero per-GB gateway processing fee**.
3. **Database Security:** Aurora Serverless v2 subnets are configured as `PRIVATE_ISOLATED`. They have no routes to the Internet Gateway or any NAT Gateway. The Fargate tasks in the public subnets connect to the database via internal private IP addresses (`10.0.x.x`), keeping the database completely shielded from the public internet.

---

## Consequences
- **Positive:** Reduces fixed AWS idle infrastructure costs by ~\$33–\$36/month.
- **Positive:** Zero latency or bandwidth bottleneck from NAT Gateway data processing.
- **Neutral:** Fargate tasks consume a public IPv4 address billed at AWS standard public IPv4 rate (\$0.005/hr $\approx$ ~\$3.60/month per task), yielding a net savings of over ~\$32/month compared to NAT Gateway.
- **Positive:** Zero change to client experience, WebSocket performance, or database isolation.
