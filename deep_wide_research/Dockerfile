# 使用同时包含 Python 和 Node.js 的基础镜像
FROM nikolaik/python-nodejs:python3.12-nodejs20

WORKDIR /app

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

# 暴露端口（Railway 会动态分配）
EXPOSE ${PORT:-8000}

# 启动命令（使用 shell 形式以支持环境变量）
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}

