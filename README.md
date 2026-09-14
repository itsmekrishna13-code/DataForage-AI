# 📊 DataForge AI — Universal Data Science Automation Platform

**Upload any CSV. Get instant EDA, ML modeling, AI-powered insights, and a production-ready deployable API — no hardcoded columns, no setup.**

DataForge AI is a full-stack application that automates the entire data science workflow for any tabular dataset: automated exploratory data analysis (EDA), machine learning model training with rigorous validation, SHAP-based explainability, AI-assisted feature engineering, natural-language data chat, and one-click export to a standalone FastAPI service.

---

## ✨ Key Features

### Data Analysis
- **Universal CSV upload** — works with any dataset; no hardcoded column names
- **Automated EDA** — shape, missing values, duplicates, and column classification (Numeric / Categorical / Text / Date)
- **AI target suggestion** — automatically detects the most likely prediction target and problem type (Classification / Regression)
- **Interactive dashboard** — Plotly visualizations: distributions, correlation heatmaps, category breakdowns
- **Chat to Chart** — request visualizations in natural language; the AI generates the matching Plotly chart

### Machine Learning
- **Multi-model comparison** — trains and compares Linear/Logistic Regression, Decision Tree, and Random Forest side-by-side
- **Proper validation** — explicit train/test split plus 5-fold cross-validation (auto-switches to 3-fold on large datasets), with a baseline comparison to verify real improvement over naive guessing
- **Auto model selection** — the best model (by cross-validated score) is used for predictions and export
- **Dynamic prediction form** — input widgets auto-generated from detected feature types

### Explainability & Quality
- **SHAP global explanations** — summary (beeswarm) plots of feature importance and direction
- **SHAP per-prediction explanations** — waterfall plots showing exactly why a specific prediction was made
- **Data quality score** — composite 0–100 score from missing values, duplicates, and outliers, with actionable suggestions

### AI-Powered Feature Engineering
- **AI feature proposals** — the LLM suggests new engineered features with reasoning; one-click to add and retrain
- **Outlier detection** — IQR-based detection across numeric columns with an option to drop or keep flagged rows

### Reports & Production Export
- **PDF report** — dataset overview, missing-value summary, and model performance
- **Jupyter Notebook export** — a fully executable `.ipynb` reproducing the entire analysis session
- **AI data chat** — ask natural-language questions about your dataset
- **Model persistence** — download the trained model (`.pkl`) including feature names and encodings
- **FastAPI code generator** — generates a ready-to-run FastAPI server (`/predict` + `/health`, Pydantic schema matched to your dataset) for deployment outside the app

---

## 🏗️ Architecture

```
┌──────────────────┐        HTTP/JSON         ┌──────────────────────┐
│   Frontend       │ ───────────────────────► │       Backend        │
│  React 19 /      │                          │  FastAPI (Uvicorn)   │
│  TanStack Start  │  ◄─────────────────────  │  SQLAlchemy ORM      │
│  Vite + Tailwind │   REST API (port 8000)   ├──────────────────────┤
└──────────────────┘                          │  Supabase Postgres   │
                                              │  (users + sessions)  │
                                              ├──────────────────────┤
                                              │  AI Provider Chain   │
                                              │  Groq / Gemini /     │
                                              │  OpenRouter /        │
                                              │  Cerebras / Hugging  │
                                              │  Face                │
                                              └──────────────────────┘
```

### Tech Stack

| Layer | Technology |
|---|---|
| Language | Python 3.12 · TypeScript 5.x |
| Backend | FastAPI, SQLAlchemy, Uvicorn, Pydantic |
| Frontend | React 19, TanStack Start, TanStack Router & Query, Vite |
| Styling | Tailwind CSS v4, shadcn/ui (Radix UI primitives) |
| Database | Supabase Postgres (hosted) · SQLite fallback for local dev |
| Data & ML | Pandas, NumPy, Scikit-learn, Matplotlib, Plotly, SHAP |
| Auth | Google OAuth 2.0 (Authlib) + JWT |
| AI Providers | Groq, Gemini, OpenRouter, Cerebras, Hugging Face |
| Export & Reports | FastAPI codegen, FPDF2, nbformat |
| Package Managers | uv (backend) · npm / bun (frontend) |

---

## 📁 Repository Structure

