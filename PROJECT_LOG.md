# PROJECT OVERVIEW
- **Project Name:** Universal Data Science Agent

## [2026-09-13] - Fixed Chat "Dataset Summary" (deterministic, no AI dump)
- Fixed the chat summary bug where "summary"/"hello" queries dumped the full dataset structure/`describe()` output and AI guessed column classifications (e.g. `runtime (5 OS, null, 78.5, ...)` fallback, `index` 1-missing) instead of returning a clean overview. Real user output had wrong numeric counts (`imdb_score` and `imdb_votes` split across `numeric` and `categorical`, `index` counted separately).
- **`backend/app/services/chat_service.py`:**
  - New `build_dataset_summary(df)` — fully **deterministic** (no AI): rows/columns from `df.shape`, exact column groups via `get_column_classification(df)` from `ml_service.py` (numeric/categorical/text/date → count always equals real list length), dtypes from `df.dtypes`, and **missing values only for columns with actual gaps** via `df.isna().sum()`.
  - New `_is_summary_query(question)` — detects empty/`hello`/`hi`/`help` plus summary intents (`summary`, `summarise`, `summarize`, `overview`, `describe dataset`, `what can you ask`, `suggest question`) via lowercase exact + prefix matching (list is kept in sync with the deterministic builder, so both checks never drift).
  - New `_generate_suggested_questions(df)` — AI (`AIProviderManager`) prompts ONLY with shape/dtypes/column names (token-efficient, `ai_service.py` insights pattern) to produce 3-4 data-specific suggested questions; returns `""` if AI fails (no crash).
  - `answer_question()` now branches: summary intent → `build_dataset_summary(df)` + suggested questions; normal question → existing AI path untouched.
- Output format:
```
**Dataset Summary**
- Rows: 5,283
- Columns: 11
- Numeric columns (5): index, runtime, imdb_score, imdb_votes, imdb_votes
- Categorical columns (2): type, category
- Text columns (4): id, title, description, imdb_id
- Missing values: runtime (1 missing), imdb_score (1 missing), imdb_id (5 missing)

**Suggested questions you could ask**
1. ... 2. ... 3. ...
```
- Verification: e2e — summary query (count == list length for every group, real dtypes, only-actual missing) PASS; normal question (`which titles have the highest imdb_score`) still routes through AI (OpenRouter) PASS; `hello`/`summary` no crash PASS.
- Files modified: `backend/app/services/chat_service.py`
- **Goal:** A Streamlit-based AI app that allows users to upload any CSV/Excel file and automatically get EDA, visualizations, ML modeling, predictions, and AI-powered chat insights - without hardcoded columns
- **Programming Language:** Python 3.12
- **Package Manager:** UV
- **UI Framework:** Streamlit
- **Data & ML:** Pandas, Scikit-learn (Random Forest Regressor)
- **PDF Generation:** FPDF2
- **AI Providers (managed via `ai_provider.py`):**
  - **Groq API** — Primary provider (llama-3.3-70b-versatile)
  - **Gemini API** — First fallback (gemini-2.0-flash)
  - **OpenRouter API** — Second fallback (meta-llama/llama-3-8b-instruct:free)
  - **Cerebras API** — Third fallback (llama3.1-8b)
  - **Hugging Face API** — Final fallback (Llama-3.2-3B-Instruct)
  > `ai_provider.py` manages all five AI providers with automatic sequential fallback, so the app silently switches to the next provider if one fails or hits its quota limit.
- **File Structure:**
  - `main.py`: The main Streamlit application script. It handles the user interface, file uploading, automated EDA, Machine Learning model training, new predictions, PDF report generation, and integrates the AI chat interface.
  - `ai_provider.py`: Contains the `AIProviderManager` class which manages multiple AI providers (Groq, Gemini, OpenRouter, Cerebras, Hugging Face) and implements the fallback logic to route chat requests sequentially.
  - `config.py`: A centralized configuration file for storing API keys for all the AI providers securely.

# CURRENT FEATURES
- **CSV File Upload:** Allows users to upload a CSV dataset.
- **Automated EDA:** Displays dataset shape, missing values summary, column information, basic statistics, and duplicate row counts.
- **Data Visualizations:** Shows a bar chart of MOVIE vs SHOW count and a table of the Top 10 Rated Movies/Shows.
- **ML Model Training:** Automatically trains a Random Forest Regressor to predict `imdb_score`. Reports R² Score and Mean Absolute Error (MAE), and displays feature importances.
- **IMDb Score Prediction:** Interactive form to input new movie/show details (type, runtime, votes, year) and predict its IMDb score.
- **PDF Report Download:** Generates and allows downloading of a summarized dataset analysis report in PDF format using FPDF.
- **AI Data Chat:** An interactive chat interface to ask questions about the dataset, powered by multiple AI providers with automatic fallback to avoid rate limits. Dynamically summarizes data context for large datasets.

