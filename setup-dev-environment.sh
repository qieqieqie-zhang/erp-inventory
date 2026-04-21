#!/bin/bash
# setup-dev-environment.sh
# 本地开发环境初始化脚本（仅需运行一次）
#
# 功能：
#   1. 启用代码语法检查 hook（pre-commit）
#   2. 检查 Node.js 版本
#
# 用法：./setup-dev-environment.sh

set -e

echo "========== 开发环境初始化 =========="

# 1. 启用 pre-commit hook
echo ""
echo "[1/2] 启用 pre-commit hook..."
git config core.hooksPath .githooks
echo "  已设置 core.hooksPath = .githooks"

# 2. 检查 Node.js
echo ""
echo "[2/2] 检查 Node.js..."
if command -v node &> /dev/null; then
  NODE_VERSION=$(node -v)
  echo "  Node.js 版本: $NODE_VERSION"
else
  echo "  警告: 未检测到 Node.js，请先安装 https://nodejs.org/"
fi

# 3. 检查 MySQL 配置
echo ""
echo "[3/3] 检查 MySQL 配置..."
if [ -f "backend/.env" ]; then
  echo "  backend/.env 已存在"
else
  if [ -f "backend/.env.example" ]; then
    echo "  提示: 请复制 backend/.env.example 为 backend/.env 并填写数据库配置"
  else
    echo "  警告: 未找到 .env 配置文件"
  fi
fi

echo ""
echo "========== 初始化完成 =========="
echo ""
echo "后续开发："
echo "  提交代码前会自动检查 JS/Vue 语法错误"
echo ""
