"""FastAPI server for Deep Research Engine.

提供 HTTP API 接口来调用深度研究引擎。
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径，以便正确导入模块
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio

# 现在可以正确导入 engine 模块
from deep_wide_research.engine import run_deep_research, Configuration

app = FastAPI(title="PuppyResearch API", version="1.0.0")

# 配置 CORS，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3002",
        "http://localhost:4000"
    ],  # Next.js 开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    """消息模型 - 标准的 OpenAI 格式"""
    role: str  # "user", "assistant", or "system"
    content: str


class ResearchMessage(BaseModel):
    """研究消息模型 - 包含查询和参数"""
    query: str  # 用户的查询文本
    deep: float = 0.5  # 深度参数 (0-1)，控制研究的深度
    wide: float = 0.5  # 广度参数 (0-1)，控制研究的广度
    # 可以添加更多参数，例如：
    # max_iterations: int = 8
    # creativity: float = 0.5


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


@app.post("/api/research", response_model=ResearchResponse)
async def research(request: ResearchRequest):
    """
    执行深度研究
    
    接收用户消息，返回研究报告
    """
    try:
        # 构建消息历史 - 提取所有用户消息
        history_messages = request.history or []
        
        # 只提取用户消息内容用于研究
        # （研究引擎目前只需要用户问题，不需要assistant的回复）
        user_messages = [msg.content for msg in history_messages if msg.role == "user"]
        user_messages.append(request.message.query)
        
        # 创建配置
        cfg = Configuration()
        
        # 根据 deep 和 wide 参数调整配置
        # deep: 控制研究深度 (迭代次数)
        # wide: 控制研究广度 (每次搜索的范围)
        # 这里可以根据需要调整配置参数
        # 例如：cfg.max_react_tool_calls = int(5 + request.message.deep * 10)
        
        # 执行研究
        print(f"\n🔍 Received research request: {request.message.query}")
        print(f"📊 Research parameters:")
        print(f"   - Deep: {request.message.deep} (0-1)")
        print(f"   - Wide: {request.message.wide} (0-1)")
        print(f"📜 Conversation history: {len(history_messages)} messages")
        print(f"👤 User messages: {len(user_messages)} messages")
        
        result = await run_deep_research(
            user_messages=user_messages,
            cfg=cfg,
            api_keys=None  # 将从环境变量读取
        )
        
        # 提取最终报告
        final_report = result.get("final_report", "")
        notes = result.get("notes", [])
        
        print(f"✅ Research completed successfully")
        
        return ResearchResponse(
            response=final_report,
            notes=notes,
            success=True
        )
        
    except Exception as e:
        print(f"❌ Error during research: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Research failed: {str(e)}"
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

