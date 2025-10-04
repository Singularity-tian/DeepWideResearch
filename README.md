<p align="center">
  <img src="asserts/DWResearch.png" alt="Deep & Wide Research Logo" width="120" />
</p>

<h1 align="center">Deep Wide Research</h1>

<p align="center">
  <a href="https://www.puppyagent.com" target="_blank">
    <img src="https://img.shields.io/badge/Web-puppyagent.com-39BC66?style=flat&logo=google-chrome&logoColor=white" alt="Homepage" height="22" />
  </a>
  &nbsp;
  <a href="https://x.com/PuppyAgentTech" target="_blank">
    <img src="https://img.shields.io/badge/X-@PuppyAgentTech-000000?style=flat&logo=x&logoColor=white" alt="X (Twitter)" height="22" />
  </a>
  &nbsp;
  <a href="https://discord.gg/puppychat" target="_blank">
    <img src="https://img.shields.io/badge/Discord-Join-5865F2?style=flat&logo=discord&logoColor=white" alt="Discord" height="22" />
  </a>
  &nbsp;
  <a href="mailto:support@puppyagent.com">
    <img src="https://img.shields.io/badge/Support-support@puppyagent.com-F44336?style=flat&logo=gmail&logoColor=white" alt="Support" height="22" />
  </a>
</p>

<p align="center">Open-source Deep and Wide Research Agent</p>

 Deep Wide Research is an open-source Researching AI agent that unifies two research modes:
 - Deep Research: accuracy-first, deep analysis with multi-step reasoning and verification for high-confidence answers.
 - Wide Research: breadth-first exploration with cross-source synthesis and summarization for a comprehensive overview.

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