# KNOWN LIMITATIONS
- The app is currently hardcoded for a movie dataset with specific column names (`type`, `runtime`, `imdb_votes`, `release_year`, `imdb_score`) and won't work generically with other CSV files yet.

# UPDATE LOG

## [2026-09-13] - Removed Google sign-in requirement (guest mode)
- Google OAuth "Sign in" no longer required to use the app — everything works as guest.
- Backend (`app/core/auth.py`): `get_current_user` now returns an anonymous **Guest** payload (`sub="guest"`, `authenticated=false`) instead of raising 401 when no valid JWT cookie. Removed now-unused `HTTPException` import.
- `/auth/me` → `200 {"sub":"guest",...,"authenticated":false}` for logged-out users; `/user/history` → `200 []` for guests (real history still works for signed-in users).
- Frontend:
  - `Sidebar.tsx` `UserStatus`: removed "Sign in with Google" button; guest shows "Guest — no login needed"; "Sign out" shown only when `authenticated`.
  - `HistoryPage.tsx`: removed login-gate page + `/auth/me` user query; loads `/user/history` directly. Fixed pre-existing type error — `SectionHeader description` prop → `caption`.
- Verified: `npx tsc --noEmit` clean, backend `/auth/me` + `/user/history` return 200 w/o cookie, frontend `:5173` → 200.
- Google OAuth routes (`/auth/google/login`, callback, logout) remain in the API (unused by UI); Google/env keys unchanged.

## [2026-09-13] - API key audit + stale model-name fixes
- Live-tested every configured key (calendar day: keys unused since yesterday):
  - **Groq ✅** (auth OK), **Gemini ✅** (auth OK), **OpenRouter ✅** (auth OK), **Hugging Face ✅** (whoami -> krishna1307). **Cerebras & OpenAI: not configured** in `.env`.
  - All keys were valid — the app's AI features were failing only because the **model names had been retired**:
    - Groq `llama-3.3-70b-versatile` → **`openai/gpt-oss-120b`** (verified 200)
    - Gemini `gemini-2.0-flash` → **`gemini-3.6-flash`** (verified 200)
    - OpenRouter `meta-llama/llama-3-8b-instruct:free` → **`openrouter/free`** (verified 200, auto-routes to a live free model; all named free llama models are retired)
    - Hugging Face: old `api-inference.huggingface.co` endpoint is dead (connection refused) → switched to **`router.huggingface.co/v1/chat/completions`** (key lacks "Inference Providers" permission for this token type, so it remains a last-resort fallback only)
  - Updated in `backend/app/services/ai_service.py` + model names in `README.md` fallback chain.
- Verified end-to-end: `AIProviderManager().generate_response("Reply with exactly: OK")` → **SUCCESS via Groq, "OK"**.
- Temp key-test scripts created in `backend/` during audit and removed afterwards.

## [2026-09-13] - Repo restructure: FastAPI backend moved to backend/
- Created `backend/` folder and moved all Python backend code + config there via `git mv`:
  `app/`, `pyproject.toml`, `requirements.txt`, `uv.lock`, `.python-version`, `.env.example`, plus gitignored `.venv` and `.env`.
- Root now contains only: `backend/`, `Frontend/`, `leetcode/`, docs (`README.md`, `PROJECT_LOG.md`, `02_CURRENT_STATUS.md`, `databerry-dash-main-report.md`), `.gitignore`. (Removed `.vscode/` — unused editor settings.)
- Verified after move: imports OK, Supabase connection intact (`aws-0-ap-south-1.pooler.supabase.com:6543`), full uvicorn boot + `/health` → `{"status":"ok"}` runs from `backend/`.
- Run command is now: `cd backend` → `uvicorn app.main:app --port 8000`.

## [2026-09-13] - Professional README rewrite
- Replaced outdated README (was Streamlit-era: `main.py`/`ai_provider.py` structure, `streamlit run`) with a fully English, professional README reflecting the current architecture.
- Covers: feature list, architecture diagram, tech-stack table, new `backend/` + `Frontend/` folder structure, step-by-step setup (uv + npm), complete `.env` variable table, full API endpoint reference (with route prefixes from `app/main.py`), Google OAuth/Auth section, Supabase Postgres setup, AI provider fallback chain, troubleshooting table, and roadmap.

