"""测试脚本 - 验证导入在不同环境下都能正常工作"""

print("Testing imports in deployment environment...")
print("-" * 60)

# 模拟 Railway 部署环境的导入方式
try:
    from engine import run_deep_research_stream, Configuration
    print("✓ engine imports successful")
except Exception as e:
    print(f"✗ engine import failed: {e}")
    exit(1)

try:
    from research_strategy import run_research_llm_driven
    print("✓ research_strategy imports successful")
except Exception as e:
    print(f"✗ research_strategy import failed: {e}")
    exit(1)

try:
    from generate_strategy import generate_report
    print("✓ generate_strategy imports successful")
except Exception as e:
    print(f"✗ generate_strategy import failed: {e}")
    exit(1)

try:
    from main import app
    print("✓ main.py (FastAPI app) imports successful")
except Exception as e:
    print(f"✗ main.py import failed: {e}")
    exit(1)

print("-" * 60)
print("✅ All imports successful! Ready for Railway deployment.")

