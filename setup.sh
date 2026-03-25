#!/bin/bash

# ===========================================
# AI 办公助手 - 快速启动脚本
# ===========================================

set -e

echo "🚀 AI 办公助手 - 快速启动"
echo "=========================================="

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

echo "✅ Node.js 版本：$(node -v)"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "❌ 错误：未找到 npm"
    exit 1
fi

echo "✅ npm 版本：$(npm -v)"

# 安装主项目依赖
echo ""
echo "📦 安装主项目依赖..."
npm install

# 安装 Worker 依赖
echo ""
echo "📦 安装 Worker 依赖..."
cd worker
npm install
cd ..

# 复制环境变量
if [ ! -f .env.local ]; then
    echo ""
    echo "📝 创建环境变量文件..."
    cp .env.example .env.local
    echo "⚠️  请编辑 .env.local 填入真实的环境变量值"
else
    echo "✅ .env.local 已存在"
fi

# 检查 Supabase CLI
if command -v supabase &> /dev/null; then
    echo ""
    echo "🔗 检测到 Supabase CLI"
    echo "   运行以下命令初始化数据库:"
    echo "   npx supabase db push"
else
    echo ""
    echo "⚠️  未检测到 Supabase CLI"
    echo "   安装：npm install -g supabase"
fi

echo ""
echo "=========================================="
echo "✅ 安装完成!"
echo ""
echo "📋 下一步:"
echo "   1. 编辑 .env.local 填入环境变量"
echo "   2. 运行 'npm run dev' 启动前端"
echo "   3. (新终端) cd worker && npm run dev 启动 API"
echo "   4. 访问 http://localhost:3000"
echo ""
echo "📖 详细文档:"
echo "   - README.md: 项目说明"
echo "   - API.md: API 接口文档"
echo "   - DEPLOYMENT.md: 部署指南"
echo "   - ARCHITECTURE.md: 技术架构"
echo "=========================================="