```
dataforge-ai/
├── backend/                      # FastAPI application
│   ├── app/
│   │   ├── main.py               # App entrypoint, CORS, router registration
│   │   ├── database.py           # SQLAlchemy engine (Supabase / SQLite)
│   │   ├── models.py             # User & UserSession ORM models
│   │   ├── api/routes/           # HTTP endpoints (auth, upload, eda, ml, ...)
│   │   ├── core/                 # Config, auth (OAuth/JWT), session store
│   │   ├── services/             # Business logic (EDA, ML, SHAP, exports, ...)
│   │   └── ...
│   ├── .env.example              # Template — copy to .env
│   ├── pyproject.toml            # UV project definition
│   ├── requirements.txt          # pip-compatible dependency list
│   ├── uv.lock                   # Locked dependency versions
│   └── .venv/                    # Virtual environment (not committed)
│
├── Frontend/                     # TanStack Start web application
│   ├── src/
│   │   ├── routes/               # Page routes (index, history, ...)
│   │   ├── components/ui/        # shadcn/ui components
│   │   ├── components/ds/        # Domain components (Dashboard, UploadZone, ...)
│   │   ├── services/api.ts       # Typed API client (with mock fallback)
│   │   ├── lib/config.ts         # API_BASE_URL (VITE_API_URL)
│   │   └── ...
│   ├── package.json
│   └── ...
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12 | Backend runtime |
| UV | latest | Backend dependency management |
| Node.js | ≥ 20 | Frontend runtime |
| npm or bun | latest | Frontend package manager |
| Supabase account *(optional)* | — | Hosted Postgres; skip to use local SQLite |

### 1. Clone the repository

```bash
git clone https://github.com/itsmekrishna13-code/dataforge-ai-backend.git
cd dataforge-ai-backend
```

### 2. Start the backend

```bash
cd backend
uv sync                # creates .venv and installs dependencies
```

Start the server:

```bash
uv run uvicorn app.main:app --port 8000 --reload
```

Or, using pip:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate      # Windows   |   source .venv/bin/activate  (macOS/Linux)
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

> ⚠️ **Note:** Startup takes ~20–40 seconds because of heavy imports (SHAP, pandas, scikit-learn). Check `http://localhost:8000/health` → `{"status":"ok"}`.

### 3. Configure environment variables (backend)

Copy the template and fill in your keys:

```bash
cd backend
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | Recommended | Groq LLM (primary AI provider) |
| `GEMINI_API_KEY` | Optional | Gemini LLM (fallback provider) |
| `OPENROUTER_API_KEY` | Optional | OpenRouter LLM (fallback provider) |
| `CEREBRAS_API_KEY` | Optional | Cerebras LLM (fallback provider) |
| `HUGGINGFACE_API_KEY` | Optional | Hugging Face LLM (final fallback) |
| `GOOGLE_CLIENT_ID` | **Yes** | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | **Yes** | Google OAuth client secret |
| `JWT_SECRET` | **Yes** | Secret used to sign session JWTs |
| `GOOGLE_REDIRECT_URI` | Optional | Defaults to `http://localhost:8000/auth/google/callback` |
| `FRONTEND_URL` | Optional | Frontend origin; defaults to `http://localhost:5173` and is added to CORS |
| `DATABASE_URL` | Optional | Postgres URL; unset → local SQLite (`sqlite:///./sql_app.db`) |

> 🔒 **Security:** `.env` is gitignored. Never commit API keys or secrets. Use a fresh `JWT_SECRET` (e.g. `python -c "import secrets; print(secrets.token_urlsafe(64))"`).

#### Optional — Supabase Postgres

The app auto-creates its `users` and `user_sessions` tables on startup, so pointing it at a hosted database is drop-in:

```
DATABASE_URL=postgresql://postgres.<project>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Create the tables by simply starting the server once. No schema migrations required.

### 4. Start the frontend

```bash
cd Frontend
npm install          # or: bun install
```

Configure the backend URL (optional — defaults to `http://localhost:8000`):

```bash
# Frontend/.env
VITE_API_URL=http://localhost:8000
```

Run the dev server:

```bash
npm run dev          # or: bun run dev   →  http://localhost:5173
```

---

## 🔌 API Reference

