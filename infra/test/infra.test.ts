import * as cdk from 'aws-cdk-lib/core';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';

test('InfraStack synthesizes VPC, ECS Cluster, and ALB Fargate Service', () => {
  const app = new cdk.App();
  const stack = new InfraStack(app, 'TestDailyDungeonInfraStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
  });

  // Verify cost-optimization: 0 NAT Gateways provisioned
  template.resourceCountIs('AWS::EC2::NatGateway', 0);

  // Verify Fargate tasks run with public IP for free direct internet egress
  template.hasResourceProperties('AWS::ECS::Service', {
    NetworkConfiguration: Match.objectLike({
      AwsvpcConfiguration: Match.objectLike({
        AssignPublicIp: 'ENABLED',
      }),
    }),
  });

  template.hasResourceProperties('AWS::ECS::Cluster', {
    ClusterName: 'daily-dungeon-cluster',
  });

  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    Port: 80,
    Protocol: 'HTTP',
    HealthCheckPath: '/api/health',
  });

  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: [
      {
        Name: 'web',
        PortMappings: [
          {
            ContainerPort: 3001,
            Protocol: 'tcp',
          },
        ],
        Secrets: [
          {
            Name: 'FLAGSMITH_SERVER_KEY',
          },
        ],
      },
    ],
  });

  template.hasResourceProperties('AWS::IAM::Role', {
    RoleName: 'DailyDungeonGitHubDeployRole',
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRoleWithWebIdentity',
          Effect: 'Allow',
          Condition: {
            StringEquals: {
              'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            },
            StringLike: {
              'token.actions.githubusercontent.com:sub': [
                'repo:charltona/daily-dungeon:*',
                'repo:charltona@2724511/daily-dungeon@1390073548:*',
              ],
            },
          },
        },
      ],
    },
  });

  template.hasOutput('GitHubActionsDeployRoleArn', {
    Export: {
      Name: 'DailyDungeonGitHubDeployRoleArn',
    },
  });

  template.hasResourceProperties('AWS::ECR::Repository', {
    RepositoryName: 'daily-dungeon-app',
    ImageScanningConfiguration: {
      ScanOnPush: true,
    },
    ImageTagMutability: 'MUTABLE',
  });

  template.hasOutput('EcrRepositoryUri', {
    Export: {
      Name: 'DailyDungeonEcrRepositoryUri',
    },
  });

  template.hasOutput('DailyDungeonServiceName', {
    Export: {
      Name: 'DailyDungeonServiceName',
    },
  });
});

test('InfraStack configures ECS task definition with ECR image when IMAGE_TAG is provided', () => {
  const originalEnv = process.env.IMAGE_TAG;
  try {
    process.env.IMAGE_TAG = 'test-sha-12345';
    const app = new cdk.App();
    const stack = new InfraStack(app, 'TestDailyDungeonWithEcrTag');
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Name: 'web',
          Image: {
            'Fn::Join': [
              '',
              Match.arrayWith([':test-sha-12345']),
            ],
          },
        }),
      ]),
    });
  } finally {
    process.env.IMAGE_TAG = originalEnv;
  }
});


