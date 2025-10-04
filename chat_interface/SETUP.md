# PuppyResearch Chat Interface 使用指南

## 系统架构

- **前端**: Next.js + TypeScript + PuppyChat SDK (端口: 3002)
- **后端**: FastAPI + Deep Research Engine (端口: 8000)

## 启动步骤

### 1. 启动后端 API 服务器

在项目根目录下打开一个终端：

```bash
# 回到项目根目录
cd /Users/supersayajin/Desktop/puppyresearch/PuppyResearch

# 运行启动脚本
./start_backend.sh
```

或者手动启动：

```bash
# 激活虚拟环境
source researchenv/bin/activate

# 进入后端目录
cd deep_wide_research

# 安装依赖
pip install -r requirements.txt

# 启动服务器
python api_server.py
```

后端服务器将在 **http://localhost:8000** 启动。

### 2. 启动前端开发服务器

在另一个终端中：

```bash
cd /Users/supersayajin/Desktop/puppyresearch/PuppyResearch/chat_interface

# 启动 Next.js 开发服务器
npm run dev
```

前端将在 **http://localhost:3002** 启动（如果 3000 被占用）。

## 使用方法

1. 打开浏览器访问 http://localhost:3002
2. 在聊天界面中输入你的研究问题
3. 系统会调用后端的深度研究引擎进行分析
4. 等待研究完成，查看生成的报告

## API 端点

### POST /api/research

执行深度研究

**请求体:**
```json
{
  "message": "研究问题",
  "history": ["之前的消息1", "之前的消息2"]
}
```

**响应:**
```json
{
  "response": "研究报告内容",
  "notes": ["研究笔记1", "研究笔记2"],
  "success": true
}
```

## 环境变量

确保在 `.env` 文件中配置了必要的 API 密钥：

```bash
# OpenAI API Key
OPENAI_API_KEY=your_key_here

# Tavily API Key (用于搜索)
TAVILY_API_KEY=your_key_here

# Exa API Key (可选)
EXA_API_KEY=your_key_here
```

## 故障排除

### 前端显示错误 "Failed to connect to research API"

- 确认后端服务器是否在运行 (http://localhost:8000/health)
- 检查 CORS 设置
- 查看浏览器控制台的错误信息

### 后端启动失败

- 确认虚拟环境已激活
- 检查依赖是否正确安装: `pip install -r requirements.txt`
- 查看终端错误信息

### 研究执行超时

- 研究过程可能需要较长时间（1-5分钟），请耐心等待
- 检查 API 密钥是否有效
- 查看后端日志输出

## API 文档

访问 http://localhost:8000/docs 查看完整的 API 文档（Swagger UI）。

