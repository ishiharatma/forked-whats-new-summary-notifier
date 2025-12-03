import { Construct } from 'constructs';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Table, AttributeType, BillingMode, StreamViewType } from 'aws-cdk-lib/aws-dynamodb';
import { Rule, Schedule, RuleTargetInput, CronOptions } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { Role, Policy, ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Runtime, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import * as path from 'path';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as logs from "aws-cdk-lib/aws-logs";
import * as logsDestinations from "aws-cdk-lib/aws-logs-destinations";
export class WhatsNewSummaryNotifierStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const region = Stack.of(this).region;
    const accountId = Stack.of(this).account;

    const modelRegion = this.node.tryGetContext('modelRegion');
    const modelId = this.node.tryGetContext('modelId');

    const notifiers: [] = this.node.tryGetContext('notifiers');
    const summarizers: [] = this.node.tryGetContext('summarizers');
    const notifierSummary: [] = this.node.tryGetContext('notifierSummary');
    const notifyDays: string = this.node.tryGetContext('notifyDays') || "3";

    // Create SNS Topic for notifying errors from Lambda functions
    const notifyTopic = new sns.Topic(this, 'NotifyTopic', {
      displayName: 'Notify Topic',
      enforceSSL: true,
    });
    // Create IAM Roles For SubscriptionFilter Lambda
    const subscriptionFilterLambdaRole = new Role(this, 'SubscriptionFilterLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    subscriptionFilterLambdaRole.attachInlinePolicy(
      new Policy(this, 'AllowSubscriptionFilterLogging', {
        statements: [
          new PolicyStatement({
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            effect: Effect.ALLOW,
            resources: [`arn:aws:logs:${region}:${accountId}:log-group:*`],
          }),
          new PolicyStatement({
            actions: ['sns:Publish'],
            effect: Effect.ALLOW,
            resources: [notifyTopic.topicArn],
          }),
        ],
      })
    );
    // Create Lambda for SubscriptionFilter
    const subscriptionFilterFunction = new PythonFunction(this, 'SubscriptionFilterFunction', {
      runtime: Runtime.PYTHON_3_11,
      entry: path.join(__dirname, '../lambda/logs-to-sns-chatbot'),
      handler: 'handler',
      index: 'index.py',
      timeout: Duration.seconds(30),
      logRetention: RetentionDays.ONE_WEEK,
      role: subscriptionFilterLambdaRole,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      loggingFormat: lambda.LoggingFormat.JSON,
      environment: {
        SNS_TOPIC_ARN: notifyTopic.topicArn,
      },
    });

    // Role for Lambda Function to post new entries written to DynamoDB to Slack or Microsoft Teams
    const notifyNewEntryRole = new Role(this, 'NotifyNewEntryRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    notifyNewEntryRole.attachInlinePolicy(
      new Policy(this, 'AllowNotifyNewEntryLogging', {
        statements: [
          new PolicyStatement({
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            effect: Effect.ALLOW,
            resources: [`arn:aws:logs:${region}:${accountId}:log-group:*`],
          }),
          new PolicyStatement({
            actions: ['bedrock:InvokeModel'],
            effect: Effect.ALLOW,
            resources: ['*'],
          }),
        ],
      })
    );

    // Role for Lambda function to fetch RSS and write to DynamoDB
    const newsCrawlerRole = new Role(this, 'NewsCrawlerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    newsCrawlerRole.attachInlinePolicy(
      new Policy(this, 'AllowNewsCrawlerLogging', {
        statements: [
          new PolicyStatement({
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            effect: Effect.ALLOW,
            resources: [`arn:aws:logs:${region}:${accountId}:log-group:*`],
          }),
        ],
      })
    );

    // DynamoDB to store RSS data
    const rssHistoryTable = new Table(this, 'WhatsNewRSSHistory', {
      partitionKey: { name: 'url', type: AttributeType.STRING },
      sortKey: { name: 'notifier_name', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_IMAGE,
    });
    const notifyHistoryTable = new Table(this, 'WhatsNewNotifyHistory', {
      partitionKey: { name: 'url', type: AttributeType.STRING },
      sortKey: { name: 'notifier_name', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });

    // Lambda Function to post new entries written to DynamoDB to Slack or Microsoft Teams
    const notifyNewEntry = new PythonFunction(this, 'NotifyNewEntry', {
      runtime: Runtime.PYTHON_3_11,
      entry: path.join(__dirname, '../lambda/notify-to-app'),
      handler: 'handler',
      index: 'index.py',
      timeout: Duration.seconds(180),
      logRetention: RetentionDays.TWO_WEEKS,
      role: notifyNewEntryRole,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      loggingFormat: lambda.LoggingFormat.JSON,
      reservedConcurrentExecutions: 1,
      environment: {
        MODEL_ID: modelId,
        MODEL_REGION: modelRegion,
        NOTIFIERS: JSON.stringify({
          notifierSummary: notifierSummary,
          ...notifiers,
        }),
        SUMMARIZERS: JSON.stringify(summarizers),
        DDB_TABLE_NAME: notifyHistoryTable.tableName,
        NOTIFY_DAYS: notifyDays,
      },
    });

    // add Subscription Filter to notifyNewEntry log group
    notifyNewEntry.logGroup.addSubscriptionFilter('NotifyNewEntryLogSubscription', {
      destination: new logsDestinations.LambdaDestination(subscriptionFilterFunction),
      filterPattern: logs.FilterPattern.any(
        logs.FilterPattern.stringValue('$.level', '=', 'ERROR'),
        //logs.FilterPattern.stringValue('$.level', '=', 'WARN')
      ),
      filterName: 'NotifyNewEntryErrorAndWarnFilter',
    });

    notifyNewEntry.addEventSource(
      new DynamoEventSource(rssHistoryTable, {
        startingPosition: StartingPosition.LATEST,
        batchSize: 1,
      })
    );

    // Allow writing to DynamoDB
    rssHistoryTable.grantWriteData(newsCrawlerRole);
    notifyHistoryTable.grantWriteData(notifyNewEntryRole);

    // Lambda Function to fetch RSS and write to DynamoDB
    const newsCrawler = new PythonFunction(this, `newsCrawler`, {
      runtime: Runtime.PYTHON_3_11,
      entry: path.join(__dirname, '../lambda/rss-crawler'),
      handler: 'handler',
      index: 'index.py',
      timeout: Duration.seconds(60),
      logRetention: RetentionDays.TWO_WEEKS,
      applicationLogLevelV2: lambda.ApplicationLogLevel.INFO,
      loggingFormat: lambda.LoggingFormat.JSON,
      role: newsCrawlerRole,
      environment: {
        DDB_TABLE_NAME: rssHistoryTable.tableName,
        NOTIFIERS: JSON.stringify(notifiers),
      },
    });

    // add Subscription Filter to newsCrawler log group
    newsCrawler.logGroup.addSubscriptionFilter('NewsCrawlerLogSubscription', {
      destination: new logsDestinations.LambdaDestination(subscriptionFilterFunction),
      filterPattern: logs.FilterPattern.any(
        logs.FilterPattern.stringValue('$.level', '=', 'ERROR'),
        //logs.FilterPattern.stringValue('$.level', '=', 'WARN')
      ),
      filterName: 'NewsCrawlerErrorAndWarnFilter',
    });

    for (const notifierName in notifiers) {
      const notifier = notifiers[notifierName];
      // const cron is a cronOption defined in a notifier. if it is not defined, set default schedule (every hour)
      const schedule: CronOptions = notifier['schedule'] || {
        minute: '0',
        hour: '*',
        day: '*',
        month: '*',
        year: '*',
      };
      const destinations: [] = notifier['destinations'] || [];

      destinations.forEach((destination, index) => {
        const destinationType = destination['type'];
        const parameterName = destination['parameterName'];
        const webhookUrlParameterStore = StringParameter.fromSecureStringParameterAttributes(
          this,
          `webhookUrlParameterStore-${notifierName}-${index}-${destinationType}`,
          {
            parameterName: parameterName,
          }
        );// add permission to Lambda Role
        webhookUrlParameterStore.grantRead(notifyNewEntryRole);

      });
      /*
      const webhookUrlParameterName = notifier['webhookUrlParameterName'];
      const webhookUrlParameterStore = StringParameter.fromSecureStringParameterAttributes(
        this,
        `webhookUrlParameterStore-${notifierName}`,
        {
          parameterName: webhookUrlParameterName,
        }
      );

      // add permission to Lambda Role
      webhookUrlParameterStore.grantRead(notifyNewEntryRole);
      */
      // Scheduled Rule for RSS Crawler
      // Run every hour, 24 hours a day
      // see https://docs.aws.amazon.com/AmazonCloudWatch/latest/events/ScheduledEvents.html#CronExpressions
      const rule = new Rule(this, `CheckUpdate-${notifierName}`, {
        schedule: Schedule.cron(schedule),
        enabled: true,
      });

      rule.addTarget(
        new LambdaFunction(newsCrawler, {
          event: RuleTargetInput.fromObject({ notifierName, notifier }),
          retryAttempts: 2,
        })
      );
    }
  }
}
