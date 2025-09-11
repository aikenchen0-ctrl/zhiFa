#!/bin/bash

# 🔄 自动同步main分支到gh-pages分支脚本
# 用于GitHub Pages分支部署模式

echo "🔄 开始同步main分支到gh-pages..."

# 确保在main分支
git checkout main
echo "✅ 切换到main分支"

# 拉取最新更改
git pull origin main
echo "✅ 拉取main分支最新更改"

# 切换到gh-pages分支
git checkout gh-pages
echo "✅ 切换到gh-pages分支"

# 合并main分支的更改
git merge main
echo "✅ 合并main分支更改"

# 推送到远程gh-pages分支
git push origin gh-pages
echo "✅ 推送到gh-pages分支"

# 切换回main分支
git checkout main
echo "✅ 切换回main分支"

echo "🎉 同步完成！GitHub Pages将在1-2分钟内更新"
echo "🌐 访问链接: https://aikenchen0-ctrl.github.io/zhiFa/"