# ADR 0004: Elimination of AWS NAT Gateway & Adoption of Account Default VPC

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

Furthermore, updating the existing stack in-place while altering VPC subnets caused:
1. Subnet CIDR collisions (`10.0.3.0/24 conflicts with another subnet`) because CloudFormation provisions new subnets before destroying old ones.
2. Load Balancer security group errors (`One or more security groups are invalid`) because AWS Application Load Balancers cannot migrate across VPCs in-place.

---

## Decision Outcome
We decided to:
1. **Adopt the account's existing default VPC (`vpc-eb68978d`)** with `ec2.Vpc.fromLookup`.
2. **Eliminate the AWS NAT Gateway (`natGateways: 0`)** by deploying ECS Fargate tasks into the default VPC's public subnets with assigned public IPs (`assignPublicIp: true`).
3. **Recreate the ALB & Service construct (`DailyDungeonAppService`)**, ensuring CloudFormation provisions the new Load Balancer and Service cleanly in `vpc-eb68978d` before tearing down the old resources in the deprecated custom VPC.

### 1. Architectural Topology

```
                  ┌────────────────────────────────────────────────────────┐
                  │          AWS Default VPC (vpc-eb68978d)                │
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
                  │   └────────────────────────────────────────────────┘   │
                  └────────────────────────────────────────────────────────┘
```

### 2. Security & Network Model
1. **Inbound Ingress:** ECS security groups strictly restrict ingress traffic to port 3001 sourced **only from the ALB security group**. Direct public internet requests hitting the task's public IP are dropped at the hypervisor packet filter.
2. **Outbound Egress:** Image pulls from ECR, SSM secrets retrieval, CloudWatch logging, and Flagsmith SDK API requests route directly through the AWS Internet Gateway (IGW), which has **zero base hourly charge and zero per-GB gateway processing fee**.

---

## Consequences
- **Positive:** Reduces fixed AWS idle infrastructure costs by ~\$33–\$36/month.
- **Positive:** Reuses the existing default VPC, avoiding CIDR collisions and duplicate networking resources.
- **Positive:** Brand-new ALB construct ensures clean CloudFormation deployment without cross-VPC security group binding errors.