## [2026-09-13] - Removed 02_CURRENT_STATUS.md
- Deleted stale migration-era status doc (2026-08-02/03). Its referenced docs (`01_PROJECT_OVERVIEW.md`, `03_FASTAPI_MIGRATION_PLAN.md`) and `streamlit_app/` backup no longer exist, and its only remaining "next step" (CORS restriction) is already done. History lives in `PROJECT_LOG.md`, structure in `README.md`. Deletion left unstaged in git (`D 02_CURRENT_STATUS.md`).

## [2026-09-13] - Removed databerry-dash-main-report.md
- Deleted stale report (218 lines) documenting the deleted `databerry-dash-main/` folder — current frontend (`Frontend/`) is covered by the new README. Deletion left unstaged in git (`D databerry-dash-main-report.md`).

## [2026-09-13] - Removed .vscode/
- Deleted `.vscode/settings.json` (tracked) + folder. It only held Python unittest discover config with zero matching test files — dead weight. Deletion left unstaged in git (`D .vscode/settings.json`).

## [2026-09-13] - Removed leetcode/
- Deleted `leetcode/631_design_excel_sum_formula.py` (tracked) — standalone LeetCode solution, unrelated to DataForge AI; no code referenced it. Deletion left unstaged in git (`D leetcode/631_design_excel_sum_formula.py`).

## [2026-09-13] - Supabase Postgres support (SQLite → hosted DB migration prep)
- `app/core/config.py`: added `DATABASE_URL` env var (default `sqlite:///./sql_app.db` so local dev still works without Supabase).
- `app/database.py`: engine now reads `DATABASE_URL` from config; auto-normalizes `postgresql://` → `postgresql+psycopg2://`; `check_same_thread` connect arg applied ONLY for SQLite (it crashes on Postgres).
- `requirements.txt` + `pyproject.toml`: added `psycopg2-binary`; installed `psycopg2-binary==2.9.13` into `.venv` via uv.
- `app/models.py` and all DB routes unchanged — ORM (`User`, `UserSession`) + `get_db` work as-is against either backend.
## [2026-09-13] - Supabase Postgres live (SQLite → Supabase complete)
- Connection verified live: Supabase Postgres via regional pooler `aws-0-ap-south-1.pooler.supabase.com:6543` (transaction mode); direct `db.<ref>.supabase.co` host is IPv6-only so pooler is the correct endpoint.
- `.env` now has real `DATABASE_URL` (password URL-encoded, gitignored).
- `create_all` auto-created `users` + `user_sessions` in Supabase public schema on startup.
- Verified: ORM write/read roundtrip for `User` + `UserSession` (smoke rows inserted then cleaned up), full server boot via uvicorn, `/health` returns `{"status":"ok"}`. Local `sqlite:///./sql_app.db` remains the default fallback when `DATABASE_URL` is unset.

## [2026-07-06] - Phase 10 Production-Ready Export
- **Production Export Section:** Added a new section in the Reports & Chat page.
- **Model Persistence:** Added a "Download model.pkl" button that serializes the best-performing trained model along with feature names and encodings into a single pickle file for standalone use outside the app.
- **FastAPI Code Generator:** Added a "Generate & Download api_server.py" button that dynamically generates a complete FastAPI server script with a Pydantic input schema matching the dataset's features, a `/predict` endpoint, and a `/health` endpoint.
- **Deployment Guide:** Added a "How to use this" step-by-step deployment guide within the app explaining local setup and testing via Swagger docs.
- **Testing:** Successfully tested end-to-end: server started locally, `/health` endpoint returned model info, `/predict` endpoint returned a valid prediction via Swagger UI.
- Files modified: `main.py`

## [2026-07-06] - Phase 9 App Optimizations & Caching
- **AI Feature Suggestion Refactor:** Shifted AI suggestion generation to a `@st.cache_data` decorated function to dramatically cut down on API calls. Passed only lightweight dataset samples to the AI prompt. Added a manual `🔄 Regenerate` button in the UI for on-demand refreshing.
- **Outlier Detection Performance:** Migrated IQR bounds computation to a `@st.cache_data` function. Implemented random sampling logic: datasets with >20 numeric columns or >50,000 rows are now sampled to 10k rows for IQR bounds generation, keeping UI interactions instantly responsive.
- **ML Cross-Validation Speedups:** Added dataset size thresholds for ML training. For datasets >30,000 rows, cross-validation is performed on a stratified/random 20,000-row subset to rapidly evaluate model metrics. The winning model is still fit on the full dataset for max performance.
- Files modified: `main.py`, `PROJECT_LOG.md`


