import * as cdk from 'aws-cdk-lib/core';
import { Template } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';

test('InfraStack synthesizes VPC, ECS Cluster, and ALB Fargate Service', () => {
  const app = new cdk.App();
  const stack = new InfraStack(app, 'TestDailyDungeonInfraStack');
  const template = Template.fromStack(stack);

  template.hasResourceProperties('AWS::EC2::VPC', {
    EnableDnsHostnames: true,
    EnableDnsSupport: true,
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
});

