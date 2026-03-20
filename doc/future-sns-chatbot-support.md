# SNS + Chatbot 経由通知への変更案

## 背景

現在 notify-to-app Lambda では Webhook (URL) と SNS の2つの送信経路が `distinationType` で分岐されているが、SNS 経路にはバグおよび Chatbot 対応上の課題がある。

## 現状の問題点

### 1. `Message` に bytes 型を渡している

```python
encoded_msg = json.dumps(msg).encode("utf-8")  # bytes型
sns_client.publish(
    TopicArn=destination_url,
    Message=encoded_msg  # SNS API は str 型を要求
)
```

`sns.publish()` の `Message` は文字列を期待するが、Webhook 用に `encode("utf-8")` した bytes をそのまま渡している。

### 2. メッセージ形式が Chatbot に非対応

- Slack 向け: Block Kit (rich_text) 形式の JSON
- Teams 向け: Adaptive Card 形式の JSON

AWS Chatbot はこれらのリッチフォーマットを解釈できず、プレーンテキストとして扱う。

## 修正案

`lambda/notify-to-app/index.py` の SNS 送信箇所（2箇所）を以下のように変更する。

### 記事通知部分（L467付近）

```python
elif destination_type == "SNS":
    plain_text = f"*{item['rss_title']}*\n{item['rss_link']}\n\n{item['summary']}\n\n{item['detail']}"
    sns_client.publish(
        TopicArn=destination_url,
        Message=plain_text
    )
```

### サマリー通知部分（L513付近）

```python
elif destination_type == "SNS":
    sns_client.publish(
        TopicArn=destination_url,
        Message=notification_message  # 既に str 型
    )
```

## 補足

- SNS メッセージ上限は 256KB。通常の記事要約では問題ないが、大量の detail を含む場合は注意。
- Chatbot 側で Slack/Teams チャンネルへのマッピング設定が別途必要。
