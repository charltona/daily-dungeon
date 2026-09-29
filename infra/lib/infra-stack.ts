import * as cdk from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as iam from 'aws-cdk-lib/aws-iam';

export class InfraStack extends cdk.Stack {
  public readonly githubDeployRole: iam.Role;
  public readonly repository: ecr.Repository;

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

    // 2b. Dedicated ECR Repository for Daily Dungeon application container images
    this.repository = new ecr.Repository(this, 'DailyDungeonRepository', {
      repositoryName: 'daily-dungeon-app',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      lifecycleRules: [
        {
          description: 'Keep last 5 images to control storage costs',
          maxImageCount: 5,
        },
      ],
    });

    // 3. Application Load Balanced Fargate Service
    const imageTag = process.env.IMAGE_TAG || 'latest';
    const containerImage = ecs.ContainerImage.fromEcrRepository(this.repository, imageTag);

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
          image: containerImage,
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

    // Grant ECS execution role permissions to pull from the dedicated ECR repository
    this.repository.grantPull(service.taskDefinition.executionRole!);

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

    // Allow role to authenticate with ECR globally
    this.githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcrAuthToken',
        effect: iam.Effect.ALLOW,
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      })
    );

    // Grant role pull/push access to the dedicated application ECR repository
    this.repository.grantPullPush(this.githubDeployRole);

    // Allow role to describe ECR repositories
    this.githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcrDescribeRepositories',
        effect: iam.Effect.ALLOW,
        actions: ['ecr:DescribeRepositories'],
        resources: [this.repository.repositoryArn],
      })
    );

    // Allow role to describe services/tasks, register new task definitions, and update ECS service
    this.githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'EcsDeployment',
        effect: iam.Effect.ALLOW,
        actions: [
          'ecs:ListServices',
          'ecs:DescribeServices',
          'ecs:DescribeTaskDefinition',
          'ecs:RegisterTaskDefinition',
          'ecs:UpdateService',
          'ecs:ListTasks',
          'ecs:DescribeTasks',
        ],
        resources: ['*'],
      })
    );

    // Allow role to pass task execution and task roles to ECS when registering task definition
    this.githubDeployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'IamPassRoleForEcs',
        effect: iam.Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [
          service.taskDefinition.taskRole.roleArn,
          service.taskDefinition.executionRole!.roleArn,
        ],
        conditions: {
          StringEquals: {
            'iam:PassedToService': 'ecs-tasks.amazonaws.com',
          },
        },
      })
    );

    // Output the Role ARN for seamless CI/CD reference
    new cdk.CfnOutput(this, 'GitHubActionsDeployRoleArn', {
      value: this.githubDeployRole.roleArn,
      description: 'ARN of the IAM Role assumed by GitHub Actions via OIDC',
      exportName: 'DailyDungeonGitHubDeployRoleArn',
    });

    // Output ECR repository URI and name
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: this.repository.repositoryUri,
      description: 'URI of the Daily Dungeon ECR Repository',
      exportName: 'DailyDungeonEcrRepositoryUri',
    });

    new cdk.CfnOutput(this, 'EcrRepositoryName', {
      value: this.repository.repositoryName,
      description: 'Name of the Daily Dungeon ECR Repository',
      exportName: 'DailyDungeonEcrRepositoryName',
    });

    // Output ECS Cluster and Service names
    new cdk.CfnOutput(this, 'DailyDungeonClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
      exportName: 'DailyDungeonClusterName',
    });

    new cdk.CfnOutput(this, 'DailyDungeonServiceName', {
      value: service.service.serviceName,
      description: 'ECS Service Name',
      exportName: 'DailyDungeonServiceName',
    });
  }
}
