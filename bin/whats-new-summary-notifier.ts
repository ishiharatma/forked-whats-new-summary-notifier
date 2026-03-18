#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { WhatsNewSummaryNotifierStack } from '../lib/whats-new-summary-notifier-stack';
import { AppParameters } from '../parameters/environment';

const app = new cdk.App();

const project: string = process.env.PROJECT || app.node.tryGetContext('project') || 'home';
const environment: string = process.env.ENV || 'dev';

console.log(`Project: ${project}`);
console.log(`Environment: ${environment}`);

let profile = project;
if (!project) {
  throw new Error(
    'PROJECT environment variable is required.\n' +
      `Usage: PROJECT=<project> cdk deploy --profile ${project}\n` +
      `Example: PROJECT=home cdk deploy --profile ${project}`
  );
}

if (environment) {
  console.log(`Deploying with profile: ${project}-${environment}`);
  profile = `${project}-${environment}`;
} else {
  /*
  throw new Error(
    'APP_ENV environment variable is required.\n' +
      `Usage: APP_ENV=<env> cdk deploy --profile ${project}-<env>\n` +
      `Example: APP_ENV=dev cdk deploy --profile ${project}-dev`
  );
  */
}

const parameterFilePath = path.join(__dirname, `../parameters/${profile}-parameters`);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const parameters: AppParameters = require(parameterFilePath).default;

new WhatsNewSummaryNotifierStack(app, 'WhatsNewSummaryNotifierStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  parameters,
});
