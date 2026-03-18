ARG VARIANT="1-22-bookworm"
ARG IS_PROXY="false"
ARG CERT_NAME="YourRootCA"
FROM mcr.microsoft.com/devcontainers/typescript-node:${VARIANT}

ARG IS_PROXY
ARG CERT_NAME

RUN if [ "$IS_PROXY" = "true" ] ; then \
    echo "Configuring proxy settings..."; \
    fi

# Copy the entire withProxy directory to avoid file-not-found errors
# This ensures the build doesn't fail even when IS_PROXY=false
COPY .devcontainer/withProxy /tmp/withProxy

# Debug: Check what we have
RUN echo "=== DEBUGGING START ===" && \
    echo "IS_PROXY value: [$IS_PROXY]" && \
    echo "CERT_NAME value: [$CERT_NAME]" && \
    echo "Contents of /tmp/withProxy:" && \
    ls -laR /tmp/withProxy && \
    echo "=== DEBUGGING END ==="

RUN if [ "$IS_PROXY" = "true" ] ; then \
    # Check if certificate file exists and configure proxy settings
    CERT_FILE=$(find /tmp/withProxy -name "${CERT_NAME}.cer" -type f | head -n 1); \
        if [ -n "$CERT_FILE" ] && [ -f "$CERT_FILE" ]; then \
            echo "Setting up certificate for proxy environment..." && \
            cp "$CERT_FILE" "/usr/local/share/ca-certificates/${CERT_NAME}.crt" && \
            echo "Running update-ca-certificates..." && \
            update-ca-certificates --fresh --verbose > /tmp/update-ca-cert.log 2>&1 && \
            echo "=== UPDATE-CA-CERTIFICATES OUTPUT ===" && \
            cat /tmp/update-ca-cert.log && \
            echo "=== END OF OUTPUT ===" && \
            echo "=== Verifying certificate bundle ===" && \
            if [ -f /etc/ssl/certs/ca-certificates.crt ]; then \
                echo "✓ Certificate bundle exists" && \
                ls -lh /etc/ssl/certs/ca-certificates.crt; \
            else \
                echo "✗ ERROR: Certificate bundle NOT created" && \
                exit 1; \
            fi && \
            if [ -f "/usr/local/share/ca-certificates/${CERT_NAME}.crt" ]; then \
                echo "✓ Individual certificate file exists"; \
            else \
                echo "✗ ERROR: Individual certificate file missing" && \
                exit 1; \
            fi && \
            rm -rf /tmp/withProxy && \
            echo "Proxy configuration completed."; \
            else \
            echo "Warning: IS_PROXY is true but certificate file ${CERT_NAME}.cer not found"; \
            rm -rf /tmp/withProxy; \
        fi; \
    else \
    # Clean up copied files when proxy is not enabled
    rm -rf /tmp/withProxy; \
    fi

RUN if [ "$IS_PROXY" = "true" ] ; then \
    # Configure SSL settings and specify certificate path for npm
    npm config --global set cafile /etc/ssl/certs/ca-certificates.crt && \
    npm config --global set registry http://registry.npmjs.org/ && \
    npm config --global set strict-ssl false; \
    fi

ENV CURL_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    AWS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt \
    REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
#    SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt
#    NODE_EXTRA_CA_CERTS==/etc/ssl/certs/ca-certificates.crt \

# Install additional packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    graphviz \
    jq \
    git \
    curl \
    unzip \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install GH
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && sudo apt update \
    && sudo apt install gh -y

# Configure git for proxy if needed (requires git to be installed first)
RUN git config --system http.sslCAInfo "/etc/ssl/certs/ca-certificates.crt"

# Install AWS CLI v2 (architecture detection)
RUN ARCH=$(uname -m) && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-${ARCH}.zip" -o "awscliv2.zip"; \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf aws awscliv2.zip

