"""Tavily & Exa MCP search (native)."""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
import json
import httpx
import os

class Configuration:
    # minimal shim for defaults; to be removed if desired
    tavily_mcp_url: Optional[str] = None
    exa_mcp_url: Optional[str] = None

    def __init__(self, tavily_mcp_url: Optional[str] = None, exa_mcp_url: Optional[str] = None):
        self.tavily_mcp_url = tavily_mcp_url or os.getenv("TAVILY_MCP_URL")
        self.exa_mcp_url = exa_mcp_url or os.getenv("EXA_MCP_URL")


async def tavily_search(queries: List[str], max_results: int = 5, topic: str = "general", include_raw_content: bool = True, cfg: Configuration = None, api_keys: Optional[dict] = None) -> List[dict]:
    """Search via Tavily SDK directly."""
    try:
        from tavily import TavilyClient
    except ImportError:
        raise RuntimeError("tavily-python not installed. Run: pip install tavily-python")
    
    # 获取 API key
    api_key = (api_keys or {}).get("TAVILY_API_KEY") or os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise RuntimeError("TAVILY_API_KEY not set. Add it to .env file.")
    
    client = TavilyClient(api_key=api_key)
    
    async def _one(q: str) -> dict:
        # Tavily SDK 是同步的，所以在 asyncio 中运行
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            lambda: client.search(query=q, max_results=max_results, include_raw_content=include_raw_content, topic=topic)
        )
        return result
    
    tasks = [_one(q) for q in queries]
    return await asyncio.gather(*tasks)


    # no normalization or shared helper by request — return MCP result as-is


async def exa_search(queries: List[str], max_results: int = 5, cfg: Configuration = None, api_keys: Optional[dict] = None) -> List[dict]:
    """Search via Exa SDK directly."""
    try:
        from exa_py import Exa
    except ImportError:
        raise RuntimeError("exa_py not installed. Run: pip install exa_py")
    
    # 获取 API key
    api_key = (api_keys or {}).get("EXA_API_KEY") or os.getenv("EXA_API_KEY")
    if not api_key:
        raise RuntimeError("EXA_API_KEY not set. Add it to .env file.")
    
    client = Exa(api_key=api_key)
    
    async def _one(q: str) -> dict:
        # Exa SDK 是同步的，所以在 asyncio 中运行
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None,
            lambda: client.search(query=q, num_results=max_results, use_autoprompt=True)
        )
        # 转换为字典格式
        return {
            "query": q,
            "results": [{"title": r.title, "url": r.url, "score": r.score, "text": getattr(r, 'text', '')} for r in result.results]
        }
    
    tasks = [_one(q) for q in queries]
    return await asyncio.gather(*tasks)


    # removed summarization utilities per simplified design