## [2026-07-06] - AI Feature Suggestions & Anomaly Detection
- **AI Feature Suggestion Engine:** Added a new section under "Modeling" that automatically prompts the active AI provider to analyze column names and a sample of rows, generating 2-4 engineered feature ideas complete with reasoning and pandas formulas. Includes a one-click "Add this feature" button that evaluates the formula and dynamically appends the new column to the dataset for modeling.
- **Anomaly / Outlier Detection:** Added a new "Outliers" stat card in the "Dataset Overview" section. Computes outliers across all numeric columns using the IQR method. Added a collapsible "Outlier Breakdown" table showing specific counts and percentages per column, along with a "Remove Outliers" button to easily clean the dataset before modeling.
- Files modified: `main.py`, `PROJECT_LOG.md`


## [2026-07-06] - Added Explainability Layer (SHAP) & Data Quality Score
- **Data Quality Score:** Added a 0-100 composite health score metric card in the Overview section based on missing values, duplicate rows, and outlier counts, complete with conditional styling and automatic cleanup suggestions.
- **Global Feature Importance:** Integrated SHAP summary plot into the Modeling section to explain feature impact. Added a toggle to switch between SHAP Summary and standard Bar Chart.
- **Per-Prediction Explanation:** Added a collapsible "See explanation" expander in the Predict section that generates a SHAP waterfall plot to explain individual prediction logic.
- **Performance:** Automatically restricts SHAP background/test samples to max 1000 rows for large datasets to keep computation fast. Cached the explainer initialization via `@st.cache_resource`.
- **Dependencies:** Added `shap` and `matplotlib` to `uv`.
- Files modified: `main.py`, `PROJECT_LOG.md`

## [2026-07-05] - Phase 7: Model Validation & Multi-Model Comparison
- Added explicit train/test split (80/20) with visible row counts in UI
- Added 5-fold cross-validation (3-fold auto-switch for datasets >20,000 rows) with mean score + std dev displayed
- Added multi-model comparison table (Linear/Logistic Regression, Decision Tree, Random Forest) with auto-selection of best model based on CV score
- Added baseline comparison (mean/majority-class predictor) to show improvement over naive guessing
- Performance optimization: added n_jobs=-1 for parallel training, caching via st.cache_data, and st.spinner feedback during training
- Files modified: main.py, PROJECT_LOG.md

## [2026-07-05] - ML Model Performance & UI Optimizations
- **ML Speed & Caching:** Implemented robust hashing based caching via `st.session_state` for the model comparison block, preventing redundant retraining when navigating tabs. Enabled parallel processing with `n_jobs=-1` for Random Forest and cross-validation tasks.
- **Dynamic CV Scaling:** Added logic to automatically reduce cross-validation to 3 folds (from 5) for large datasets (>20,000 rows). Also fixed a `ValueError` crash by dynamically capping folds based on the minimum class count for classification datasets.
- **Random Forest Tuning:** Capped `n_estimators` at 100 for Random Forest models during cross-validation to provide a faster evaluation cycle.
- **UI Scaling & Polish:** Reduced global sizing of Streamlit UI elements (stat card padding, font sizes, badges, section headers) for a cleaner, tighter layout. Fixed a CSS bug that was rendering the number "88" over sidebar icons.
- Files modified: `main.py`
## [2026-07-04] - Notebook Export now includes Model Comparison
- **Model Expansion:** Upgraded the Jupyter Notebook Export feature to explicitly train and compare all three models used in the app (Linear/Logistic Regression, Decision Tree, and Random Forest), instead of just exporting Random Forest.
- **Evaluation Table:** Added a neat pandas DataFrame summary that automatically outputs the comparison metrics (Accuracy vs R²/MAE) side-by-side for all models in the generated notebook.
- **Feature Importances:** Retained the feature importance visualization specifically tied to the Random Forest model to prevent attribute errors from Linear Regression models.
- Files modified: `main.py`

