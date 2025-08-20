#!/bin/bash
#set -ex
set -e

#cd /workspaces/${localWorkspaceFolderBasename}/infra
#test -f package.json && npm install || echo 'No package.json found, skipping npm install'

# nodeユーザーをdockerグループに追加
#sudo usermod -aG docker node
# Dockerソケットの権限を調整
#sudo chmod 666 /var/run/docker.sock

git config --global core.autocrlf false
git config --global core.filemode false


# NPM関連のエイリアス
echo 'alias npmfl="npm run format && npm run lint:fix"' >> ~/.bashrc

# CDK関連のエイリアス
echo 'alias cdksynth="npm run cdk synth"' >> ~/.bashrc

# AWS関連のエイリアス
# AWS SSOログインとget-caller-identityのエイリアス設定
# 基本コマンド（デフォルトプロファイル用）
echo 'alias awslogin="aws sso login && echo \"現在の認証情報:\" && aws sts get-caller-identity"' >> ~/.bashrc
#echo 'alias awslogin="aws sso login && echo \"現在の認証情報:\" && aws sts get-caller-identity"' >> ~/.zshrc
echo 'alias awsid="aws sts get-caller-identity"' >> ~/.bashrc
#echo 'alias awsid="aws sts get-caller-identity"' >> ~/.zshrc
# プロファイル一覧を表示するエイリアス
echo 'alias awslist="aws configure list-profiles"' >> ~/.bashrc
# デフォルトとなるプロファイルを切り替えるエイリアス
echo '
awsswp() {
  if [ -z "$1" ]; then
    echo "使用法: awsswp <プロファイル名>"
    return 1
  fi
  export AWS_DEFAULT_PROFILE="$1" && aws configure list || echo ""
  echo "デフォルトプロファイルを $1 に設定しました"
}
awsswback() {
  export AWS_DEFAULT_PROFILE=default && aws configure list || echo ""
  echo "プロファイルをデフォルトに戻しました"
}
' >> ~/.bashrc

# プロファイル指定可能なAWS SSOログイン関数
echo '
awsloginp() {
  if [ -z "$1" ]; then
    echo "使用法: awsloginp <プロファイル名>"
    return 1
  fi
  aws sso login --profile "$1" && echo "現在の認証情報 ($1):" && aws sts get-caller-identity --profile "$1"
}

# プロファイル指定可能なAWS認証情報確認関数
awsidp() {
  if [ -z "$1" ]; then
    echo "使用法: awsidp <プロファイル名>"
    return 1
  fi
  aws sts get-caller-identity --profile "$1"
}

# プロファイル指定可能なAWS SSOログイン関数
awsloginp() {
  if [ -z "$1" ]; then
    echo "使用法: awsloginp <プロファイル名>"
    return 1
  fi
  aws sso login --profile "$1" && echo "現在の認証情報 ($1):" && aws sts get-caller-identity --profile "$1"
}

# プロファイル指定可能なAWS認証情報確認関数
awsidp() {
  if [ -z "$1" ]; then
    echo "使用法: awsidp <プロファイル名>"
    return 1
  fi
  aws sts get-caller-identity --profile "$1"
}
' >> ~/.bashrc

# Amazon Q CLIのエイリアス
echo 'alias ql="q login"' >> ~/.bashrc
echo 'alias qd="q doctor"' >> ~/.bashrc
echo 'alias qc="q chat"' >> ~/.zshrc

