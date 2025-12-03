import base64
import gzip
import json
import os
import boto3

from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
# from aws_lambda_powertools.logging.formatters.datadog import DatadogLogFormatter
from aws_xray_sdk.core import patch_all

logger = Logger(service="whats-new-summary-notifier")
tracer = Tracer(service="whats-new-summary-notifier")
metrics = Metrics(namespace="WhatsNewSummaryNotifier", service="whats-new-summary-notifier")

# Initialize X-Ray SDK
patch_all()

# SNSクライアントの初期化
sns = boto3.client('sns')

@logger.inject_lambda_context(log_event=True)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
def handler(event, context):
    """
    CloudWatch Logsのサブスクリプションフィルターからのデータを受け取り、
    ERRORまたはFATALを含むログメッセージをSNSトピックに転送します
    """
    try:
        logger.info('Received event: %s', json.dumps(event))
        
        # SNSトピックARNを環境変数から取得
        sns_topic_arn = os.environ['SNS_TOPIC_ARN']
        
        # CloudWatch Logsからのデータはbase64圧縮形式で送られてくる
        cw_data = event.get('awslogs', {}).get('data')
        if not cw_data:
            logger.error('No CloudWatch Logs data found in event')
            return {
                'statusCode': 400,
                'body': json.dumps('No CloudWatch Logs data found in event')
            }
        
        # データをデコードおよび解凍
        compressed_payload = base64.b64decode(cw_data)
        uncompressed_payload = gzip.decompress(compressed_payload)
        payload = json.loads(uncompressed_payload)
        
        logger.info('Decoded payload: %s', json.dumps(payload))
        
        # ログイベントを処理
        log_group = payload.get('logGroup', 'Unknown LogGroup')
        log_stream = payload.get('logStream', 'Unknown LogStream')
        log_events = payload.get('logEvents', [])
        
        if not log_events:
            logger.info('No log events found in payload')
            return {
                'statusCode': 200,
                'body': json.dumps('No log events found in payload')
            }
        
        # メッセージを構築してSNSに送信
        for event in log_events:
            message_id = event.get('id', 'Unknown ID')
            timestamp = event.get('timestamp', 0)
            message = event.get('message', '')
            #sns_message = {
            #    'severity': 'ERROR' if 'ERROR' in message else 'FATAL',
            #    'logGroup': log_group,
            #    'logStream': log_stream,
            #    'messageId': message_id,
            #    'timestamp': timestamp,
            #    'message': message
            #}
            # level: メッセージにERRORが含まれていればERROR, FATALが含まれていればFATAL、それ以外はINFO
            level = 'ERROR' if 'ERROR' in message else 'FATAL' if 'FATAL' in message else 'INFO'
            # severity: ERRORならば HIGH, FATAL ならば、CRITICAL、それ以外はMEDIUM
            severity = 'HIGH' if 'ERROR' in message else 'CRITICAL' if 'FATAL' in message else 'MEDIUM'

            # ERRORまたはFATALを含むメッセージだけを処理（フィルターで既に絞られているはずだが念のため）
            if 'ERROR' in message or 'FATAL' in message:
                # SNSメッセージを構築
                sns_message_attributes = {
                    'level': {
                        'DataType': 'String',
                        'StringValue': level
                    },
                    'severity': {
                        'DataType': 'String',
                        'StringValue': severity
                    },
                    'logGroup': {
                        'DataType': 'String',
                        'StringValue': log_group
                    },
                    'logStream': {
                        'DataType': 'String',
                        'StringValue': log_stream
                    },
                    'eventSourceId': {
                        'DataType': 'String',
                        'StringValue': message_id
                    },
                    'eventTime': {
                        'DataType': 'Number',
                        'StringValue': str(timestamp)
                    }
                }
                
                # SNSトピックにメッセージを送信
                try:
                    response = sns.publish(
                        TopicArn=sns_topic_arn,
                        Subject=f"${level}が検出されました:{log_group}",
                        Message=message, #json.dumps(sns_message, ensure_ascii=False, indent=2)
                        MessageAttributes=sns_message_attributes,
                    )
                    logger.debug('message: %s', message)
                    logger.debug('sns_message_attributes: %s', sns_message_attributes)
                    logger.debug('Message published to SNS: %s', response['MessageId'])
                except Exception as e:
                    logger.error('Error publishing message to SNS: %s', str(e))
        
        return {
            'statusCode': 200,
            'body': json.dumps('Log events processed successfully')
        }

    except Exception as e:
        logger.exception(str(e))
        return {
            'statusCode': 500,
            'body': json.dumps(str(e))
        }
    finally:
        logger.info('complete')
