#!/bin/bash

# 启动 PuppyResearch 后端 API 服务器

echo "=================================="
echo "🐶 Starting PuppyResearch Backend"
echo "=================================="

# 激活虚拟环境
source researchenv/bin/activate

# 安装依赖（如果需要）
echo "📦 Checking dependencies..."
pip install -q -r deep_wide_research/requirements.txt

# 从项目根目录启动服务器（重要！）
echo "🚀 Starting API server..."
python deep_wide_research/api_server.py

