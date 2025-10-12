# Railway 快速部署指南 🚀

## 📝 已完成的修复

✅ **创建 Procfile** - Railway 启动配置
✅ **创建 railway.json** - 构建和部署配置  
✅ **重命名为 main.py** - Railway 自动识别的启动文件
✅ **修复导入和 CORS** - 支持部署环境
✅ **完整部署文档** - 查看 DEPLOYMENT.md

## ⚡ 快速开始（3步）

### 1️⃣ 上传到 Railway
- 登录 [Railway](https://railway.app/)
- 点击 "New Project" → "Deploy from GitHub repo"
- 选择你的仓库，**根目录选择 `deep_wide_research` 文件夹**

### 2️⃣ 配置环境变量
在 Railway 项目设置中添加（至少需要这些）：
```
OPENAI_API_KEY=sk-...
TAVILY_API_KEY=tvly-...
```

可选的其他 API keys：
```
ANTHROPIC_API_KEY=...
GOOGLE_API_KEY=...
EXA_API_KEY=...
```

### 3️⃣ 部署完成 ✨
- Railway 会自动检测并部署
- 获取你的 API URL：`https://your-app.up.railway.app`
- 测试健康检查：`https://your-app.up.railway.app/health`

## 🔗 连接前端

在你的前端 `.env` 文件中：
```
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
```

## 📚 详细文档

查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取完整的部署说明和故障排除。

## 🧪 本地测试

```bash
cd deep_wide_research
pip install -r requirements.txt
python main.py
```

访问 http://localhost:8000/docs 查看 API 文档。