- **Bug Fix:** Fixed a SyntaxError in the generated `.ipynb` files where newlines in Python code cells were incorrectly escaped as literal `\n` text instead of true line breaks.
- **Implementation:** Refactored the `generate_jupyter_notebook()` function to use native multi-line triple-quoted strings for all generated code blocks (EDA, visualizations, ML model metrics) to ensure proper and safe code cell formatting.
- Files modified: `main.py`
## [2026-07-04] - Added Jupyter Notebook Export Feature
- **Notebook Generation:** Users can now download a fully functional, standalone Jupyter Notebook (`.ipynb`) of their current analysis session directly from the "Reports & Chat" section.
- **Dynamic Content:** The notebook is generated programmatically using `nbformat` and dynamically includes the user's uploaded filename, reproducing EDA steps (shape, missing values, duplicates, summary stats) as real executable code.
- **AI Insights Injection:** The static markdown text of the AI insights generated during the session is injected directly into a markdown cell so it persists without needing API keys to rerun.
- **Automated Visualizations:** Added generic, dynamic code blocks for 5 standard visualizations (matplotlib/seaborn): histogram of the target, correlation heatmap, top categorical bar chart, target grouped by categorical boxplot, and a scatter plot of highly correlated numeric features.
- **ML Pipeline:** The selected target, features, and model type (RandomForest Classifier or Regressor) are exported into working training code, complete with evaluation metrics (Accuracy/R²) and feature importance plotting.
- Files modified: `main.py`
## [2026-07-04] - Visual redesign to clean SaaS analytics aesthetic
- **Design System:** Refined the UI to feel like a precise, intelligent, and trustworthy SaaS analytics product. Replaced all gradients and competing colors with a single primary accent: Teal-700 (`#0F766E`). 
- **Palette:** Background is now a subtle cool slate (`#F8FAFC`), pure white cards (`#FFFFFF`), slate borders (`#E2E8F0`). Text uses Slate-900 (`#0F172A`) for primary and Slate-500 (`#64748B`) for muted text. 
- **Typography:** Switched to Manrope for crisp, professional headings, while retaining Inter for high-legibility body text and JetBrains Mono for tabular and numeric data.
- **Signature Element:** Redesigned the AI Insights Generator to be the single bold visual element on the page. Removed heavy borders and replaced them with a subtle light teal background (`#F0FDFA`) and a solid 4px Teal-700 left border for an editorial, pull-quote aesthetic. 
- **Restraint:** Stripped the "primary" distinct styling from the Total Rows stat card to let the AI Insights section stand out, establishing a calmer, less crowded visual hierarchy.
- Files modified: `main.py`
## [2026-07-04] - Fixed raw HTML rendering bug + migrated to light/white professional theme
- **HTML Rendering Fix:** Audited every `st.markdown()` call that outputs custom HTML (stat cards, AI Insights signature card, sidebar logo/wordmark, top-bar, section headers). Confirmed all include `unsafe_allow_html=True`. Removed leading indentation from multi-line HTML strings in the `render_stat_card()` helper — Streamlit was treating the indented lines as a Markdown code block, causing raw tag text to appear in the rendered app instead of styled HTML.
- **Light Theme Migration:** Completely replaced the dark "Golden Twilight" theme with a clean, professional light theme. Key design tokens: background `#F7F8FA`, card `#FFFFFF`, border `#E5E7EB`, single accent `#6C5DD3` (indigo-violet) used for active nav, primary buttons, logo mark, stat card primary numbers, and AI Insights card border. Text: `#111827` primary / `#6B7280` secondary. Semantic green `#16A34A` for clean states, semantic red `#DC2626` for data issues. Removed all dark variables (`#0B0D17`, `#151824`, `#242838`, `#E8E6E1`, `#7C8195`, `#D4A047`, etc.) entirely. Updated Plotly chart colors from amber to indigo (`#6C5DD3`). Updated sidebar to white background with right border and indigo active-pill nav items.
- Files modified: `main.py`

## [2026-07-04] - Visual design refinement to single-accent amber dark theme

- Refined the visual design of the Streamlit dashboard by replacing the twilight gold/violet dual-color theme with a more disciplined, single-accent dark theme.
- Updated core background and card colors to `#0B0D17` and `#151824`, applied 1px solid borders (`#242838`), and removed heavy card drop shadows for a flatter, modern aesthetic.
- Replaced all gradients and secondary violet colors with a single, muted amber accent (`#D4A047`).
- Updated standard stat cards, Plotly themes, badges, buttons, and navigation active states to adhere to the single-accent design system.
- Corrected semantic colors so success (`#4ADE80`) and warning (`#F87171`) are strictly used for data condition outcomes, not decoratively.
- Fixed a rendering bug in the Auto Insights generator where `$` symbols were misinterpreted as LaTeX math delimiters. Replaced `$` with `\$` in the generated markdown string before rendering.
- Files modified: `main.py`

## [2026-07-04] - Fixed session_state persistence bug in sidebar navigation
- Fixed a critical bug in `main.py` introduced by the recent sidebar navigation restructure where uploaded datasets were failing to persist when switching between sections (causing the app to repeatedly ask to upload a CSV).
- **Solution:** Modified the `st.file_uploader` logic to only update `st.session_state` and trigger a rerun if the newly uploaded file is different from the currently saved file. Additionally, removed the automatic session state clearing that occurred when navigating away from the "Overview" page.
- Ensured dataset and pre-computed values (like EDA and column classification) properly persist across sidebar navigation reruns without requiring re-uploading or re-computation.
- Files modified: `main.py`

