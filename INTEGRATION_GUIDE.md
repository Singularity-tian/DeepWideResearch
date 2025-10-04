# 🐶 PuppyResearch 前后端集成完成指南

## 📋 已完成的工作

### ✅ 后端 API 服务器 (FastAPI)

**文件**: `deep_wide_research/api_server.py`

- 创建了 FastAPI 服务器来暴露深度研究引擎
- 配置了 CORS 允许前端跨域访问
- 提供了 `/api/research` POST 端点来接收研究请求

**主要端点**:
- `GET /` - API 信息
- `GET /health` - 健康检查
- `POST /api/research` - 执行深度研究

### ✅ 前端聊天界面 (Next.js + PuppyChat)

**文件**: `chat_interface/app/page.tsx`

- 使用 PuppyChat SDK 的 ChatMain 组件
- 实现了与后端 API 的连接
- 添加了消息历史追踪
- 错误处理和用户友好的错误提示

### ✅ 启动脚本

**文件**: `start_backend.sh`

- 一键启动后端服务器的便捷脚本
- 自动激活虚拟环境
- 安装依赖并启动服务

## 🚀 快速启动

### 方法一：使用启动脚本（推荐）

#### 终端 1 - 启动后端
```bash
cd /Users/supersayajin/Desktop/puppyresearch/PuppyResearch
./start_backend.sh
```

#### 终端 2 - 启动前端
```bash
cd /Users/supersayajin/Desktop/puppyresearch/PuppyResearch/chat_interface
npm run dev
```

### 方法二：手动启动

#### 后端
```bash
cd /Users/supersayajin/Desktop/puppyresearch/PuppyResearch
source researchenv/bin/activate
cd deep_wide_research
pip install -r requirements.txt
python api_server.py
```

#### 前端
```bash
cd /Users/supersayajin/Desktop/puppyresearch/PuppyResearch/chat_interface
npm run dev
```

## 🌐 访问地址

- **前端界面**: http://localhost:3002
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs (Swagger UI)

## 📝 使用流程

1. **启动两个服务器**（后端 + 前端）
2. **打开浏览器**访问 http://localhost:3002
3. **输入研究问题**，例如：
   - "What are the differences between Databricks and Snowflake?"
   - "Explain quantum computing in simple terms"
   - "What are the latest AI research trends?"
4. **等待处理**（可能需要 1-5 分钟，取决于问题复杂度）
5. **查看结果**：系统会返回详细的研究报告

## 🔧 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                         浏览器                               │
│              http://localhost:3002                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP Request
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Next.js 前端                               │
│              (chat_interface/app/page.tsx)                  │
│                                                              │
│  - PuppyChat SDK (ChatMain)                                 │
│  - handleSendMessage() 函数                                  │
│  - 消息历史管理                                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ POST /api/research
                         │ { message, history }
                         │
┌────────────────────────▼────────────────────────────────────┐
│              FastAPI 后端 API 服务器                          │
│              http://localhost:8000                           │
│           (deep_wide_research/api_server.py)                │
│                                                              │
│  - CORS 中间件                                                │
│  - /api/research 端点                                         │
│  - 请求验证 (Pydantic)                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ async call
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Deep Research Engine                            │
│              (deep_wide_research/engine.py)                 │
│                                                              │
│  Phase 1: Research (research_strategy.py)                   │
│  - LLM-driven tool calling                                  │
│  - Web search (Tavily, Exa)                                 │
│  - Information collection                                    │
│                                                              │
│  Phase 2: Generate (generate_strategy.py)                   │
│  - Report generation                                         │
│  - Structured output                                         │
└─────────────────────────────────────────────────────────────┘
```

## 📦 依赖清单

### 后端 Python 依赖
```
fastapi>=0.115.0
uvicorn>=0.32.0
openai>=1.30.0
anthropic>=0.26.1
tavily-python>=0.3.5
exa-py>=1.0.0
pydantic>=2.7.1
httpx>=0.28.1
```

### 前端 Node.js 依赖
```
next@15.5.4
react@19.1.0
react-dom@19.1.0
puppychat (最新版本)
typescript
tailwindcss
```

## 🔑 环境变量配置

在项目根目录创建 `.env` 文件：

```bash
# OpenAI API
OPENAI_API_KEY=sk-...

# 搜索 API
TAVILY_API_KEY=tvly-...
EXA_API_KEY=...

# 模型配置 (可选)
RESEARCH_MODEL=openai:gpt-4.1
RESEARCH_MODEL_MAX_TOKENS=10000
FINAL_REPORT_MODEL=openai:gpt-4.1
FINAL_REPORT_MODEL_MAX_TOKENS=10000
```

## 🐛 故障排除

### 1. 前端显示 "Failed to connect to research API"

**原因**: 后端服务器未运行或 CORS 配置问题

**解决方案**:
```bash
# 检查后端是否运行
curl http://localhost:8000/health

# 如果没有响应，重新启动后端
./start_backend.sh
```

### 2. 后端返回 500 错误

**原因**: API 密钥未配置或研究引擎出错

**解决方案**:
- 检查 `.env` 文件是否配置了所有必需的 API 密钥
- 查看后端终端的错误日志
- 确认 API 密钥有效且有足够的配额

### 3. Next.js 显示 "document is not defined"

**原因**: SSR 问题

**解决方案**: 已通过 `dynamic import` 解决，确保代码中有：
```typescript
const ChatMain = dynamic(
  () => import('puppychat').then((mod) => mod.ChatMain),
  { ssr: false }
)
```

### 4. 研究过程很慢或超时

**原因**: 深度研究需要多次 API 调用

**解决方案**:
- 这是正常的，耐心等待 1-5 分钟
- 查看后端终端，确认研究进度
- 检查网络连接和 API 配额

## 📊 API 请求/响应示例

### 请求
```json
POST http://localhost:8000/api/research
Content-Type: application/json

{
  "message": "What are the key differences between Databricks and Snowflake?",
  "history": []
}
```

### 响应
```json
{
  "response": "# Databricks vs Snowflake: A Comprehensive Comparison\n\n## Overview\n...",
  "notes": [
    "{\"searches\": [...], \"findings\": [...]}"
  ],
  "success": true
}
```

## 🎯 下一步优化建议

1. **添加流式响应**: 实现 SSE (Server-Sent Events) 来显示实时研究进度
2. **添加认证**: 添加 API 密钥或 JWT 认证保护后端
3. **优化性能**: 添加缓存机制减少重复研究
4. **改进 UI**: 添加加载动画、进度条
5. **部署**: 部署到云平台（Vercel + Railway/Render）

## 📚 相关文档

- [FastAPI 文档](https://fastapi.tiangolo.com/)
- [Next.js 文档](https://nextjs.org/docs)
- [PuppyChat SDK](https://github.com/PuppyAgent/PuppyChat)
- [项目 README](./README.md)

## ✅ 测试清单

- [ ] 后端服务器成功启动在 8000 端口
- [ ] 前端服务器成功启动在 3002 端口
- [ ] 浏览器能够访问前端界面
- [ ] 发送测试消息能够收到响应
- [ ] 错误处理正常工作
- [ ] API 文档可以访问 (http://localhost:8000/docs)

---

**创建时间**: 2025-10-04  
**作者**: AI Assistant  
**项目**: PuppyResearch - Deep & Wide Research System

