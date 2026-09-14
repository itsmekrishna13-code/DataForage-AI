# DEPLOYMENT PLAN — DataForge AI (next session)

> Status: APPROVED (not yet executed). Se koi bhi "deploy karo — Render + Vercel" bole toh
> Phase 1 se shuru kar de yahan se.
> Decisions: Backend = **Render (free)**, Frontend = **Vercel**, Google OAuth validation = **relax**.

## Current state (2026-09-13)
- Backend live `:8000` local (guest mode) — `/auth/me` → Guest, `/user/history` → `[]`
- Frontend `:5173` dev OK (Vite, HTTP 200), `npx tsc --noEmit` clean
- Sign-in removed (guest mode): `backend/app/core/auth.py` + `Sidebar.tsx` + `HistoryPage.tsx`
- `git status` pending: `?? Frontend/` (untracked!), `.vscode/settings.json`, `leetcode/`, old docs deletions (unstaged)

## Phase 1 — Code (local)
1. `backend/app/core/config.py:20-21` — Google/JWT hard-raise HATAO -> sab optional, missing pe `print` warning, no crash
2. `requirements.txt:17` + `pyproject.toml` — `streamlit` dependency remove (unused)
3. `Frontend/vite.config.ts` — Nitro preset explicit `vercel` (config comment bolta hai CF default)

## Phase 2 — Git commit (NO history rewrite — Lovable rule)
4. Backend changes -> `git add backend/` -> commit "deploy-ready backend (relax OAuth config, slim deps)"
5. `git add Frontend/` -> commit "add Frontend (TanStack Start)"
6. Deletions (.vscode, leetcode/, old docs) -> commit cleanup
7. `git pull origin main` -> `git push` (itsmekrishna13-code account, NOT vijaykrishnab)

## Phase 3 — Backend -> Render (https://render.com)
- New Web Service -> connect repo -> Root dir: `backend`
- Runtime: Python 3.12
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check path: `/health`
- Env: `DATABASE_URL` (Supabase pooler `postgresql://postgres.ohgzweqishxjhrulijam:iamkrishna%4013@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`), `JWT_SECRET`, `FRONTEND_URL` (Vercel URL, frontend ke baad), `GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY`
- ⚠️ Render free: 15min sleep + 50s start limit (hamara boot 20-40s, SHAP imports) + 512MB RAM — risky, agar fail ho toh Railway ($5 always-on) shift karo

## Phase 4 — Frontend -> Vercel (https://vercel.com)
- Import repo -> Root dir: `Frontend`
- Framework preset: **TanStack Start**
- Build env: `NITRO_PRESET=vercel` + `VITE_API_URL=https://<render-url>` (build-time)
- Build command: `npm run build`
- Output: `.vercel/output` (nitro preset handles)

## Phase 5 — Wire + verify
1. Render env `FRONTEND_URL` = actual Vercel URL -> backend CORS auto-cover
2. Live verify: `/health` -> ok · `/auth/me` -> Guest · CSV upload -> EDA -> ML train -> AI chat
3. README me "Deployment" section + PROJECT_LOG entry

## Design limitations (dhyan me rakho)
- In-memory session store -> single instance, restart pe data gayab (portfolio/MVP fine)
- Cold start ~20-40s (SHAP/pandas)
- HF key Inference Providers permission nahi (403) -> last fallback only; Groq/Gemini/OpenRouter working

---

# CHAT-WITH-DATA SUMMARY FIX (pending — next session)

> Trigger phrase: **"chat dataset summary sahi karo"** (ya "chat summary fix karo").

## Bug (confirmed 2026-09-13)
- `backend/app/services/chat_service.py:55-61` — prompt AI ko khud "Numeric/Categorical columns (count or list)" banane bolta hai.
- Natija (real user output): "Numeric columns **(4)**" par **5 listed** (index, release_year, runtime, imdb_score, imdb_votes); `index` miss-counted; `id/title/description` ko "categorical" bola (actually high-cardinality text); types guessed (imdb_votes float hallucination).

## Fix plan
1. **New `build_dataset_summary(df)`** in chat_service.py — deterministic (no AI):
   - Rows/Columns from `df.shape`
   - `get_column_classification(df)` (ml_service.py) -> exact numeric/categorical/text/date lists (count = len(list), hamesha consistent)
   - Real dtypes from `df.dtypes`
   - Missing via `df.isna().sum()` -> sirf columns jisme actually missing hai
2. **`_is_summary_query(question)`** — detect: empty / hello/hi/hey / summary / dataset summary / suggest questions / help / what can you ask (lowercase, exact + prefix)
3. **Branch in `answer_question`**:
   - Summary intent -> deterministic summary + AI only for `_generate_suggested_questions(df)` (3-4 questions; prompt me sirf shape/dtypes/column names, jaise `ai_service.py:256` insights pattern)
   - Normal question -> existing path unchanged
4. Output format:
```
**Dataset Summary**
- Rows: 5,283
- Columns: 11
- Numeric columns (5): index, release_year, runtime, imdb_score, imdb_votes
- Categorical columns (2): type, category
- Text columns (4): id, title, description, imdb_id
- Missing values: ... (sirf actual gaps)

**Suggested questions you could ask**
1. ...
```
Note: `index` peer numeric list me dikhega kyunki woh aisa column hi hai (data-accurate); optional — auto-column skip kar sakte hain.

## Verify
- Backend restart -> netflix CSV (5,283 rows) upload -> `chat "summary"` -> numeric count == list length, real dtypes, missing only actual columns
- `chat "hello"` + `chat "which movies have highest imdb_score"` (normal path intact)
- PROJECT_LOG entry

## Trigger phrases (next session)
- Fix only: **"chat dataset summary sahi karo"**
- Deploy only: **"deploy karo — Render + Vercel"**
- Dono: **"chat summary fix karo aur deploy karo — Render + Vercel"**