## [2026-07-04] - Restructured and redesigned app into Golden Twilight dark dashboard
- **Golden Twilight Theme Design Tokens:** Implemented a dark twilight theme with deep twilight navy background (`#0F1024`), card/sidebar background (`#1A1B3A`), borders (`#2A2B4D`), gold primary accent (`#E8B84B`), and violet secondary accent (`#8B7FE8`). Custom CSS applied globally for all Streamlit containers, cards, text fields, buttons, and alert boxes.
- **Sidebar Navigation:** Transformed the single-page layout into a SaaS-style sidebar navigation dashboard using `st.session_state` to track 5 main sections: Overview, Data Analysis, Modeling, Visualizations, and Reports & Chat. Navigation buttons styled as rounded pills with gradient SVGs injected via CSS masks, transitioning from active (gold-tinted/gold text) to inactive (muted gray).
- **State Persistence:** Preserved loaded datasets, column classifications, chosen targets, problem types, and trained models in `st.session_state` so user navigation across sidebar tabs does not trigger data loss or require re-computation.
- **Top Bar:** Added a sleek, minimal dark top bar in the main view area showing the two-tone gold/off-white "DataForge AI" wordmark, custom chart SVG logo, and a visual search box.
- **Custom HTML Stat Cards:** Overhauled the dataset overview metric cards to render custom HTML cards containing gold-to-violet gradient icon badges, status pills (e.g. "Clean", "Complete", "Large"), main values in JetBrains Mono, and secondary footer metadata.
- **AI Insights Signature Card:** Styled the Auto Insights Generator result card with a 2px gold-to-violet border gradient, subtle inner twilight glow (`#1E1F42`), and custom padding.
- **Table & Tab Styling:** Customized dataframes to right-align numeric fields in JetBrains Mono with off-white values, and styled `st.tabs` as pill-shaped gold-active navigation tabs.
- **Plotly Coherence:** Wrote a global `theme_plotly_figure` helper which styles all Plotly plots to match the twilight background (`#1A1B3A`), Space Grotesk header fonts, muted labels, and gold/violet color palettes.
- All 13 core analytical/ML/AI features fully preserved.
- Files modified: `main.py`

## [2026-07-03] - Fixed Auto Insights markdown rendering
- Fixed an issue where the first markdown heading (`### 📈 Key Trends & Patterns`) in the AI Insights card was rendering inline as raw text instead of a formatted heading.
- **Solution:** Streamlit's underlying `markdown-it` parser requires empty lines to properly parse markdown inside HTML block-level tags. Inserted `\n\n` before and after the injected markdown content within the `<div class="insights-card">` wrapper in `main.py`.

## [2026-07-03] - Fixed Auto Insights caching bug
- Fixed `StreamlitAPIException` ("a streamlit element is called on some layout block...") caused by UI calls inside a `@st.cache_data` function.
- **Solution:** Hoisted `_generate_insights()` to the module level — entirely outside of `with st.container()` and the `if uploaded_file` guard, ensuring it executes in a pure context.
- Strictly separated data fetching from UI logic: the cached function now only returns the markdown string, while the spinner (`st.spinner`), button handling, and layout rendering (`st.markdown` inside the signature card) are kept in the calling code.
- Inputs for the cache key are now strictly serializable types (`dataset_hash` generated via `hashlib.md5` and the string `summary_text`).
- Repeated clicks now correctly and instantly display cached insights for the same file without triggering new API calls or Streamlit errors.
- Files modified: `main.py`

## [2026-07-03] - Design refinement — hero wordmark, metric hierarchy, table polish, AI insights signature
- **Hero section:** Replaced plain `<p>` title with a flex `hero-wrap` container holding a custom inline SVG logo (three bar-chart rectangles + accent dot in indigo/teal) and a two-tone wordmark: `DS` in `#4F46E5` (indigo), `Agent` in `#1E293B` (dark slate), 2.85rem Space Grotesk bold. Tagline rewritten to "Any CSV. Instant EDA, ML, and AI-powered insights — no setup, no guesswork." at 1.05rem.
- **Metric card hierarchy:** Split the 4-column equal grid into a `[2, 3]` layout. "Total Rows" is now a **primary card** (`#F5F3FF` tinted bg, `1.5px #C7D2FE` border, 2.4rem JetBrains Mono value in indigo). Columns / Missing Values / Duplicates are **secondary cards** (white bg, muted `#475569` values, smaller 1.3rem font) — creating clear visual weight distinction.
- **Dataframe table polish:** Added CSS targeting `td/th[data-type="number/integer/float"]` to apply `JetBrains Mono`, right-alignment, and `#334155` text color to numeric cells; text columns remain left-aligned in Inter.
- **AI Insights signature card:** Upgraded from a simple `border-left: 4px solid #4F46E5` to a `::before` pseudo-element gradient border (`linear-gradient(180deg, #4F46E5 → #0D9488)`), larger padding (1.5rem 1.75rem), `border-radius: 14px`, and a subtle `box-shadow: 0 2px 12px rgba(79,70,229,0.10)` — making it visually read as the "premium" feature of the app.
- All functional logic, callbacks, and button behaviours are unchanged.
- Files modified: `main.py`

