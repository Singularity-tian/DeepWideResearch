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

from fastapi import FastAPI, HTTPException, Response
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

# 检测是否为生产环境
is_production = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RENDER") or os.getenv("VERCEL"))

if is_production:
    # 生产环境：必须使用环境变量配置
    allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
    if allowed_origins_env:
        allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
        allow_all_origins = False
    else:
        raise ValueError(
            "⚠️  Production environment detected but ALLOWED_ORIGINS is not set!\n"
            "Please set the ALLOWED_ORIGINS environment variable with your frontend URL(s).\n"
            "Example: ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.your-domain.com"
        )
else:
    # 本地开发：永远允许所有来源（方便开发）
    allowed_origins = ["*"]
    allow_all_origins = True
    print("💡 Tip: Running in development mode with CORS set to allow all origins (*)")

# 打印 CORS 配置（用于调试）
print("="*80)
print("🔧 CORS Configuration:")
print(f"   Environment: {'🌐 Production' if is_production else '💻 Development (Local)'}")
print(f"   Allowed Origins: {allowed_origins}")
print(f"   Allow All Origins: {'✅ Yes (*)' if allow_all_origins else '❌ No (Restricted)'}")
print(f"   Allow Credentials: {'✅ Yes' if not allow_all_origins else '❌ No (incompatible with *)'}")
print("="*80)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=not allow_all_origins,  # 使用 * 时不能启用 credentials
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
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


@app.get("/api/mcp/status")
async def mcp_status():
    """检查 MCP 环境变量状态（调试用）"""
    import os
    return {
        "tavily_api_key_set": bool(os.getenv("TAVILY_API_KEY")),
        "exa_api_key_set": bool(os.getenv("EXA_API_KEY")),
        "openai_api_key_set": bool(os.getenv("OPENAI_API_KEY"))
    }


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
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


class MCPTestRequest(BaseModel):
    """MCP 测试请求模型"""
    services: List[str]  # 要测试的服务名称列表，如 ["tavily", "exa"]


class MCPToolInfo(BaseModel):
    """MCP 工具信息"""
    name: str
    description: str = ""


class MCPServiceStatus(BaseModel):
    """MCP 服务状态"""
    name: str
    available: bool
    tools: List[MCPToolInfo] = []
    error: Optional[str] = None


class MCPTestResponse(BaseModel):
    """MCP 测试响应模型"""
    services: List[MCPServiceStatus]


@app.post("/api/mcp/test", response_model=MCPTestResponse)
async def test_mcp_services(request: MCPTestRequest):
    """测试 MCP 服务连接状态
    
    检查 MCP 服务是否可用：
    - 本地环境：检查 API key 是否设置
    - 云端环境（HTTP MCP）：实际测试 HTTP 连接
    """
    import os
    import httpx
    
    is_production = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RENDER") or os.getenv("VERCEL"))
    
    # MCP 服务的配置映射
    mcp_config = {
        "tavily": {
            "api_key_env": "TAVILY_API_KEY",
            "http_url_template": "https://mcp.tavily.com/mcp/?tavilyApiKey={api_key}",
            "default_tools": [
                {"name": "tavily-search", "description": "Search the web using Tavily"},
                {"name": "tavily-extract", "description": "Extract content from URLs"}
            ]
        },
        "exa": {
            "api_key_env": "EXA_API_KEY",
            "http_url_template": "https://mcp.exa.ai/mcp?exaApiKey={api_key}",
            "default_tools": [
                {"name": "web_search_exa", "description": "AI-powered web search using Exa"}
            ]
        }
    }
    
    results = []
    for service_name in request.services:
        service_name_lower = service_name.lower()
        
        # 检查服务是否在配置中
        if service_name_lower not in mcp_config:
            results.append(MCPServiceStatus(
                name=service_name,
                available=False,
                error=f"Unknown service '{service_name}'. Supported: Tavily, Exa"
            ))
            continue
        
        config = mcp_config[service_name_lower]
        api_key = os.getenv(config["api_key_env"])
        
        if not api_key:
            # API key 未设置
            results.append(MCPServiceStatus(
                name=service_name,
                available=False,
                error=f"API key not set. Please set {config['api_key_env']} environment variable."
            ))
            continue
        
        # 如果是生产环境，尝试实际测试 HTTP 连接
        if is_production:
            try:
                http_url = config["http_url_template"].format(api_key=api_key)
                
                # 尝试连接 MCP HTTP 服务（使用 SSE 连接测试）
                async with httpx.AsyncClient(timeout=10.0) as client:
                    # 发送 SSE 连接请求
                    response = await client.get(
                        http_url,
                        headers={"Accept": "text/event-stream"}
                    )
                    
                    if response.status_code == 200:
                        # 连接成功，使用默认工具列表
                        # TODO: 可以解析 SSE 响应获取实际工具列表
                        tool_infos = [
                            MCPToolInfo(name=tool["name"], description=tool["description"])
                            for tool in config["default_tools"]
                        ]
                        
                        results.append(MCPServiceStatus(
                            name=service_name,
                            available=True,
                            tools=tool_infos
                        ))
                    else:
                        results.append(MCPServiceStatus(
                            name=service_name,
                            available=False,
                            error=f"HTTP {response.status_code}: Cannot connect to MCP service"
                        ))
                        
            except httpx.TimeoutException:
                results.append(MCPServiceStatus(
                    name=service_name,
                    available=False,
                    error="Connection timeout: MCP service is not responding"
                ))
            except httpx.ConnectError:
                results.append(MCPServiceStatus(
                    name=service_name,
                    available=False,
                    error="Connection refused: Cannot reach MCP service"
                ))
            except Exception as e:
                results.append(MCPServiceStatus(
                    name=service_name,
                    available=False,
                    error=f"Connection failed: {str(e)}"
                ))
        else:
            # 本地环境：只检查 API key，返回默认工具列表
            tool_infos = [
                MCPToolInfo(name=tool["name"], description=tool["description"])
                for tool in config["default_tools"]
            ]
            
            results.append(MCPServiceStatus(
                name=service_name,
                available=True,
                tools=tool_infos
            ))
    
    return MCPTestResponse(services=results)


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

