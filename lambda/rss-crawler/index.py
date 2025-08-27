# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import boto3
import datetime
import feedparser
import json
import os
import dateutil.parser
from botocore.exceptions import ClientError

# CRAWL_BLOG_URL = json.loads(os.environ["RSS_URL"])
# NOTIFIERS = json.loads(os.environ["NOTIFIERS"])

DDB_TABLE_NAME = os.environ["DDB_TABLE_NAME"]
dynamo = boto3.resource("dynamodb")
table = dynamo.Table(DDB_TABLE_NAME)


def recently_published(pubdate, max_old_days):
    """Check if the publication date is recent

    Args:
        pubdate (str): The publication date and time
    """
    elapsed_time = datetime.datetime.now() - str2datetime(pubdate)
    print(elapsed_time)
    if elapsed_time.days > max_old_days:
        return False

    return True


def str2datetime(time_str):
    """Convert the date format from the blog text to datetime

    Args:
        time_str (str): The date and time string, e.g., "Tue, 20 Sep 2022 16:05:47 +0000"
    """

    return dateutil.parser.parse(time_str, ignoretz=True)


def write_to_table(link, title, category, pubtime, notifier_name, service_categories, marketing_architectures):
    """Write a blog post to DynamoDB

    Args:
        link (str): The URL of the blog post
        title (str): The title of the blog post
        category (str): The category of the blog post
        pubtime (str): The publication date of the blog post
    """
    try:
        # 現在日時
        now = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=9)))
        # 書式を yyyy/mm/dd HH:mm:ss に変換
        formatted_now = now.strftime("%Y/%m/%d %H:%M:%S")

        item = {
            "url": link,
            "notifier_name": notifier_name,
            "title": title,
            "category": category,
#            "service_categories": service_categories if service_categories else None,
#            "marketing_architectures": marketing_architectures if marketing_architectures else None,
            "pubtime": pubtime,
            "created_at_jst": formatted_now,
        }
        # DynamoDBは空の配列をサポートしないため、空でない場合のみ追加
        if service_categories:  # 空のリストでない場合のみ追加
            item["service_categories"] = service_categories
            
        if marketing_architectures:  # 空のリストでない場合のみ追加
            item["marketing_architectures"] = marketing_architectures

        print(item)
        # url が存在しない場合のみ書き込み
        # 重複する場合は、ConditionalCheckFailedException が発生する
        table.put_item(Item=item, ConditionExpression="attribute_not_exists(url)")
        print("Put item succeeded: " + title)
    except ClientError as e:
        if e.response["Error"]["Code"] == "ConditionalCheckFailedException":
            print("Duplicate item put: " + title)
        else:
            print(f"DynamoDB ClientError: {e.response['Error']['Code']} - {e.response['Error']['Message']}")
    except Exception as e:
        print(f"Unexpected error: {str(e)}")

def add_blog(rss_name, entries, notifier_name, max_old_days):
    """Add blog posts

    Args:
        rss_name (str): The category of the blog (RSS unit)
        entries (List): The list of blog posts
    """

    for entry in entries:
        if recently_published(entry["published"], max_old_days):
            categories = entry.get("category", "")
            if categories:
                categories = categories.split(",")
            else:
                categories = []
            # categoryには、general:products/amazon-rds,marketing:marchitecture/databasesのようにカンマ区切りで格納されている
            # general:productsで始まるものは、"/"以降(例：amazon-rds)をservice_categoriesにJSON配列で格納
            # marketing:architectureで始まるものは、"/"以降（例：databases）をmarketing_architecturesにJSON配列で格納する
            service_categories = []
            marketing_architectures = []
            for category in categories:
                category = category.strip()  # 空白を除去
                if category.startswith("general:products/"):
                    service_categories.append(category.split("/")[1])
                elif category.startswith("marketing:marchitecture/"):
                    marketing_architectures.append(category.split("/")[1])

            write_to_table(
                entry["link"],
                entry["title"],
                rss_name,
                str2datetime(entry["published"]).isoformat(),
                notifier_name,
                service_categories,
                marketing_architectures
            )
        else:
            print("Old blog entry. skip: " + entry["title"])


def handler(event, context):
    notifier_name, notifier = event.values()

    rss_urls = notifier["rssUrl"]
    max_old_days = int(notifier.get("maxOldDays", 7))
    for rss_name, rss_url in rss_urls.items():
        rss_result = feedparser.parse(rss_url)
        print(json.dumps(rss_result))
        print("RSS updated " + rss_result["feed"]["updated"])
        if not recently_published(rss_result["feed"]["updated"], max_old_days):
            # Do not process RSS feeds that have not been updated for a certain period of time.
            # If you want to retrieve from the past, change this number of days and re-import.
            print("Skip RSS " + rss_name)
            continue
        add_blog(rss_name, rss_result["entries"], notifier_name, max_old_days)
