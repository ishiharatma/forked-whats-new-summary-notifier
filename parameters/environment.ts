/**
 * Summarizer configuration for AI-powered summarization via Bedrock.
 */
export interface SummarizerConfig {
  /** Output language instruction (e.g., "Japanese. Each sentence must be output in polite and formal desu/masu style") */
  outputLanguage: string;
  /** Persona for the summarizer (e.g., "solutions architect in AWS") */
  persona: string;
}

/**
 * Destination configuration for notification delivery.
 */
export interface DestinationConfig {
  /** Destination type identifier (e.g., "slackfree", "teams") */
  type: string;
  /** Destination type (e.g., "URL") */
  distinationType: string;
  /** SSM Parameter Store parameter name storing the webhook URL */
  parameterName: string;
}

/**
 * Schedule configuration for EventBridge cron rules.
 */
export interface ScheduleConfig {
  minute?: string;
  hour?: string;
  day?: string;
  month?: string;
  year?: string;
  weekDay?: string;
}

/**
 * Notifier configuration for each RSS feed source.
 */
export interface NotifierConfig {
  /** Default destination type identifier */
  destination: string;
  /** Summarizer name referencing a key in AppParameters.summarizers */
  summarizerName: string;
  /** (Deprecated) Single webhook URL SSM Parameter Store name */
  webhookUrlParameterName?: string;
  /** List of notification destinations */
  destinations: DestinationConfig[];
  /** Map of feed label to RSS feed URL */
  rssUrl: Record<string, string>;
  /** Maximum age of RSS entries to process (in days, as string) */
  maxOldDays: string;
  /** Prompt version identifier for AI summarization */
  promptVersion: string;
  /** Optional cron schedule; defaults to hourly if omitted */
  schedule?: ScheduleConfig;
}

/**
 * Notifier summary configuration for aggregated notifications.
 */
export interface NotifierSummaryConfig {
  destinations: DestinationConfig[];
}

/**
 * Top-level application parameters loaded from environment-specific parameter files.
 *
 * Parameter files are named: parameters/{project}-{env}-parameters.ts
 * AWS profile naming convention: {project}-{env}
 *
 * Example deploy command:
 *   APP_ENV=dev cdk deploy --profile whats-new-summary-notifier-dev
 */
export interface AppParameters {
  /** AWS region where the Bedrock model is hosted */
  modelRegion: string;
  /** Bedrock model ID to use for summarization */
  modelId: string;
  /** Map of summarizer name to its configuration */
  summarizers: Record<string, SummarizerConfig>;
  /** Aggregated notifier summary destination configuration */
  notifierSummary: NotifierSummaryConfig;
  /** Number of days to look back when notifying (as string) */
  notifyDays: string;
  /** Map of notifier name to its configuration */
  notifiers: Record<string, NotifierConfig>;
}
