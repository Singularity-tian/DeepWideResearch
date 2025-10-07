"""Native Deep Research engine orchestrating the full flow without LangChain.

This engine串联两个核心策略:
1. Research Phase: 使用 unified_research_prompt 进行搜索和信息收集
2. Generate Phase: 使用 final_report_generation_prompt 生成最终报告
"""

from __future__ import annotations

import json
from typing import Dict, List, Optional

import os
import sys

# 支持直接运行和模块导入
if __name__ == "__main__":
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from native_deep_research.research_strategy import run_research_llm_driven
    from native_deep_research.generate_strategy import generate_report
else:
    from .research_strategy import run_research_llm_driven
    from .generate_strategy import generate_report


def today_str() -> str:
    import datetime as _dt

    now = _dt.datetime.now()
    return f"{now:%a} {now:%b} {now.day}, {now:%Y}"


async def _run_researcher(topic: str, cfg: Configuration, api_keys: Optional[dict], mcp_config: Optional[Dict[str, List[str]]] = None) -> Dict[str, str]:
    # Delegate to LLM-driven tool-calling strategy
    return await run_research_llm_driven(topic=topic, cfg=cfg, api_keys=api_keys, mcp_config=mcp_config)


# removed supervisor_tools for single-agent design


async def final_report_generation(state: dict, cfg: Configuration, api_keys: Optional[dict] = None) -> None:
    # Delegate to report strategy
    report_content = await generate_report(state=state, cfg=cfg, api_keys=api_keys)
    state["final_report"] = report_content
    state["notes"] = []
    state["messages"].append({"role": "assistant", "content": report_content})


class Configuration:
    def __init__(self):
        # Minimal config fields used in this file
        self.allow_clarification = True
        self.max_concurrent_research_units = 5
        self.max_researcher_iterations = 6
        self.max_react_tool_calls = 10
        self.research_model = os.getenv("RESEARCH_MODEL", "openai:gpt-4.1")
        self.research_model_max_tokens = int(os.getenv("RESEARCH_MODEL_MAX_TOKENS", "10000"))
        self.final_report_model = os.getenv("FINAL_REPORT_MODEL", "openai:gpt-4.1")
        self.final_report_model_max_tokens = int(os.getenv("FINAL_REPORT_MODEL_MAX_TOKENS", "10000"))
        self.mcp_prompt = None


async def run_deep_research(user_messages: List[str], cfg: Optional[Configuration] = None, api_keys: Optional[dict] = None, mcp_config: Optional[Dict[str, List[str]]] = None) -> dict:
    """完整的深度研究流程：Research → Generate
    
    Args:
        user_messages: 用户消息列表
        cfg: 配置对象
        api_keys: API 密钥
        
    Returns:
        包含研究结果和最终报告的 state 字典
    """
    cfg = cfg or Configuration()
    state = {
        "messages": [{"role": "user", "content": m} for m in user_messages],
        "research_brief": None,
        "notes": [],
        "final_report": "",
    }

    # 提取研究主题
    last_user = next((m for m in reversed(state["messages"]) if m["role"] == "user"), {"content": ""})
    research_topic = last_user.get("content", "")

    # ============================================================
    # Phase 1: Research - 使用 unified_research_prompt
    # ============================================================
    print("\n🔬 Starting Research Phase...")
    research = await _run_researcher(research_topic, cfg, api_keys, mcp_config)
    raw_notes = research.get("raw_notes", "") if research else ""
    state["notes"] = [raw_notes] if raw_notes else []
    # 将 raw_notes JSON 也注入 messages，供生成阶段作为上下文
    if raw_notes:
        try:
            # 验证是否为 JSON；如果不是，也照样放入
            json.loads(raw_notes)
        except Exception:
            pass
        state["messages"].append({
            "role": "user",
            "content": f"<RAW_NOTES_JSON>\n{raw_notes}\n</RAW_NOTES_JSON>"
        })
    print(f"✅ Research Phase Complete - Collected {len(state['notes'])} note(s)")

    # ============================================================
    # Phase 2: Generate - 使用 final_report_generation_prompt
    # ============================================================
    print("\n📝 Starting Report Generation Phase...")
    await final_report_generation(state, cfg, api_keys)
    
    # 统一关闭所有 MCP clients，避免关闭发生在不同 task 导致的 cancel scope 异常
    try:
        from native_deep_research.mcp_client import get_registry
    except Exception:
        try:
            from .mcp_client import get_registry
        except Exception:
            get_registry = None
    
    if get_registry is not None:
        try:
            registry = get_registry()
            if hasattr(registry, "close_all_clients"):
                await registry.close_all_clients()
        except Exception:
            pass
    print("✅ Report Generation Complete")
    
    return state


if __name__ == "__main__":
    """在 VSCode 中直接点击 Run 按钮即可测试完整的 Deep Research 流程"""
    import asyncio
    
    class TestConfig(Configuration):
        def __init__(self):
            super().__init__()
            # 自定义测试配置
            self.research_model = "openai/o4-mini"
            self.research_model_max_tokens = 16000
            self.final_report_model = "openai/o4-mini"
            self.final_report_model_max_tokens = 16000
            self.max_react_tool_calls = 5
    
    async def test():
        print("="*80)
        print("🚀 Testing Deep Research Engine")
        print("="*80)
        
        # 测试用例
        test_question = "DataBricks, Snowflake 他们分别提供什么服务，以及区别是什么?"
        
        # 运行完整流程
        result = await run_deep_research(
            user_messages=[test_question],
            cfg=TestConfig()
        )
        
        print("\n" + "="*80)
        print("📊 Research Results:")
        print("="*80)
        print(f"Notes collected: {len(result['notes'])}")
        if result['notes']:
            print("\nResearch Notes:")
            print("-"*80)
            print(result['notes'][0][:500] + "..." if len(result['notes'][0]) > 500 else result['notes'][0])
        
        print("\n" + "="*80)
        print("📄 Final Report:")
        print("="*80)
        print(result['final_report'])
        
        print("\n" + "="*80)
        print("✅ Test Complete!")
        print("="*80)
    
    asyncio.run(test())