# その他のエイリアス
# エイリアスのTipsを表示する関数
echo '
tips() {
  echo "-----------------------------------"
  echo "便利なコマンドTips"
  echo "-----------------------------------"
  echo "AWS関連："
  echo "  「awslist」: プロファイル一覧を表示"
  echo "  「awsswp <プロファイル名>」: デフォルトプロファイルを切り替え"
  echo "  「awsswback」: デフォルトプロファイルに戻す"
  echo "  「awslogin」: AWS SSOログイン + 現在の認証情報確認（デフォルトプロファイル）"
  echo "  「awsid」: 認証情報確認のみ（デフォルトプロファイル）"
  echo "  「awsloginp <プロファイル名>」: 指定プロファイルでAWS SSOログイン + 認証情報確認"
  echo "  「awsidp <プロファイル名>」: 指定プロファイルで認証情報確認のみ"
  echo ""
  echo "Amazon Q CLI関連："
  echo "  「ql」: Amazon Q CLIにログイン(q login)"
  echo "  「qd」: Amazon Q CLIの診断(q doctor)"
  echo "  「qc」: Amazon Q CLIのチャット(q chat)"
  echo ""
  echo "NPM関連："
  echo "  「npmfl」: linter および formatter の実行（npm run format && npm run lint:fix）"
  echo "CDK関連："
  echo "  「cdksynth」: CloudFormation テンプレートの生成（npm run cdk synth）"
  echo ""
  echo "その他："
  echo "  「tips」: このヘルプメッセージを表示"
  echo "-----------------------------------"
  echo "例:"
  echo "  awslogin             ： デフォルトプロファイルでログイン"
  echo "  awsloginp dev-admin  ： devプロファイルでログイン"
  echo "  npmfl                ： linter および formatter の実行"
  echo "-----------------------------------"
}
' >> ~/.bashrc

# 変更を現在のシェルに反映させる
#source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null
source ~/.bashrc 2>/dev/null

echo "=== Post-create setup starting ==="

echo "-----------------------------------"
echo "checking versions..."
echo "-----------------------------------"
if command -v node &> /dev/null; then
    echo "✅ Node is available"
    echo "node version: $(node -v)"
else
    echo "❌ Node not found"
fi
if command -v npm &> /dev/null; then
    echo "✅ NPM is available"
    echo "npm version: $(npm -v)"
else
    echo "❌ NPM not found"
fi

# Amazon Q CLIの設定確認
if command -v q &> /dev/null; then
    echo "✅ Amazon Q CLI is available"
    echo "Amazon Q CLI version:"
    q --version || echo "Version check failed but CLI is installed"
else
    echo "❌ Amazon Q CLI not found"
fi

# AWS CLIの設定確認
if command -v aws &> /dev/null; then
    echo "✅ AWS CLI is available"
    echo "AWS CLI version: $(aws --version)"
    echo "aws session manager plugin version: $(session-manager-plugin --version)"
else
    echo "❌ AWS CLI not found"
fi
# Pythonの設定確認
if command -v python3 &> /dev/null; then
    echo "✅ Python3 is available"
    echo "Python version:"
    python3 --version
else
    echo "❌ Python3 not found"
fi

# AWS CDKの設定確認
if command -v cdk &> /dev/null; then
    echo "✅ AWS CDK is available"
    echo "AWS CDK version: $(cdk --version)"
else
    echo "❌ AWS CDK not found"
fi
# Gitの設定確認
if command -v git &> /dev/null; then
    echo "✅ Git is available"
    echo "Git version: $(git --version)"
else
    echo "❌ Git not found"
fi

# UV, UVXの設定確認
if command -v uv &> /dev/null; then
    echo "✅ UV is available"
    echo "UV version: $(uv --version)"
else
    echo "❌ UV not found"
fi
if command -v uvx &> /dev/null; then
    echo "✅ UVX is available"
    echo "UVX version: $(uvx --version)"
else
    echo "❌ UVX not found"
fi

echo "-----------------------------------"
echo "checking aws configuration..."
echo "-----------------------------------"

echo "## aws configure list"
# "Error when retrieving token from sso: Token has expired and refresh failed" というエラーが出る場合に
# 戻り値が正常でなくなるため、echo ""をつけておく
# 本来は、aws sso login <profile>を実行してトークンを更新する必要がある
aws configure list || echo ""

echo "## aws configure list-profiles"
aws configure list-profiles || echo ""

# 初回のtips表示
echo "登録済みの便利なコマンドエイリアスは、tipsコマンドを実行して確認してください"