import pandas as pd
from app.core.session_store import store
from app.services.ml_service import get_column_classification
from app.services.ai_service import AIProviderManager

ai_manager = AIProviderManager()

SUMMARY_INTENT_KEYWORDS = ("summary", "summarise", "summarize", "overview", "describe dataset", "what can you ask", "suggest question", "help")

def _is_summary_query(question: str) -> bool:
    q = (question or "").strip().lower()
    if not q:
        return True
    if q in ("hello", "hi", "hey", "help", "?", "what is this"):
        return True
    if any(kw in q for kw in SUMMARY_INTENT_KEYWORDS):
        return True
    return False

def build_dataset_summary(df: pd.DataFrame) -> str:
    cc = get_column_classification(df)
    numeric = cc.get("numeric", [])
    categorical = cc.get("categorical", [])
    text = cc.get("text", [])
    date = cc.get("date", [])

    missing = df.isna().sum()
    missing_cols = missing[missing > 0]
    if len(missing_cols) == 0:
        missing_str = "None (no missing values)"
    else:
        missing_parts = [f"{col} ({int(count)} missing)" for col, count in missing_cols.items()]
        missing_str = ", ".join(missing_parts)

    lines = ["**Dataset Summary**"]
    lines.append(f"- Rows: {df.shape[0]:,}")
    lines.append(f"- Columns: {df.shape[1]}")
    lines.append(f"- Numeric columns ({len(numeric)}): {', '.join(numeric) if numeric else 'none'}")
    lines.append(f"- Categorical columns ({len(categorical)}): {', '.join(categorical) if categorical else 'none'}")
    if text:
        lines.append(f"- Text columns ({len(text)}): {', '.join(text)}")
    if date:
        lines.append(f"- Date columns ({len(date)}): {', '.join(date)}")
    lines.append(f"- Missing values: {missing_str}")
    return "\n".join(lines)

def _generate_suggested_questions(df: pd.DataFrame) -> str:
    cc = get_column_classification(df)
    cols_desc = "\n".join(f"- {col}: {dtype}" for col, dtype in df.dtypes.items())
    facts = (
        f"Rows: {df.shape[0]}, Columns: {df.shape[1]}\n"
        f"Numeric columns: {', '.join(cc.get('numeric', [])) or 'none'}\n"
        f"Categorical columns: {', '.join(cc.get('categorical', [])) or 'none'}\n"
        f"Text columns: {', '.join(cc.get('text', [])) or 'none'}\n"
        f"Date columns: {', '.join(cc.get('date', [])) or 'none'}"
    )
    prompt = (
        "You are a data science expert. Based ONLY on the dataset facts below, suggest 3-4 concise, "
        "data-specific questions a user could ask about this dataset. "
        "Do NOT include generic questions unrelated to the actual columns. "
        "Return ONLY the numbered list of questions (1. 2. 3. 4.), no extra text.\n\n"
        "Dataset facts:\n"
        f"{facts}\n\n"
        "Columns and types:\n"
        f"{cols_desc}\n"
    )
    try:
        questions = ai_manager.generate_response(prompt)
        return "\n**Suggested questions you could ask**\n" + questions.strip()
    except Exception:
        return ""

def answer_question(job_id: str, question: str) -> str:
    df = store.get_df(job_id)
    if df is None:
        raise ValueError(f"No active session found for job_id: {job_id}")

    if _is_summary_query(question):
        return build_dataset_summary(df) + "\n" + _generate_suggested_questions(df)

    artifacts = store.get_model_artifacts(job_id)
    cc = get_column_classification(df)
    
    selected_target = None
    if artifacts:
        selected_target = artifacts.get("target_column")
    if not selected_target:
        selected_target = df.columns[-1]

    # Check if the dataset is small enough to send as CSV
    if df.shape[0] <= 100 and df.shape[1] <= 15:
        dataset_content = df.to_csv(index=False)
        data_summary = f"Here is the full dataset in CSV format:\n{dataset_content}"
    else:
        # For larger datasets, send a token-efficient summary:
        desc_str = df.describe(include='all').to_string()
        is_target_numeric = selected_target in cc.get("numeric", [])
        
        if is_target_numeric:
            top_rows = df.sort_values(selected_target, ascending=False).head(15).to_string(index=False)
            top_desc = f"Here are the top 15 rows sorted by `{selected_target}` descending:"
        else:
            top_rows = df.head(15).to_string(index=False)
            top_desc = "Here are the first 15 rows as a sample:"

        data_summary = f"""
    Dataset has {df.shape[0]} rows and {df.shape[1]} columns.
    Columns and Types:
    {df.dtypes.to_string()}

    {top_desc}
    {top_rows}

    General Description / Summary Statistics:
    {desc_str}
    """

    prompt = f"""You are a concise Data Science expert AI. Answer the user's question based on the dataset info provided below.
Guidelines:
1. Provide concise, helpful, and direct answers to the user's specific question.
2. Answer ONLY the question asked. Do NOT dump the entire dataset structure, summary statistics, or describe() output unless explicitly requested.

Dataset info:
{data_summary}

Question: {question}"""
    
    return ai_manager.generate_response(prompt)