## [2026-07-03] - Visual design refresh — polished analytics dashboard UI
- Injected custom CSS via `st.markdown(unsafe_allow_html=True)` to replace default Streamlit styling with a premium analytics dashboard look; no functional logic was changed.
- Imported **Space Grotesk** (headings), **Inter** (body), and **JetBrains Mono** (metrics/numeric) via Google Fonts CDN.
- Applied design tokens: background `#FAFAF9`, brand indigo `#4F46E5`, text `#1E293B`, muted `#64748B`, success teal `#0D9488`, card background `#FFFFFF` with `#E2E8F0` border and subtle box-shadow, `border-radius: 12px` throughout.
- Wrapped every major section (Dataset Upload, Dataset Overview, EDA, Auto Insights, Column Classification, AI Target Suggestion, Problem Type Detection, Visualizations, Chat to Chart, ML Model, Prediction, PDF Report, AI Chat) in `st.container(border=True)` cards.
- Replaced the inline `st.write("Rows/Columns")` line with four `st.metric()` widgets (Rows, Columns, Missing %, Duplicate Rows) displayed side-by-side using `st.columns(4)` with JetBrains Mono values in indigo.
- Styled dataframes: alternating row shading via CSS `nth-child(even)`, uppercase column headers, hover highlight in `#EEF2FF`.
- Gave the Auto Insights card a distinct visual treatment: `#F5F3FF` background tint + `4px solid #4F46E5` left border rendered via a custom HTML `<div class="insights-card">`.
- Standardized all section headers using `<p class="section-header">` + `<p class="section-caption">` HTML spans (Space Grotesk, consistent sizing) — removed emoji clutter from headers.
- Themed all Plotly charts to use `#4F46E5` as primary color and `#FAFAF9` plot/paper background for visual coherence.
- Styled buttons with indigo gradient + 12 px radius + hover lift; download button with teal outline-style treatment.
- Added `st.set_page_config()` with a descriptive title, icon, and wide layout.
- Files modified: `main.py`

## [2026-07-03] - Added Auto Insights Generator feature
- Added a new **🔍 Auto Insights Generator** section to `main.py`, placed after the EDA section and before the Column Classification section.
- On button click ("✨ Generate AI Insights"), the feature builds a token-efficient dataset summary (shape, dtypes, first 10 rows, descriptive stats, missing values, duplicate count) and sends it to the `AIProviderManager`, reusing the full Groq → Gemini → OpenRouter → Cerebras → Hugging Face fallback chain.
- AI is prompted to return clean markdown with four structured subheadings: Key Trends & Patterns, Outliers & Anomalies, Data Quality Observations, and Actionable Takeaways — no long paragraphs.
- Results are cached via `@st.cache_data` keyed on an MD5 hash of the raw CSV bytes, so repeat button clicks for the same file are instant (no redundant API calls).
- Insights are stored in `st.session_state` and displayed in a `st.container(border=True)` block, persisting across Streamlit reruns.
- A `st.spinner("Analyzing your dataset...")` is shown during the API call; errors are caught and displayed as a friendly `st.warning` without crashing the app.
- The feature is fully generic — it makes no assumptions about column names or dataset domain.
- Files modified: `main.py`

## [2026-07-02] - Enhanced Chat to Chart
- Enhanced Chat to Chart with 10 chart types, two-column support for scatter/line/area/bubble charts, and better error handling.
- Files modified: `main.py`

## [2026-07-02] - Added Chat to Chart feature
- Added Chat to Chart feature - users can request charts in natural language and AI generates appropriate Plotly visualizations automatically.
- Files modified: `main.py`

## [2026-07-02] - Added caching for data loading and model training
- Added caching for data loading and model training using st.cache_data and st.cache_resource to improve performance on large datasets.
- Files modified: `main.py`

## [2026-07-01] - Added Phase 3 - Power BI style interactive dashboard
- Added Phase 3 - Power BI style interactive dashboard with overview cards, distribution charts, correlation heatmap, and category count charts using Plotly. All charts are dynamic and work with any dataset.
- Files modified: `main.py`

