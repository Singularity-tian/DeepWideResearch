"""简化的 OpenRouter 客户端 - 保留必要的工具调用功能"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

try:
    from openai import AsyncOpenAI
except ImportError as e:
    raise RuntimeError("需要安装 OpenAI SDK: pip install openai>=1.0.0") from e

# 尝试加载 .env 文件
_ENV_DEBUG = False  # 设置为 True 可以看到调试信息

try:
    from dotenv import load_dotenv
    from pathlib import Path
    
    # 明确指定 .env 文件路径（在当前文件所在目录）
    env_path = Path(__file__).parent / ".env"
    loaded = load_dotenv(dotenv_path=env_path)
    
    if _ENV_DEBUG:
        print(f"[DEBUG] .env 文件路径: {env_path}")
        print(f"[DEBUG] .env 文件存在: {env_path.exists()}")
        print(f"[DEBUG] load_dotenv 返回: {loaded}")
        print(f"[DEBUG] OPENROUTER_API_KEY: {os.getenv('OPENROUTER_API_KEY', 'None')[:20]}...")
except ImportError:
    if _ENV_DEBUG:
        print("[DEBUG] python-dotenv 未安装")
    pass  # 如果没安装 python-dotenv，继续使用系统环境变量




class ChatResponse:
    """简单的响应包装器"""
    def __init__(self, content: str, raw: Any = None):
        self.content = content
        self.raw = raw


def _get_api_key(api_keys: Optional[dict] = None) -> str:
    """获取 API key，优先使用 OPENROUTER_API_KEY"""
    api_key = (api_keys or {}).get("OPENROUTER_API_KEY") or os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("缺少 API key。请设置环境变量 OPENROUTER_API_KEY")
    return api_key


def _fix_model_id(model: str) -> str:
    """修正模型名格式：'openai:gpt-4' -> 'openai/gpt-4'"""
    return model if "/" in model else model.replace(":", "/", 1)


async def chat_complete(
    model: str, 
    messages: List[Dict[str, Any]], 
    max_tokens: int, 
    api_keys: Optional[dict] = None,
) -> ChatResponse:
    """聊天完成 - 纯对话模式，不使用 OpenAI function call"""
    client = AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=_get_api_key(api_keys)
    )
    
    resp = await client.chat.completions.create(
        model=_fix_model_id(model),
        messages=messages,
        max_tokens=max_tokens,
    )
    
    return ChatResponse(
        content=resp.choices[0].message.content or "",
        raw=resp
    )


if __name__ == "__main__":
    import asyncio
    
    async def test():
        resp = await chat_complete(
            model="openai/gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Say hello in Chinese"}],
            max_tokens=50
        )
        print(f"Response: {resp.content}")
    
    asyncio.run(test())
