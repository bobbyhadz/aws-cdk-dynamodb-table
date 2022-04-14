import * as appautoscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

export class CdkStarterStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 👇 create Dynamodb table
    const table = new dynamodb.Table(this, id, {
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      sortKey: {name: 'createdAt', type: dynamodb.AttributeType.NUMBER},
      pointInTimeRecovery: true,
    });

    console.log('table name 👉', table.tableName);
    console.log('table arn 👉', table.tableArn);

    // 👇 add local secondary index
    table.addLocalSecondaryIndex({
      indexName: 'statusIndex',
      sortKey: {name: 'status', type: dynamodb.AttributeType.STRING},
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // 👇 grant permissions on table
    table.grantReadData(new iam.AccountRootPrincipal());

    // 👇 configure auto scaling on table
    const writeAutoScaling = table.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: 2,
    });

    // 👇 scale up when write capacity hits 75%
    writeAutoScaling.scaleOnUtilization({
      targetUtilizationPercent: 75,
    });

    // 👇 scale up at 9 o'clock in the morning
    writeAutoScaling.scaleOnSchedule('scale-up', {
      schedule: appautoscaling.Schedule.cron({hour: '9', minute: '0'}),
      minCapacity: 2,
    });

    // 👇 scale down in the afternoon
    writeAutoScaling.scaleOnSchedule('scale-down', {
      schedule: appautoscaling.Schedule.cron({hour: '14', minute: '0'}),
      maxCapacity: 2,
    });
  }
}
