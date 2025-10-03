# Native Deep Research with MCP Integration

基于 **MCP (Model Context Protocol)** 的深度研究系统，采用 Prompt-based 工具调用方式，无需依赖 OpenAI Function Call API。

## ✨ 特性

- 🔌 **MCP 集成**: 通过 MCP 协议连接到各种工具服务器
- 🤖 **动态工具发现**: 自动获取和适配 MCP server 提供的工具
- 💬 **Prompt-based 调用**: 使用 XML 标签格式，不依赖特定 API
- 🔄 **ReAct 循环**: 智能的推理-行动循环
- 📝 **完整文档**: 详细的安装、使用和故障排查指南

## 🚀 快速开始

### 1. 安装依赖

```bash
# 激活虚拟环境
source ../researchenv/bin/activate

# 安装 MCP SDK
pip install mcp

# 安装其他依赖
pip install -r requirements.txt
```

### 2. 设置 API Keys

创建 `.env` 文件：

```bash
# OpenRouter API Key (必需)
OPENROUTER_API_KEY=your-openrouter-key

# Brave Search API Key (如果使用 Brave Search)
BRAVE_API_KEY=your-brave-api-key
```

### 3. 运行测试

```bash
# 测试 MCP Client
python mcp_client.py

# 快速启动完整系统
python quick_start.py
```

## 📁 项目结构

```
native_deep_research/
├── mcp_client.py              # MCP 客户端实现 ✅
├── research_strategy.py       # 研究循环逻辑 ✅
├── providers.py               # LLM 调用封装 ✅
├── prompts.py                 # Prompt 模板
├── search.py                  # 搜索工具
├── engine.py                  # 研究引擎
├── report_strategy.py         # 报告生成
│
├── quick_start.py             # 快速启动脚本 🆕
├── example_usage.py           # 使用示例 🆕
│
├── README.md                  # 本文件 📖
├── SETUP_GUIDE.md            # 详细安装指南 📖
├── README_MCP.md             # MCP 架构文档 📖
├── IMPLEMENTATION_SUMMARY.md # 实现总结 📖
│
└── requirements.txt          # Python 依赖
```

## 📖 文档导航

根据你的需求选择：

| 文档 | 适用场景 |
|------|---------|
| **SETUP_GUIDE.md** | 第一次设置，遇到安装问题 |
| **README_MCP.md** | 了解架构，深入理解 MCP 集成 |
| **IMPLEMENTATION_SUMMARY.md** | 了解改造过程，技术细节 |
| **example_usage.py** | 查看代码示例 |

## 💡 使用示例

### 基本用法

```python
import asyncio
from mcp_client import MCPClient
from research_strategy import run_research_llm_driven

class Config:
    research_model = "openai/gpt-4o-mini"
    research_model_max_tokens = 2000
    max_react_tool_calls = 5

async def main():
    # 创建并连接 MCP client
    async with MCPClient.create_stdio_client(
        command="npx",
        args=["-y", "@modelcontextprotocol/server-brave-search"]
    ) as client:
        # 运行研究
        result = await run_research_llm_driven(
            topic="What are the latest AI developments?",
            cfg=Config(),
            mcp_client=client
        )
        
        # raw_notes is JSON with collected tool calls and results
        print(result["raw_notes"])  # JSON string

asyncio.run(main())
```

### 使用不同的 MCP Server

```python
# Brave Search
client = MCPClient.create_stdio_client(
    command="npx",
    args=["-y", "@modelcontextprotocol/server-brave-search"]
)

# 自定义 Python MCP Server
client = MCPClient.create_stdio_client(
    command="python",
    args=["your_mcp_server.py"]
)

# HTTP MCP Server
client = MCPClient.create_http_client(
    server_url="http://localhost:3000"
)
```

## 🔧 工作原理

### 1. 初始化阶段

```
创建 MCP Client → 连接 MCP Server → 获取工具列表 → 构建 System Prompt
```

### 2. 研究循环

```
用户提问
  ↓
LLM 分析并决定是否调用工具
  ↓
输出 <tool_call> 标签
  ↓
解析并通过 MCP 执行工具
  ↓
将结果返回给 LLM
  ↓
LLM 继续推理或给出最终答案
```

### 3. 工具调用格式

**LLM 输出:**
```xml
<tool_call>
{
  "tool": "search",
  "arguments": {
    "query": "Python vs Rust"
  }
}
</tool_call>
```

**系统响应:**
```xml
<tool_result tool_call_id="call_1" tool="search">
{"result": "Search results..."}
</tool_result>
```

## 🎯 支持的 MCP Servers

| Server | 命令 | API Key 需求 |
|--------|------|-------------|
| Brave Search | `npx -y @modelcontextprotocol/server-brave-search` | BRAVE_API_KEY |
| 自定义 Server | `python your_server.py` | 取决于实现 |

更多 MCP servers: https://github.com/modelcontextprotocol/servers

## ❓ 常见问题

### Q: 如何知道有哪些工具可用？

系统会自动从 MCP server 获取工具列表，并动态构建 prompt。运行时会打印：

```
✅ Found 2 tool(s):
  - search: Search the web
  - analyze: Analyze text
```

### Q: 支持哪些 LLM？

任何通过 OpenRouter 支持的模型：
- OpenAI GPT-4/GPT-3.5
- Anthropic Claude
- Google Gemini
- 等等

### Q: 如何调试？

1. 查看 LLM 输出（包含工具调用）
2. 查看工具执行结果
3. 启用详细日志：
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## 🛠️ 故障排查

| 问题 | 解决方案 |
|------|---------|
| `ModuleNotFoundError: No module named 'mcp'` | `pip install mcp` |
| MCP server 连接失败 | 检查 Node.js/npx 安装 |
| 缺少 API Key | 在 `.env` 中设置 |
| 工具调用失败 | 检查工具参数格式 |

详细说明: [SETUP_GUIDE.md](./SETUP_GUIDE.md)

## 🔗 相关资源

- [MCP 官方文档](https://modelcontextprotocol.io)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Servers 列表](https://github.com/modelcontextprotocol/servers)
- [OpenRouter](https://openrouter.ai)

## 📝 开发状态

- ✅ MCP Client 实现完成
- ✅ Prompt-based 工具调用完成
- ✅ 动态工具发现完成
- ✅ 研究循环集成完成
- ✅ 文档完善
- ✅ 示例代码完成

## 🤝 贡献

欢迎提交 issues 和 pull requests！

## 📄 License

MIT License

---

**🎉 祝你研究愉快！**

如有问题，请查看:
- 安装问题 → `SETUP_GUIDE.md`
- 使用方法 → `example_usage.py`
- 架构理解 → `README_MCP.md`
