# PuppyResearch Backend (FastAPI)

## Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints
- GET `/` → Welcome message
- GET `/health` → Health status
