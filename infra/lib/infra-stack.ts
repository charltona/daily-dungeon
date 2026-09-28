import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. AWS VPC for ECS tasks and private Aurora DB connectivity (ADR 0003)
    const vpc = new ec2.Vpc(this, 'DailyDungeonVpc', {
      maxAzs: 2,
      natGateways: 1,
    });

    // 2. ECS Cluster
    const cluster = new ecs.Cluster(this, 'DailyDungeonCluster', {
      vpc,
      clusterName: 'daily-dungeon-cluster',
    });

    // Flagsmith Server SDK Key referenced securely from AWS Systems Manager Parameter Store (never in code)
    const flagsmithServerKeyParam = ssm.StringParameter.fromStringParameterName(
      this,
      'FlagsmithServerKeyParam',
      '/daily-dungeon/flagsmith/server-key'
    );

    // 3. Application Load Balanced Fargate Service
    const monorepoRoot = path.resolve(__dirname, '../../');
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'DailyDungeonService',
      {
        cluster,
        memoryLimitMiB: 512,
        cpu: 256,
        desiredCount: 1,
        circuitBreaker: { rollback: true },
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(monorepoRoot),
          containerPort: 3001,
          environment: {
            NODE_ENV: 'production',
            PORT: '3001',
          },
          secrets: {
            FLAGSMITH_SERVER_KEY: ecs.Secret.fromSsmParameter(flagsmithServerKeyParam),
          },
        },
        publicLoadBalancer: true,
      }
    );

    // Configure health check path
    service.targetGroup.configureHealthCheck({
      path: '/api/health',
      interval: cdk.Duration.seconds(30),
      timeout: cdk.Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });
  }
}