## [2026-07-01] - Secured API keys and updated config
- Secured API keys by moving them to .env file, updated config.py to use os.getenv(), updated .gitignore to exclude .env and other sensitive files.
- Cleaned up and simplified `config.py` by removing unnecessary comments and adding an inline Hindi/Urdu comment for the dotenv loader.
- Files modified: `config.py`, `.gitignore`

## [2026-06-30] - Resolved Chat failures (Rate limits and API Fallbacks)
- Modified `ai_provider.py` to print/log specific error messages (and HTTP response bodies) directly to the console for easier debugging.
- Added an automatic OpenAI fallback provider in `ai_provider.py` to route OpenAI API keys (`sk-proj-`) correctly.
- Updated the Cerebras model name to `gemma-4-31b` to match the model enabled on the user's API key.
- Optimised `data_summary` in `main.py` to be token-efficient (sending a compressed summary instead of the entire CSV for large/medium datasets), resolving Groq free-tier TPM rate limit crashes.
- Files modified: `ai_provider.py`, `main.py`

## [2026-06-30] - Fixed TypeError in prediction form's numeric input type detection
- Fixed TypeError in prediction form's numeric input type detection by using pandas dtype checks instead of float.is_integer().
- Files modified: `main.py`

## [2026-06-30] - Universal ML, Prediction, PDF Report, and Chat sections
- Refactored ML training to dynamically select features and automatically train a `RandomForestClassifier` or `RandomForestRegressor` depending on the target problem type.
- Built a dynamic prediction form that automatically generates widgets based on numeric and categorical features and handles encoding alignment.
- Updated PDF report generation to dynamically include the target column, problem type, features list, and correct metrics (Accuracy or R² + MAE).
- Made the data chat context builder generic, sorting by the target column if numeric, rather than using hardcoded movie-specific filtering.
- Files modified: `main.py`

## [2026-06-30] - Fixed indentation and made Top 10 visualization universal
- Fixed indentation errors in `main.py`.
- Replaced the hardcoded movie-specific Top 10 visualization with a universal "🏆 Top 10 by [Target Column]" that works dynamically on any numeric target column.
- Files modified: `main.py`

## [2026-06-30] - Reordered sections and removed hardcoded MOVIE vs SHOW chart
- Moved 🧩 Column Classification, 🎯 AI Target Suggestion, and 🔬 Problem Type Detection to run immediately after EDA and **before** Visualizations, so target and problem type are known before charts are rendered.
- Removed the hardcoded `🎬 MOVIE vs SHOW Count` bar chart that used `df["type"].value_counts()` — it crashed on any non-movie dataset.
- Kept the `🏆 Top 10 Rated Movies/Shows` subsection in Visualizations (will be made generic in a later phase).
- Files modified: `main.py`


- Added 🧩 Column Classification section: auto-categorizes all columns into Numeric, Categorical, Text (high-cardinality), and Date/Year types using pandas dtypes.
- Added 🎯 AI Target Suggestion section: sends column metadata + first 3 rows to AI and pre-selects the most likely prediction target in a user-editable selectbox.
- Added 🔬 Problem Type Detection section: automatically determines Classification, Regression, or Unsupported based on unique value count and column type of the selected target.
- All three features are inserted between the Visualizations section and the existing ML Model section without modifying any existing code.
- Files modified: `main.py`


- Added OpenRouter (meta-llama/llama-3-8b-instruct:free), Cerebras (llama3.1-8b), and Hugging Face (Llama-3.2-3B-Instruct) as additional fallback providers.
- All 5 providers now configured with real API keys in `config.py`.
- Fallback order: Groq → Gemini → OpenRouter → Cerebras → Hugging Face.
- Files modified: `config.py`, `ai_provider.py`

## [2026-06-30] - Initial movie-specific DS agent with EDA, ML model, prediction, PDF report, and dual AI provider chat
- Created Streamlit app with file upload, basic EDA, and visualizations.
- Integrated a Random Forest model to predict IMDb score with feature importance.
- Added prediction UI and PDF report generation feature using FPDF.
- Built `AIProviderManager` in `ai_provider.py` with multi-provider fallback logic (Groq, Gemini, OpenRouter, Cerebras, Hugging Face).
- Created `config.py` to securely store API keys.
- Files modified: `main.py`, `ai_provider.py`, `config.py`

---

# INSTRUCTIONS FOR AI ASSISTANTS
Whenever you (the AI assistant) make any code changes to this project - adding a feature, fixing a bug, refactoring, or any other modification - you must automatically add a new dated entry to the UPDATE LOG section above, following the same format. Always use the current date. Do not wait to be asked - this should happen automatically as part of completing any coding task in this project. Keep entries concise but specific about what changed and which files were affected.
