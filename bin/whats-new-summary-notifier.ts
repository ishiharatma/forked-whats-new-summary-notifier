#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { WhatsNewSummaryNotifierStack } from '../lib/whats-new-summary-notifier-stack';
import { AppParameters } from '../parameters/environment';

const PROJECT_NAME = 'whats-new-summary-notifier';

const appEnv = process.env.APP_ENV;
if (!appEnv) {
  throw new Error(
    'APP_ENV environment variable is required.\n' +
      `Usage: APP_ENV=<env> cdk deploy --profile ${PROJECT_NAME}-<env>\n` +
      `Example: APP_ENV=dev cdk deploy --profile ${PROJECT_NAME}-dev`
  );
}

const parameterFilePath = path.join(__dirname, `../parameters/${PROJECT_NAME}-${appEnv}-parameters`);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const parameters: AppParameters = require(parameterFilePath).default;

const app = new cdk.App();
new WhatsNewSummaryNotifierStack(app, 'WhatsNewSummaryNotifierStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  parameters,
});
