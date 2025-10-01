# PuppyResearch

Open-source DeepResearch & Wide Research.

PuppyResearch is an open-source monorepo that combines a FastAPI backend and a Next.js 15 + React 19 frontend to power two complementary research modes:

- DeepResearch: iterative, multi-step reasoning and refinement.
- Wide Research: breadth-first exploration across diverse sources.

## Repository Structure

- `backend/`: FastAPI application and Python dependencies
- `frontend/`: Next.js 15 + React 19 application

## Quick Start

### Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API root: http://localhost:8000  
Health check: http://localhost:8000/health

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Web app: http://localhost:3000

## Environment Variables

- Create `.env` files inside `backend/` and `frontend/` as needed (e.g., `.env.local`).
- Do not commit secrets. The root `.gitignore` ignores common `.env*` files while allowing `*.env.example`.

## Notes

- CORS is permissive for development. For production, restrict `allow_origins` in `backend/app/main.py`.
- Frontend scripts: `npm run dev`, `npm run build`, `npm start`, `npm run lint` (see `frontend/package.json`).

## License

Open source. Add a LICENSE file (recommended: MIT).
