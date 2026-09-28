import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class InfraStack extends cdk.Stack {
  public readonly githubDeployRole: iam.Role;

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

    // 4. GitHub Actions OIDC Deployment Role
    const githubDomain = 'token.actions.githubusercontent.com';
    const githubProviderArn = `arn:aws:iam::${this.account}:oidc-provider/${githubDomain}`;
    const githubProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOidcProvider',
      githubProviderArn
    );

    this.githubDeployRole = new iam.Role(this, 'GitHubDeployRole', {
      roleName: 'DailyDungeonGitHubDeployRole',
      description: 'Deployment role assumed by GitHub Actions for Daily Dungeon CI/CD',
      assumedBy: new iam.OpenIdConnectPrincipal(githubProvider, {
        StringEquals: {
          [`${githubDomain}:aud`]: 'sts.amazonaws.com',
        },
        StringLike: {
          [`${githubDomain}:sub`]: [
            'repo:charltona/daily-dungeon:*',
            'repo:charltona@2724511/daily-dungeon@1390073548:*',
          ],
        },
      }),
    });

    // Allow role to assume CDK bootstrap deployment and publishing roles
    this.githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CdkBootstrapRoleAssumption',
        effect: iam.Effect.ALLOW,
        actions: ['sts:AssumeRole'],
        resources: [`arn:aws:iam::${this.account}:role/cdk-*-${this.account}-*`],
      })
    );

    // Output the Role ARN for seamless CI/CD reference
    new cdk.CfnOutput(this, 'GitHubActionsDeployRoleArn', {
      value: this.githubDeployRole.roleArn,
      description: 'ARN of the IAM Role assumed by GitHub Actions via OIDC',
      exportName: 'DailyDungeonGitHubDeployRoleArn',
    });
  }
}
