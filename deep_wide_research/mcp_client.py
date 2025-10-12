"""MCP Client for connecting to MCP servers and executing tools.

This module provides a unified interface for interacting with MCP servers,
including listing available tools and executing tool calls.

Features:
- Pluggable MCP server configuration
- Built-in support for Tavily and Exa
- Easy registration of custom MCP servers
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

# 加载 .env 文件
try:
    from dotenv import load_dotenv
    from pathlib import Path
    
    # 明确指定 .env 文件路径（在当前文件所在目录）
    env_path = Path(__file__).parent / ".env"
    load_dotenv(dotenv_path=env_path)
except ImportError:
    pass  # 如果没安装 python-dotenv，继续使用系统环境变量


# ============================================================================
# MCP Server Configuration System
# ============================================================================

@dataclass
class MCPServerConfig:
    """MCP Server 配置
    
    Attributes:
        name: Server 名称 (e.g., "tavily", "exa")
        transport_type: 传输类型 ("stdio" 或 "http")
        command: stdio 模式的命令 (e.g., "npx", "node")
        args: stdio 模式的参数 (e.g., ["-y", "@tavily/mcp-server"])
        env: 环境变量 (e.g., {"TAVILY_API_KEY": "xxx"})
        server_url: http 模式的 server URL
        description: Server 描述
    """
    name: str
    transport_type: str = "stdio"
    command: Optional[str] = None
    args: Optional[List[str]] = None
    env: Optional[Dict[str, str]] = None
    server_url: Optional[str] = None
    description: str = ""


class MCPRegistry:
    """MCP Server 注册中心
    
    管理所有已注册的 MCP server 配置，支持动态添加和查询。
    
    使用示例:
        registry = MCPRegistry()
        
        # 注册 server
        registry.register(MCPServerConfig(
            name="tavily",
            command="npx",
            args=["-y", "@tavily/mcp-server"],
            env={"TAVILY_API_KEY": os.getenv("TAVILY_API_KEY")}
        ))
        
        # 获取 server 配置
        config = registry.get("tavily")
        
        # 创建 client
        client = await registry.create_client("tavily")
    """
    
    def __init__(self):
        self._servers: Dict[str, MCPServerConfig] = {}
        self._load_builtin_servers()
        self._active_clients: List["MCPClient"] = []
    
    def _load_builtin_servers(self):
        """加载内置的 MCP servers (Tavily, Exa)"""
        
        # 在 Railway 上跳过 MCP（因为 npx 不稳定）
        if os.getenv("RAILWAY_ENVIRONMENT"):
            print("⚠️  MCP servers skipped in Railway environment (use native search APIs)")
            return
        
        # Tavily MCP Server (本地开发用)
        # 文档: https://docs.tavily.com/documentation/mcp
        tavily_api_key = os.getenv("TAVILY_API_KEY")
        if tavily_api_key:
            self.register(MCPServerConfig(
                name="tavily",
                transport_type="stdio",
                command="npx",
                args=["-y", "tavily-mcp@0.1.3"],
                env={"TAVILY_API_KEY": tavily_api_key},
                description="Tavily search MCP server - powerful web search"
            ))
        else:
            print("⚠️  Tavily MCP server skipped: TAVILY_API_KEY not found")
        
        # Exa MCP Server (本地开发用)
        # 文档: https://docs.exa.ai/reference/exa-mcp
        exa_api_key = os.getenv("EXA_API_KEY")
        if exa_api_key:
            self.register(MCPServerConfig(
                name="exa",
                transport_type="stdio",
                command="npx",
                args=["-y", "exa-mcp-server"],
                env={"EXA_API_KEY": exa_api_key},
                description="Exa search MCP server - AI-powered web search, code search, and research"
            ))
        else:
            print("⚠️  Exa MCP server skipped: EXA_API_KEY not found")
    
    def register(self, config: MCPServerConfig, silent: bool = False) -> None:
        """注册一个 MCP server
        
        Args:
            config: MCP server 配置
            silent: 是否静默模式（不打印日志）
        """
        if config.name in self._servers and not silent:
            print(f"⚠️  Overwriting existing MCP server: {config.name}")
        self._servers[config.name] = config
        if not silent:
            print(f"✅ Registered MCP server: {config.name}")
    
    def unregister(self, name: str) -> bool:
        """注销一个 MCP server
        
        Args:
            name: Server 名称
            
        Returns:
            是否成功注销
        """
        if name in self._servers:
            del self._servers[name]
            print(f"✅ Unregistered MCP server: {name}")
            return True
        return False
    
    def get(self, name: str) -> Optional[MCPServerConfig]:
        """获取 MCP server 配置
        
        Args:
            name: Server 名称
            
        Returns:
            Server 配置，如果不存在则返回 None
        """
        return self._servers.get(name)
    
    def list_servers(self) -> List[str]:
        """列出所有已注册的 server 名称"""
        return list(self._servers.keys())
    
    def list_configs(self) -> List[MCPServerConfig]:
        """列出所有已注册的 server 配置"""
        return list(self._servers.values())
    
    async def create_client(self, name: str) -> Optional["MCPClient"]:
        """根据注册的配置创建并连接 MCP client
        
        Args:
            name: Server 名称
            
        Returns:
            已连接的 MCPClient 实例，如果 server 不存在则返回 None
        """
        config = self.get(name)
        if not config:
            print(f"❌ MCP server '{name}' not found in registry")
            return None
        
        if config.transport_type == "stdio":
            client = MCPClient.create_stdio_client(
                command=config.command,
                args=config.args,
                env=config.env
            )
        elif config.transport_type == "http":
            client = MCPClient.create_http_client(
                server_url=config.server_url
            )
        else:
            print(f"❌ Unknown transport type: {config.transport_type}")
            return None
        
        await client.connect()
        # 记录活动 client，供统一关闭
        self._active_clients.append(client)
        return client
    
    async def collect_tools(self, config: Dict[str, List[str]]) -> tuple[List[Dict[str, Any]], List["MCPClient"]]:
        """根据配置从多个 MCP servers 收集工具
        
        Args:
            config: 二维配置，例如：
                {
                    "tavily": ["tavily-search", "tavily-extract"],
                    "exa": ["web_search_exa"]
                }
        
        Returns:
            (工具列表, client列表) - 调用方需要手动关闭 clients
        """
        all_tools = []
        clients = []
        
        for server_name, tool_names in config.items():
            if server_name not in self._servers:
                continue
            
            client = await self.create_client(server_name)
            if not client:
                continue
            
            clients.append(client)
            
            selected = await client.select_tools(tool_names)
            all_tools.extend(selected)
        
        return all_tools, clients

    async def close_all_clients(self) -> None:
        """关闭所有通过本 registry 创建并跟踪的活动 clients"""
        if not self._active_clients:
            return
        # 拷贝列表，避免迭代过程中修改
        clients = list(self._active_clients)
        self._active_clients.clear()
        for client in clients:
            try:
                await client.close()
            except Exception:
                # 避免关闭问题影响主流程
                pass


# 全局注册中心实例
_global_registry = MCPRegistry()


def get_registry() -> MCPRegistry:
    """获取全局 MCP registry 实例"""
    return _global_registry


# ============================================================================
# MCP Client
# ============================================================================

class MCPClient:
    """MCP 客户端 - 连接到 MCP server 并执行工具调用
    
    使用示例:
        # 方式1：使用 stdio 连接
        client = MCPClient.create_stdio_client(
            command="npx",
            args=["-y", "@modelcontextprotocol/server-brave-search"]
        )
        
        # 方式2：使用 HTTP 连接
        client = MCPClient.create_http_client(
            server_url="http://localhost:3000"
        )
        
        # 初始化连接
        await client.connect()
        
        # 获取工具列表
        tools = await client.list_tools()
        
        # 调用工具
        result = await client.call_tool("search", {"query": "Python"})
        
        # 关闭连接
        await client.close()
    """
    
    def __init__(self, transport_type: str = "stdio", **kwargs):
        """初始化 MCP 客户端
        
        Args:
            transport_type: 传输类型，可选 "stdio" 或 "http"
            **kwargs: 传输相关的配置参数
                - command: stdio 命令
                - args: stdio 参数
                - env: 环境变量字典
                - server_url: HTTP server URL
        """
        self.transport_type = transport_type
        self.config = kwargs
        self._connected = False
        self._session = None
        self._read_stream = None
        self._write_stream = None
        self._stdio_context = None
        
        # 根据 transport_type 初始化对应的配置
        if transport_type == "stdio":
            try:
                from mcp import StdioServerParameters
                self._stdio_params = StdioServerParameters(
                    command=kwargs.get("command"),
                    args=kwargs.get("args", []),
                    env=kwargs.get("env")
                )
            except ImportError:
                print("⚠️ MCP SDK not installed. Run: pip install mcp")
                self._stdio_params = None
        elif transport_type == "http":
            self._server_url = kwargs.get("server_url")
    
    @classmethod
    def create_stdio_client(
        cls, 
        command: str, 
        args: Optional[List[str]] = None,
        env: Optional[Dict[str, str]] = None
    ) -> MCPClient:
        """创建 stdio 传输的 MCP 客户端
        
        Args:
            command: 要执行的命令 (e.g., "npx", "node", "python")
            args: 命令参数 (e.g., ["-y", "@modelcontextprotocol/server-brave-search"])
            env: 环境变量 (e.g., {"API_KEY": "xxx"})
        
        Returns:
            MCPClient 实例
        """
        return cls(transport_type="stdio", command=command, args=args or [], env=env)
    
    @classmethod
    def create_http_client(cls, server_url: str) -> MCPClient:
        """创建 HTTP 传输的 MCP 客户端
        
        Args:
            server_url: MCP server 的 URL
        
        Returns:
            MCPClient 实例
        """
        return cls(transport_type="http", server_url=server_url)
    
    async def connect(self) -> None:
        """连接到 MCP server"""
        if self._connected:
            return
        
        try:
            if self.transport_type == "stdio":
                # 延迟在每次操作中建立连接，不在此处持久保持
                pass
                
            elif self.transport_type == "http":
                # 延迟在每次操作中创建 http session
                self._http_session = None
            
            self._connected = True
            
        except ImportError as e:
            print(f"❌ MCP SDK not installed: {e}")
            print("Run: pip install mcp")
            raise
        except Exception as e:
            print(f"❌ Failed to connect to MCP server: {e}")
            raise
    
    async def list_tools(self) -> List[Dict[str, Any]]:
        """获取 MCP server 提供的工具列表
        
        Returns:
            工具列表，MCP 标准格式：
            [
                {
                    "name": "search",
                    "description": "Search the web",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Search query"}
                        },
                        "required": ["query"]
                    }
                },
                ...
            ]
        """
        if not self._connected:
            await self.connect()
        
        try:
            if self.transport_type == "stdio":
                from mcp.client.stdio import stdio_client
                from mcp import ClientSession
                async with stdio_client(self._stdio_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        response = await session.list_tools()
                        tools = []
                        for tool in response.tools:
                            tools.append({
                                "name": tool.name,
                                "description": tool.description or "",
                                "inputSchema": tool.inputSchema if hasattr(tool, 'inputSchema') else {}
                            })
                        return tools
                
            elif self.transport_type == "http":
                import aiohttp
                async with aiohttp.ClientSession() as http_sess:
                    async with http_sess.get(f"{self._server_url}/tools") as resp:
                        if resp.status == 200:
                            return await resp.json()
                        else:
                            raise RuntimeError(f"HTTP request failed: {resp.status}")
            
        except Exception as e:
            print(f"❌ Failed to list tools: {e}")
            raise
    
    async def select_tools(self, tool_names: List[str]) -> List[Dict[str, Any]]:
        """根据工具名称选择需要的工具
        
        Args:
            tool_names: 需要的工具名称列表，例如 ["tavily-search", "web_search_exa"]
        
        Returns:
            过滤后的工具列表
        """
        all_tools = await self.list_tools()
        selected = []
        for tool in all_tools:
            if tool["name"] in tool_names:
                selected.append(tool)
        return selected
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Any:
        """调用 MCP server 上的工具
        
        Args:
            tool_name: 工具名称
            arguments: 工具参数
        
        Returns:
            工具执行结果
        """
        if not self._connected:
            await self.connect()
        
        try:
            if self.transport_type == "stdio":
                from mcp.client.stdio import stdio_client
                from mcp import ClientSession
                async with stdio_client(self._stdio_params) as (read, write):
                    async with ClientSession(read, write) as session:
                        response = await session.call_tool(
                            name=tool_name,
                            arguments=arguments
                        )
                        if hasattr(response, 'content'):
                            if isinstance(response.content, list):
                                content = []
                                for item in response.content:
                                    if hasattr(item, 'text'):
                                        content.append(item.text)
                                    elif hasattr(item, 'data'):
                                        content.append(item.data)
                                    else:
                                        content.append(str(item))
                                return {"result": "\n".join(content)}
                            else:
                                return {"result": response.content}
                        else:
                            return {"result": str(response)}
                
            elif self.transport_type == "http":
                import aiohttp
                async with aiohttp.ClientSession() as http_sess:
                    async with http_sess.post(
                        f"{self._server_url}/tool/{tool_name}",
                        json=arguments
                    ) as resp:
                        if resp.status == 200:
                            return await resp.json()
                        else:
                            raise RuntimeError(f"HTTP request failed: {resp.status}")
            
        except Exception as e:
            print(f"❌ Failed to call tool '{tool_name}': {e}")
            raise
    
    async def close(self) -> None:
        """关闭 MCP 连接"""
        if not self._connected:
            return
        
        try:
            # 采用按调用时打开/关闭的策略，这里无需实际关闭
            
            self._connected = False
            
        except Exception as e:
            # 静默处理关闭错误，但不要中断主流程
            try:
                # 最后一搏：确保标记为断开，避免重复关闭
                self._connected = False
            except:
                pass
    
    async def __aenter__(self):
        """支持 async with 语法"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """支持 async with 语法"""
        await self.close()


# 便捷函数：创建并连接 MCP client
async def create_mcp_client(
    transport_type: str = "stdio",
    **kwargs
) -> MCPClient:
    """创建并连接 MCP client
    
    Args:
        transport_type: "stdio" 或 "http"
        **kwargs: 传输相关的配置参数
            - 对于 stdio: command, args
            - 对于 http: server_url
    
    Returns:
        已连接的 MCPClient 实例
    
    使用示例:
        # stdio 方式
        client = await create_mcp_client(
            transport_type="stdio",
            command="npx",
            args=["-y", "@modelcontextprotocol/server-brave-search"]
        )
        
        # http 方式
        client = await create_mcp_client(
            transport_type="http",
            server_url="http://localhost:3000"
        )
    """
    client = MCPClient(transport_type=transport_type, **kwargs)
    await client.connect()
    return client


if __name__ == "__main__":
    """测试 MCP client 及插件注册系统"""
    import asyncio
    
    async def test_registry():
        registry = get_registry()
        
        if not registry.list_servers():
            print("No servers registered")
            return
        
        # Deep Research 需要的工具
        needed_tools = ["tavily-search", "web_search_exa", "tavily-extract"]
        
        # 测试所有注册的 servers
        for server_name in registry.list_servers():
            print(f"\n{'='*80}")
            print(f"Testing server: {server_name}")
            print('='*80)
            
            try:
                client = await registry.create_client(server_name)
                
                # 测试 select_tools()
                print("\nselect_tools() with needed tools:")
                print(f"Needed: {needed_tools}")
                selected = await client.select_tools(needed_tools)
                print(f"\nSelected {len(selected)} tool(s):")
                for tool in selected:
                    print(f"  - {tool['name']}")
                
                # 测试第一个选中的工具
                if selected:
                    tool_name = selected[0]['name']
                    test_args = {"query": "test", "max_results": 1} if "tavily" in tool_name else {"query": "test", "numResults": 1}
                    
                    print(f"\ncall_tool('{tool_name}', {json.dumps(test_args)}) raw output:")
                    result = await client.call_tool(tool_name, test_args)
                    print(json.dumps(result, indent=2))
                
                await client.close()
                
            except Exception as e:
                print(f"Error: {e}")
    
    asyncio.run(test_registry())

