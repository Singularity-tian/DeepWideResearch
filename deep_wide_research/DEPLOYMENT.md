# Railway 部署指南

## 部署步骤

### 1. 准备工作
确保你的 `deep_wide_research` 文件夹包含以下文件：
- ✅ `Procfile` - Railway 启动配置
- ✅ `railway.json` - Railway 构建配置
- ✅ `requirements.txt` - Python 依赖
- ✅ `main.py` - FastAPI 应用（Railway 自动识别）

### 2. 在 Railway 上创建新项目

1. 登录 [Railway](https://railway.app/)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo" 或 "Deploy from local directory"
4. 选择 `deep_wide_research` 文件夹

### 3. 配置环境变量

在 Railway 项目的 Variables 标签页中，添加以下环境变量：

#### 必需的 API Keys：
```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_API_KEY=your_google_api_key_here
```

#### 搜索 API Keys（至少需要一个）：
```
TAVILY_API_KEY=your_tavily_api_key_here
EXA_API_KEY=your_exa_api_key_here
```

#### 可选配置：
```
# 如果需要限制 CORS 来源（逗号分隔）
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://another-domain.com
```

**注意**：如果不设置 `ALLOWED_ORIGINS`，在 Railway 环境中会自动允许所有来源（用于开发）。

### 4. 部署设置

Railway 会自动：
- ✅ 检测 Python 项目
- ✅ 安装 `requirements.txt` 中的依赖
- ✅ 使用 `Procfile` 中的启动命令
- ✅ 设置 `$PORT` 环境变量

### 5. 验证部署

部署完成后，访问以下端点验证：

- **根路径**: `https://your-app.up.railway.app/`
  - 应该返回 API 信息
  
- **健康检查**: `https://your-app.up.railway.app/health`
  - 应该返回 `{"status": "healthy"}`
  
- **API 文档**: `https://your-app.up.railway.app/docs`
  - FastAPI 自动生成的交互式 API 文档

### 6. 连接前端

部署成功后，将 Railway 提供的 URL 配置到你的前端应用中：

```typescript
// 在前端配置文件中
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-app.up.railway.app'
```

如果需要限制 CORS，记得在 Railway 的环境变量中添加你的前端域名到 `ALLOWED_ORIGINS`。

## 故障排除

### 问题：找不到启动命令
**解决方案**：确保 `Procfile` 和 `railway.json` 都在 `deep_wide_research` 文件夹中。

### 问题：模块导入错误
**错误信息**：`ImportError: attempted relative import with no known parent package`

**解决方案**：所有模块文件（`engine.py`, `research_strategy.py`, `generate_strategy.py`）已更新为支持三种导入方式：
1. 相对导入（`from .module import ...`）- 开发环境
2. 绝对导入（`from deep_wide_research.module import ...`）- 项目根目录
3. 独立导入（`from module import ...`）- Railway 部署环境

这些导入会按顺序尝试，确保在任何环境下都能正常工作。

### 问题：CORS 错误
**解决方案**：
1. 如果在开发环境，应该已经允许所有来源
2. 如果在生产环境，设置 `ALLOWED_ORIGINS` 环境变量包含你的前端域名

### 问题：API Key 错误
**解决方案**：确保在 Railway 的 Variables 标签页中正确设置了所有必需的 API keys。

## 本地测试

在部署前，可以本地测试：

```bash
# 进入目录
cd deep_wide_research

# 安装依赖
pip install -r requirements.txt

# 测试导入（验证模块导入配置）
python test_imports.py

# 运行服务器
python main.py

# 或使用 uvicorn
uvicorn main:app --reload
```

访问 `http://localhost:8000/docs` 查看 API 文档。

### 验证部署准备

在推送到 Railway 之前，运行 `test_imports.py` 确保所有导入都正常工作：

```bash
python test_imports.py
```

如果看到 `✅ All imports successful! Ready for Railway deployment.`，说明已准备好部署。

