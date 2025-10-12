"""Report generation stage strategy for Deep Research.

This module encapsulates the final report creation using an LLM, based on
messages, research brief (optional), and findings collected during research.
"""

from __future__ import annotations

from typing import Dict, List, Optional

# 支持直接运行和模块导入 - 尝试绝对导入和相对导入
try:
    # 尝试作为包的一部分导入（开发环境）
    from .newprompt import final_report_generation_prompt
    from .providers import chat_complete
except ImportError:
    # 尝试绝对导入（直接运行或部署环境）
    try:
        from deep_wide_research.newprompt import final_report_generation_prompt
        from deep_wide_research.providers import chat_complete
    except ImportError:
        # 作为独立模块导入（Railway 部署环境）
        from newprompt import final_report_generation_prompt
        from providers import chat_complete


def _today_str() -> str:
    import datetime as _dt

    now = _dt.datetime.now()
    return f"{now:%a} {now:%b} {now.day}, {now:%Y}"


async def generate_report(state: Dict, cfg, api_keys: Optional[dict] = None) -> str:
    """Generate the final report and return its content string.

    Side effect: none on input state; returns the report so caller can
    decide how to persist it.
    """
    findings = "\n".join(state.get("notes") or [])
    system_message = {"role": "system", "content": final_report_generation_prompt.format(date=_today_str())}
    # 用户消息：包含原始用户问题与 raw_notes JSON（已在 engine 注入到 messages）
    user_payload = {
        "role": "user",
        "content": (
            "<Messages>\n" +
            "\n\n".join(f"{m['role'].upper()}: {m['content']}" for m in state.get("messages", [])) +
            "\n</Messages>\n\n" +
            "<Findings>\n" + findings + "\n</Findings>"
        )
    }

    # 可选：打印调试
    print(system_message["content"])
    print(user_payload["content"])

    resp = await chat_complete(
        cfg.final_report_model,
        [system_message, user_payload],
        cfg.final_report_model_max_tokens,
        api_keys,
    )
    return resp.content


