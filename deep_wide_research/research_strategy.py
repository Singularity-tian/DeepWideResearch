"""Research stage strategy for Deep Research.

This module encapsulates the research step, fetching information from
external search providers and returning raw notes.

采用基于 Prompt 的工具调用方式，不使用 OpenAI function call API。
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
from datetime import datetime
from typing import Dict, List, Optional, Any

# 支持直接运行和模块导入
if __name__ == "__main__":
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from deep_wide_research.providers import chat_complete
    from deep_wide_research.mcp_client import get_registry
    from deep_wide_research.newprompt import create_unified_research_prompt
else:
    from .providers import chat_complete
    from .mcp_client import get_registry
    from .newprompt import create_unified_research_prompt


# MCP 工具选择配置：{server_name: [tool_names]}
MCP_TOOLS_CONFIG = {
    "tavily": ["tavily-search"],
    "exa": ["web_search_exa"]
}

def build_mcp_tools_description(tools: List[Dict[str, Any]]) -> str:
    """构建 MCP 工具描述，用于插入到 unified_research_prompt
    
    Args:
        tools: MCP 工具列表
    
    Returns:
        工具描述文本
    """
    if not tools:
        return "\n**Note**: No additional search tools are currently available."
    
    tools_description = []
    
    for idx, tool in enumerate(tools, 1):
        tool_name = tool.get("name", "unknown")
        tool_desc = tool.get("description", "No description")
        input_schema = tool.get("inputSchema", {})
        
        tool_text = f"{idx + 1}. **{tool_name}**: {tool_desc}"
        
        properties = input_schema.get("properties", {})
        required = input_schema.get("required", [])
        
        if properties:
            tool_text += "\n   Arguments:"
            for param_name, param_info in properties.items():
                param_type = param_info.get("type", "any")
                param_desc = param_info.get("description", "")
                is_required = "required" if param_name in required else "optional"
                tool_text += f"\n   - {param_name} ({is_required}, {param_type}): {param_desc}"
        
        tools_description.append(tool_text)
    
    tools_list = "\n\n".join(tools_description)
    
    # 工具调用格式说明
    example_tool = tools[0]
    example_name = example_tool.get("name", "tool_name")
    example_args = {}
    example_props = example_tool.get("inputSchema", {}).get("properties", {})
    
    for param_name, param_info in list(example_props.items())[:2]:
        param_type = param_info.get("type", "string")
        example_args[param_name] = "example value" if param_type == "string" else (5 if param_type == "integer" else "value")
    
    example_json = json.dumps({"tool": example_name, "arguments": example_args}, indent=2)
    
    return f"""
{tools_list}

**Tool Call Format:**
<tool_call>
{example_json}
</tool_call>