Interactive docs are available at `http://localhost:8000/docs` (Swagger UI) once the backend is running.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/` | Upload a CSV (multipart `file`) → `{ job_id }` |
| **Auth & Users** |
| `GET` | `/auth/google/login` | Start Google OAuth sign-in |
| `GET` | `/auth/google/callback` | OAuth callback (redirects to frontend) |
| `GET` | `/auth/me` | Current authenticated user |
| `POST` | `/auth/logout` | Sign out |
| `GET` | `/user/history` | User's session history |
| **EDA** |
| `GET` | `/eda/{job_id}` | Dataset overview |
| `GET` | `/eda/insights/{job_id}` | AI-generated dataset insights |
| `GET` | `/eda/visualizations/{job_id}` | Auto-generated Plotly charts |
| **Machine Learning** |
| `GET` | `/ml/columns/classify/{job_id}` | Column type classification |
| `GET` | `/ml/problem-type/{job_id}` | Detect Classification / Regression |
| `GET` | `/ml/target/suggest/{job_id}` | AI-suggested target column |
| `POST` | `/ml/train/{job_id}` | Train & compare models (CV) |
| `GET` | `/ml/model-info/{job_id}` | Best model details |
| `POST` | `/ml/predict/{job_id}` | Run predictions |
| `GET` | `/ml/history/{job_id}` | Training history |
| `GET` | `/ml/insights/{job_id}` | ML performance insights |
| `POST` | `/ml/chat-to-chart/{job_id}` | Natural-language → Plotly chart |
| **Explainability & Quality** |
| `GET` | `/shap/global/{job_id}` | SHAP feature importance |
| `POST` | `/shap/predict/{job_id}` | Per-prediction SHAP explanations |
| `GET` | `/data-quality/{job_id}` | Data quality score & suggestions |
| **Feature Engineering** |
| `GET` | `/feature-engineering/{job_id}` | AI feature suggestions |
| `POST` | `/feature-engineering/{job_id}` | Apply engineered features + retrain |
| **Outliers** |
| `GET` | `/outliers/{job_id}` | Detect outliers (IQR) |
| `POST` | `/outliers/{job_id}` | Apply outlier handling |
| **Reports & Export** |
| `GET` | `/report/{job_id}` | Download PDF report |
| `GET` | `/notebook/{job_id}` | Download executable Jupyter notebook |
| `GET` | `/export/model/{job_id}` | Download trained model (`.pkl`) |
| `GET` | `/export/code/{job_id}` | Download generated FastAPI service (`/predict` + `/health`) |
| **AI Chat** |
| `POST` | `/chat/chat/{job_id}` | Ask natural-language questions about the dataset |

---

## 🔐 Authentication

- Sign-in uses **Google OAuth 2.0** (Authlib). After the callback, the API issues a **signed JWT** which the frontend stores and sends for protected routes.
- Supported CORS origins: `localhost:5173`, `localhost:8080`, the Vercel deployment, and the value of `FRONTEND_URL`.
- On first sign-in, a `users` row is created; every upload inserts a `user_sessions` row (available via `/user/history`).

---

## 🧠 AI Provider Fallback Chain

All AI features (insights, chat, feature suggestions, target detection, chart generation) route through a resilient multi-provider chain to avoid rate-limit failures:

```
Groq (openai/gpt-oss-120b)
   → Gemini (gemini-3.6-flash)
   → OpenRouter (openrouter/free)
   → Cerebras (gemma-4-31b)
   → Hugging Face (Llama-3.2-3B-Instruct)
```

If a provider fails or hits its quota, the app silently falls through to the next one.

---

## 🛠️ Troubleshooting

| Issue | Fix |
|---|---|
| Backend won't start | Confirm `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `JWT_SECRET` are set in `backend/.env` (the app refuses to boot without them) |
| Start takes 20–40s | Expected — heavy ML imports (SHAP/pandas/sklearn). Wait for `/health` to return `{"status":"ok"}` |
| Frontend can't reach API | Set `VITE_API_URL` in `Frontend/.env` or verify the backend runs on the port referenced by `Frontend/src/lib/config.ts` |
| Supabase connection refused | Use the **Transaction mode pooler** host (`aws-0-<region>.pooler.supabase.com:6543`) — the direct `db.<ref>.supabase.co` host is IPv6-only |
| Rate-limit errors from AI | Add more provider keys so the fallback chain can switch |

---

## 🗺️ Roadmap

- [x] Universal EDA & visualization pipeline
- [x] Multi-model training with cross-validation
- [x] SHAP explainability (global + per-prediction)
- [x] AI-powered feature engineering
- [x] FastAPI export for standalone deployment
- [x] Google OAuth + JWT authentication
- [x] Session history with Supabase Postgres
- [ ] Public deployment of frontend + backend

---

## 📄 License

This project is open for educational and portfolio use.

---

## 👤 Author

**Krishna Singh** — BSc Data Science student
GitHub: [@itsmekrishna13-code](https://github.com/itsmekrishna13-code)

---

*See [`PROJECT_LOG.md`](PROJECT_LOG.md) for the complete development history and [`02_CURRENT_STATUS.md`](02_CURRENT_STATUS.md) for live deployment status.*