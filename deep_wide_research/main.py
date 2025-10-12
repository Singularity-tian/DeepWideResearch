"""FastAPI server for Deep Research Engine.

提供 HTTP API 接口来调用深度研究引擎。
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径，以便正确导入模块
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# 同时添加当前目录到路径（用于 Railway 部署）
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import json

# 尝试两种导入方式：开发环境和部署环境
try:
    from deep_wide_research.engine import run_deep_research, run_deep_research_stream, Configuration
except ImportError:
    from engine import run_deep_research, run_deep_research_stream, Configuration

app = FastAPI(title="PuppyResearch API", version="1.0.0")

# 配置 CORS，允许前端访问
import os

# 从环境变量读取允许的来源
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_env:
    # 如果设置了 ALLOWED_ORIGINS，使用它（可以是逗号分隔的多个域名）
    allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
else:
    # 默认允许本地开发环境
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:4000"
    ]

# 如果在生产环境且没有指定 ALLOWED_ORIGINS，允许所有来源
allow_all_origins = False
if not allowed_origins_env and os.getenv("RAILWAY_ENVIRONMENT"):
    allowed_origins = ["*"]
    allow_all_origins = True

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=not allow_all_origins,  # 当允许所有来源时，不能使用 credentials
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    """消息模型 - 标准的 OpenAI 格式"""
    role: str  # "user", "assistant", or "system"
    content: str


class DeepWideParams(BaseModel):
    """深度和广度参数模型"""
    deep: float = 0.5  # 深度参数 (0-1)，控制研究的深度
    wide: float = 0.5  # 广度参数 (0-1)，控制研究的广度


class ResearchMessage(BaseModel):
    """研究消息模型 - 包含查询和参数"""
    query: str  # 用户的查询文本
    deepwide: DeepWideParams = DeepWideParams()  # 深度广度参数对象
    mcp: Dict[str, List[str]] = {}  # MCP配置：{服务名: [工具列表]}


class ResearchRequest(BaseModel):
    """研究请求模型"""
    message: ResearchMessage  # 现在是一个对象而不是字符串
    history: Optional[List[Message]] = None


class ResearchResponse(BaseModel):
    """研究响应模型"""
    response: str
    notes: List[str] = []
    success: bool = True


@app.get("/")
async def root():
    """API 根路径"""
    return {
        "name": "PuppyResearch API",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy"}


async def research_stream_generator(request: ResearchRequest):
    """生成研究流式响应"""
    try:
        # 构建消息历史
        history_messages = request.history or []
        user_messages = [msg.content for msg in history_messages if msg.role == "user"]
        user_messages.append(request.message.query)
        
        # 创建配置
        cfg = Configuration()
        
        print(f"\n🔍 Received research request: {request.message.query}")
        print(f"📊 Deep: {request.message.deepwide.deep}, Wide: {request.message.deepwide.wide}")
        
        # 执行研究并获取流式更新
        async for update in run_deep_research_stream(
            user_messages=user_messages,
            cfg=cfg,
            api_keys=None,
            mcp_config=request.message.mcp,
            deep_param=request.message.deepwide.deep,
            wide_param=request.message.deepwide.wide
        ):
            yield f"data: {json.dumps(update)}\n\n"
            
    except Exception as e:
        error_msg = {'action': 'error', 'message': f'Research failed: {str(e)}'}
        yield f"data: {json.dumps(error_msg)}\n\n"


@app.post("/api/research")
async def research(request: ResearchRequest):
    """执行深度研究 - 流式响应"""
    return StreamingResponse(
        research_stream_generator(request),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    print("="*80)
    print("🚀 Starting PuppyResearch API Server")
    print("="*80)
    print("📡 Server will be available at: http://localhost:8000")
    print("📚 API docs at: http://localhost:8000/docs")
    print("="*80)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

