#!/bin/bash

# PuppyResearch 后端启动脚本
# 自动处理端口占用问题

PORT=8000
PROJECT_DIR="/Users/supersayajin/Desktop/puppyresearch/PuppyResearch"

echo "🔍 Checking if port $PORT is already in use..."

# 查找占用端口的进程
PID=$(lsof -ti :$PORT)

if [ ! -z "$PID" ]; then
    echo "⚠️  Port $PORT is in use by process $PID"
    echo "🛑 Stopping existing process..."
    kill $PID
    sleep 2
    echo "✅ Process stopped"
else
    echo "✅ Port $PORT is available"
fi

echo ""
echo "🚀 Starting PuppyResearch backend..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_DIR"
source researchenv/bin/activate
python deep_wide_research/main.py
