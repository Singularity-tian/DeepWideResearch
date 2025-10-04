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
from typing import List, Optional
import asyncio

# 现在可以正确导入 engine 模块
from deep_wide_research.engine import run_deep_research, Configuration

app = FastAPI(title="PuppyResearch API", version="1.0.0")

# 配置 CORS，允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],  # Next.js 开发服务器
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    """研究请求模型"""
    message: str
    history: Optional[List[str]] = None


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
        # 构建消息历史
        messages = request.history or []
        messages.append(request.message)
        
        # 创建配置
        cfg = Configuration()
        
        # 执行研究
        print(f"\n🔍 Received research request: {request.message}")
        result = await run_deep_research(
            user_messages=messages,
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