# Install AWS Session Manager Plugin
RUN export OS_CPU="" && \
    if [ $(uname -m) = "x86_64" ]; then \
    export OS_CPU="ubuntu_64bit"; \
    elif [ $(uname -m) = "aarch64" ]; then \
    export OS_CPU="ubuntu_arm64"; \
    fi && \
    if [ -n "$OS_CPU" ]; then \
    curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/${OS_CPU}/session-manager-plugin.deb" \
    -o session-manager-plugin.deb && \
    apt-get update && \
    apt-get install -y ./session-manager-plugin.deb && \
    rm -rf ./session-manager-plugin.deb && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*; \
    else \
    echo "Unknown architecture for AWS Session Manager Plugin installation"; \
    fi

# Grant sudo privileges to node user
RUN echo "node ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/node

# install AWS CDK and TypeScript
RUN npm install -g aws-cdk aws-cdk-local typescript

# Set user to node
USER node
WORKDIR /home/node

# Configure certificate path for Git
# Reconfigure npm settings for node user (just in case)
RUN npm config set cafile /etc/ssl/certs/ca-certificates.crt \
    && npm config set registry https://registry.npmjs.org/ \
    && npm config set strict-ssl true \
    && if [ "$IS_PROXY" = "true" ]; then git config --global http.sslCAInfo "/usr/local/share/ca-certificates/${CERT_NAME}.crt"; fi

# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
# Add .local/bin to PATH
ENV PATH="/home/node/.local/bin:${PATH}"

# LocalStack CLI
#RUN pip3 install --user awscli-local --break-system-packages

#ARG LOCALSTACK_VERSION="4.9.1"
#RUN export FILE="" && \
#    if [ $(uname -m) = "x86_64" ]; then \
#    export FILE="localstack-cli-${LOCALSTACK_VERSION}-linux-amd64-onefile.tar.gz"; \
#    elif [ $(uname -m) = "aarch64" ]; then \
#    export FILE="localstack-cli-${LOCALSTACK_VERSION}-linux-arm64-onefile.tar.gz"; \
#    fi && \
#    if [ -n "$FILE" ]; then \
#    echo "v${LOCALSTACK_VERSION}/Downloading ${FILE}" && \
#    curl --output "${FILE}" --location "https://github.com/localstack/localstack-cli/releases/download/v${LOCALSTACK_VERSION}/${FILE}" && \
#    sudo tar xvzf "${FILE}" -C /usr/local/bin && \
#    rm "${FILE}"; \
#    fi

# Install git-remote-codecommit
RUN pip3 install --user git-remote-codecommit --break-system-packages

# The Kiro CLI is the new name and successor to the Amazon Q Developer CLI
## Install Amazon Q CLI
#RUN export OS=$(uname -m) && \
#    if [ -n "$OS" ]; then \
#    curl --proto '=https' --tlsv1.2 -sSf "https://desktop-release.q.us-east-1.amazonaws.com/latest/q-${OS}-linux-musl.zip" -o "/tmp/q.zip" && \
#    cd /tmp && \
#    unzip q.zip && \
#    cd q && \
#    ./install.sh --no-confirm&& \
#    cd / && \
#    sudo rm -rf /tmp/q && \
#    sudo rm -f /tmp/q.zip; \
#    fi
# Install Kiro CLI
RUN export OS=$(uname -m) && \
    if [ -n "$OS" ]; then \
    curl --proto '=https' --tlsv1.2 -sSf "https://desktop-release.q.us-east-1.amazonaws.com/latest/kirocli-${OS}-linux-musl.zip" -o "/tmp/kirocli.zip" && \
    cd /tmp && \
    unzip kirocli.zip && \
    cd kirocli && \
    ./install.sh --no-confirm&& \
    cd / && \
    sudo rm -rf /tmp/kirocli && \
    sudo rm -f /tmp/kirocli.zip; \
    fi

# Install Act
RUN curl --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Set PATH for container startup
ENV PATH="/home/node/.local/bin:${PATH}"