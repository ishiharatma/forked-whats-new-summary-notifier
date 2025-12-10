FROM public.ecr.aws/lambda/python:3.12

ARG FILE_PATH=selenium-p3.12.zip
WORKDIR /work

# システム更新と必要なパッケージのインストール（curl競合を回避）
RUN dnf update -y && dnf install -y \
    zip \
    unzip \
    wget \
    && dnf clean all

# requirements.txtをコンテナにコピー
COPY src/requirements.txt /work/requirements.txt

# Pythonパッケージのインストール
RUN pip install --upgrade pip && \
    pip install -r requirements.txt -t /opt/python/

# Google Chrome Stableのインストール
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /etc/pki/rpm-gpg/google-signing-key.gpg && \
    echo "[google-chrome]" > /etc/yum.repos.d/google-chrome.repo && \
    echo "name=google-chrome" >> /etc/yum.repos.d/google-chrome.repo && \
    echo "baseurl=http://dl.google.com/linux/chrome/rpm/stable/x86_64" >> /etc/yum.repos.d/google-chrome.repo && \
    echo "enabled=1" >> /etc/yum.repos.d/google-chrome.repo && \
    echo "gpgcheck=1" >> /etc/yum.repos.d/google-chrome.repo && \
    echo "gpgkey=file:///etc/pki/rpm-gpg/google-signing-key.gpg" >> /etc/yum.repos.d/google-chrome.repo && \
    dnf install -y google-chrome-stable

# ChromeバイナリをLayerディレクトリにコピー
RUN mkdir -p /opt/chrome && \
    cp /usr/bin/google-chrome /opt/chrome/chrome

# ChromeDriverの最新版をダウンロードしてインストール
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}' | cut -d. -f1-3) && \
    CHROMEDRIVER_VERSION=$(wget -qO- "https://chromedriver.storage.googleapis.com/LATEST_RELEASE_${CHROME_VERSION}") && \
    wget -qO /tmp/chromedriver_linux64.zip "https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip" && \
    mkdir -p /opt/chromedriver && \
    unzip /tmp/chromedriver_linux64.zip -d /opt/chromedriver && \
    chmod +x /opt/chromedriver/chromedriver && \
    rm /tmp/chromedriver_linux64.zip

# CDK用に適切な構造でアーカイブを作成
ENTRYPOINT [""]
CMD [ "sh", "-c", "mkdir -p /asset-output && cd /opt && zip -r /asset-output/layer.zip python/ chrome/ chromedriver/" ]