You can call multiple tools in parallel by including multiple <tool_call> blocks."""


def parse_tool_calls(content: str) -> List[Dict[str, Any]]:
    """从 LLM 响应中解析工具调用
    
    示例输入:
    <tool_call>
    {
      "tool": "tavily_search",
      "arguments": {"query": "Python programming", "max_results": 5}
    }
    </tool_call>
    
    返回: [{"tool": "tavily_search", "arguments": {...}, "id": "call_1"}]
    """
    tool_calls = []
    
    # 使用正则提取所有 <tool_call>...</tool_call> 块
    pattern = r'<tool_call>(.*?)</tool_call>'
    matches = re.findall(pattern, content, re.DOTALL)
    
    for idx, match in enumerate(matches):
        try:
            # 尝试解析 JSON
            tool_data = json.loads(match.strip())
            tool_calls.append({
                "id": f"call_{idx + 1}",
                "tool": tool_data.get("tool", ""),
                "arguments": tool_data.get("arguments", {})
            })
        except json.JSONDecodeError as e:
            print(f"⚠️ Failed to parse tool call JSON: {e}")
            continue
    
    return tool_calls


async def _execute_single_tool(
    tc: Dict[str, Any],
    mcp_clients: List
) -> Dict[str, Any]:
    """执行单个工具调用"""
    result = None
    for client in mcp_clients:
        try:
            result = await client.call_tool(tc["tool"], tc["arguments"])
            result = json.dumps(result)
            break  # 成功就停止
        except:
            continue  # 失败就尝试下一个 client
    
    if result is None:
        result = json.dumps({"error": f"Tool '{tc['tool']}' not found in any MCP server"})
    
    # 输出工具结果
    print(f"\n✓ Tool '{tc['tool']}' result ({len(result)} chars)")
    print(f"{'='*60}")
    
    return {
        "tool_call_id": tc["id"],
        "tool": tc["tool"],
        "result": result
    }


async def execute_tool_calls(
    tool_calls: List[Dict[str, Any]],
    mcp_clients: List
) -> List[Dict[str, Any]]:
    """并行执行所有工具调用并返回结果列表"""
    if not tool_calls:
        return []
    
    # 并行执行所有工具调用
    tool_results = await asyncio.gather(
        *[_execute_single_tool(tc, mcp_clients) for tc in tool_calls]
    )

    print(tool_results)
    
    return list(tool_results)


async def run_research_llm_driven(
    topic: str, 
    cfg, 
    api_keys: Optional[dict] = None,
    mcp_config: Optional[Dict[str, List[str]]] = None,
    deep_param: float = 0.5,
    wide_param: float = 0.5
) -> Dict[str, str]:
    """LLM 驱动的研究循环 - 使用 unified_research_prompt
    
    Args:
        topic: 研究主题
        cfg: 配置对象
        api_keys: API 密钥字典
    """
    if not topic:
        empty_json = json.dumps({"topic": "", "tool_calls": []}, ensure_ascii=False)
        return {"raw_notes": empty_json}
    
    # 1. 收集 MCP 工具 - 使用前端传来的配置或默认配置
    print("\n🔍 Collecting tools from MCP servers...")
    registry = get_registry()
    
    # 使用前端传来的 MCP 配置，如果没有则使用默认配置
    effective_config = mcp_config or MCP_TOOLS_CONFIG
    print(f"📋 Using MCP config: {effective_config}")
    
    mcp_tools, mcp_clients = await registry.collect_tools(effective_config)
    
    if not mcp_tools:
        print("⚠️ No tools available")
        error_json = json.dumps({
            "topic": topic,
            "tool_calls": [],
            "error": "No tools available"
        }, ensure_ascii=False)
        return {
            "raw_notes": error_json
        }
    
    print(f"✅ Collected {len(mcp_tools)} tool(s):")
    for tool in mcp_tools:
        print(f"  - {tool.get('name', 'unknown')}")
    
    # 2. 构建 system prompt - 使用 create_unified_research_prompt 动态生成
    mcp_prompt = build_mcp_tools_description(mcp_tools)
    max_iterations = getattr(cfg, 'max_react_tool_calls', 8)
    
    system_prompt = create_unified_research_prompt(
        date=datetime.now().strftime("%Y-%m-%d"),
        mcp_prompt=mcp_prompt,
        max_researcher_iterations=max_iterations,
        deep_param=deep_param,
        wide_param=wide_param
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": topic}
    ]
    
    print(messages)
    
    max_steps = getattr(cfg, 'max_react_tool_calls', 8)
    conversation_history = []  # 保存完整对话历史用于最终返回
    tool_interactions: List[Dict[str, Any]] = []  # 累积所有工具调用及结果（用于 JSON raw_notes）

    # 工具调用循环
    for step in range(max_steps):
        # 调用 LLM（纯对话模式）
        resp = await chat_complete(
            model=cfg.research_model,
            messages=messages,
            max_tokens=cfg.research_model_max_tokens,
            api_keys=api_keys,
        )
        
        # 解析响应中的工具调用
        tool_calls = parse_tool_calls(resp.content)
        
        # 输出 LLM 原始响应
        print(f"\n{'='*60}")
        print(f"[Step {step+1}] LLM Output:")
        print(f"{'='*60}")
        print(f"Content:\n{resp.content}")
        if tool_calls:
            print(f"\n🔧 Parsed {len(tool_calls)} tool call(s):")
            for tc in tool_calls:
                print(f"  - {tc['tool']}: {tc['arguments']}")
        print(f"{'='*60}")
        
        # 保存助手响应到历史
        conversation_history.append({"role": "assistant", "content": resp.content})
        
        if not tool_calls:
            # 没有工具调用，说明 LLM 已经给出最终答案
            raw_json = json.dumps({
                "topic": topic,
                "tool_calls": tool_interactions,
            }, ensure_ascii=False)
            return {
                "raw_notes": raw_json
            }
        
        # 检查是否调用了 ResearchComplete
        if any(tc["tool"] == "ResearchComplete" for tc in tool_calls):
            print("\n✅ Research completed by agent")
            return {
                "raw_notes": "\n\n".join([m["content"] for m in conversation_history if m.get("content")])
            }
        
        # 添加助手消息到对话
        messages.append({"role": "assistant", "content": resp.content})
        
        # 执行所有工具调用
        tool_results = await execute_tool_calls(tool_calls, mcp_clients)

        # 记录本轮工具调用及结果（结构化为 JSON 项）
        call_info_map = {tc["id"]: {"tool": tc["tool"], "arguments": tc.get("arguments", {})} for tc in tool_calls}
        for tr in tool_results:
            call_id = tr.get("tool_call_id")
            info = call_info_map.get(call_id, {})
            result_text = tr.get("result", "")
            # 优先尝试解析为 JSON
            parsed_result: Any
            try:
                parsed_result = json.loads(result_text)
            except Exception:
                parsed_result = result_text
            tool_interactions.append({
                "step": step + 1,
                "id": call_id,
                "tool": tr.get("tool") or info.get("tool"),
                "arguments": info.get("arguments", {}),
                "result": parsed_result,
            })
        
        # 将工具结果添加回对话
        # 格式化为易读的文本，让 LLM 理解
        results_text = "\n\n".join([
            f"<tool_result tool_call_id=\"{tr['tool_call_id']}\" tool=\"{tr['tool']}\">\n{tr['result']}\n</tool_result>"
            for tr in tool_results
        ])
        
        messages.append({"role": "user", "content": f"Tool results:\n{results_text}"})
        conversation_history.append({"role": "tool_results", "content": results_text})
    
    # 达到最大步数，返回已有的内容
    # 达到最大步数，返回已收集到的工具交互 JSON
    raw_json = json.dumps({
        "topic": topic,
        "tool_calls": tool_interactions,
    }, ensure_ascii=False)
    return {"raw_notes": raw_json}


if __name__ == "__main__":
    """在 VSCode 中直接点击 Run 按钮即可测试"""
    import asyncio
    
    class TestConfig:
        research_model = "openai/o4-mini"
        research_model_max_tokens = 128000
        max_react_tool_calls = 3
    
    async def test():
        result = await run_research_llm_driven("德国大众的过去50年的历史，以及它早期的发展路线?", TestConfig())
    
    asyncio.run(test())
