#!/bin/bash

echo "🔧 启用Claude-Flow自动Git提交..."

# 1. 初始化Git仓库（如果还没有）
if [ ! -d ".git" ]; then
    echo "📦 初始化Git仓库..."
    git init
    git add .
    git commit -m "Initial claude-flow workspace setup"
else
    echo "✅ Git仓库已存在"
fi

# 2. 备份原配置
cp .claude/settings.json .claude/settings.json.backup
cp claude-flow.config.json claude-flow.config.json.backup

# 3. 更新.claude/settings.json
echo "⚙️ 更新Claude设置..."
jq '.env.CLAUDE_FLOW_AUTO_COMMIT = "true"' .claude/settings.json > .claude/settings.json.tmp && mv .claude/settings.json.tmp .claude/settings.json

# 4. 更新claude-flow.config.json
echo "⚙️ 更新Claude-Flow配置..."
jq '.features.spark_commit_on_default_branch = true | .git = {"auto_commit": true, "commit_prefix": "spark:", "default_branch": "main"}' claude-flow.config.json > claude-flow.config.json.tmp && mv claude-flow.config.json.tmp claude-flow.config.json

echo "✅ 自动Git提交已启用！"
echo ""
echo "📋 配置摘要:"
echo "  • CLAUDE_FLOW_AUTO_COMMIT: true"
echo "  • spark_commit_on_default_branch: true"
echo "  • Git仓库: 已初始化"
echo ""
echo "🚀 现在可以使用自动提交功能："
echo "  npx claude-flow@alpha swarm \"implement new feature\""
echo ""