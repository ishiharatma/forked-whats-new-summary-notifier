import { AppParameters } from './environment';

/**
 * Parameters for the dev environment.
 *
 * Deploy command:
 *   PROJECT=kinanbu cdk deploy --profile kinanbu
 */
const parameters: AppParameters = {
  modelRegion: 'ap-northeast-1',
  modelId: 'apac.anthropic.claude-sonnet-4-20250514-v1:0',

  summarizers: {
    AwsSolutionsArchitectEnglish: {
      outputLanguage: 'English.',
      persona: 'solutions architect in AWS',
    },
    AwsSolutionsArchitectJapanese: {
      outputLanguage: 'Japanese. Each sentence must be output in polite and formal desu/masu style',
      persona: 'solutions architect in AWS',
    },
    SakuraCloudSolutionsArchitectJapanese: {
      outputLanguage: 'Japanese. Each sentence must be output in polite and formal desu/masu style',
      persona: 'solutions architect in Sakura Cloud',
    },
    AzureSolutionsArchitectJapanese: {
      outputLanguage: 'Japanese. Each sentence must be output in polite and formal desu/masu style',
      persona: 'solutions architect in Microsoft Azure',
    },
  },

  notifierSummary: {
    destinations: [],
  },

  notifyDays: '3',

  notifiers: {
    AwsWhatsNew: {
      destination: 'slackfree',
      summarizerName: 'AwsSolutionsArchitectJapanese',
      webhookUrlParameterName: '/WhatsNew/URL',
      destinations: [
        {
          type: 'teams',
          distinationType: 'URL',
          parameterName: '/WhatsNew/URL/Teams',
        },
      ],
      rssUrl: {
        "What's new": 'https://aws.amazon.com/about-aws/whats-new/recent/feed/',
      },
      maxOldDays: '7',
      promptVersion: 'v2',
    },
    AwsBlog: {
      destination: 'slackfree',
      summarizerName: 'AwsSolutionsArchitectJapanese',
      webhookUrlParameterName: '/Blog/URL',
      destinations: [
        {
          type: 'teams',
          distinationType: 'URL',
          parameterName: '/WhatsNew/URL/Teams',
        },
      ],
      rssUrl: {
        APNBlog: 'https://aws.amazon.com/blogs/apn/feed/',
        DevToolsBlog: 'https://aws.amazon.com/blogs/developer/feed/',
        ArchitectureBlog: 'https://aws.amazon.com/blogs/architecture/feed/',
        AIBlog: 'https://aws.amazon.com/blogs/machine-learning/feed/',
      },
      maxOldDays: '7',
      promptVersion: 'blog_v1',
    },
    AwsSecurityBlog: {
      destination: 'slackfree',
      summarizerName: 'AwsSolutionsArchitectJapanese',
      webhookUrlParameterName: '/SecurityBlog/URL',
      destinations: [
        {
          type: 'teams',
          distinationType: 'URL',
          parameterName: '/WhatsNew/URL/Teams',
        },
      ],
      rssUrl: {
        AwsSecurityBlog: 'http://blogs.aws.amazon.com/security/blog/feed/recentPosts.rss',
      },
      maxOldDays: '7',
      promptVersion: 'blog_v1',
    },
    SakuraCloudNews: {
      destination: 'slackfree',
      summarizerName: 'SakuraCloudSolutionsArchitectJapanese',
      webhookUrlParameterName: '/SakuraCloud/News/URL',
      destinations: [
        {
          type: 'teams',
          distinationType: 'URL',
          parameterName: '/SakuraCloud/News/URL/Teams',
        },
      ],
      rssUrl: {
        SakuraCloudNews: 'https://cloud.sakura.ad.jp/news/feed/',
      },
      maxOldDays: '7',
      promptVersion: 'sakura_v1',
    },
  },
};

export default parameters;
