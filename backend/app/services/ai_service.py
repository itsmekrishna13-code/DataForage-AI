import logging
import requests
from app.core import config

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AIProviderManager")

class AIProviderManager:
    def __init__(self):
        import os
        self.providers = [
            {
                "name": "Groq",
                "api_key": config.GROQ_API_KEY,
                "placeholder": "YOUR_GROQ_API_KEY_HERE",
                "func": self._call_groq
            },
            {
                "name": "Gemini",
                "api_key": config.GEMINI_API_KEY,
                "placeholder": "YOUR_GEMINI_API_KEY_HERE",
                "func": self._call_gemini
            },
            {
                "name": "OpenAI",
                "api_key": os.getenv("OPENAI_API_KEY", config.OPENROUTER_API_KEY if (config.OPENROUTER_API_KEY and config.OPENROUTER_API_KEY.startswith("sk-proj-")) else ""),
                "placeholder": "YOUR_OPENAI_API_KEY_HERE",
                "func": self._call_openai
            },
            {
                "name": "OpenRouter",
                "api_key": config.OPENROUTER_API_KEY if not (config.OPENROUTER_API_KEY and config.OPENROUTER_API_KEY.startswith("sk-proj-")) else "",
                "placeholder": "YOUR_OPENROUTER_API_KEY_HERE",
                "func": self._call_openrouter
            },
            {
                "name": "Cerebras",
                "api_key": config.CEREBRAS_API_KEY,
                "placeholder": "YOUR_CEREBRAS_API_KEY_HERE",
                "func": self._call_cerebras
            },
            {
                "name": "Hugging Face",
                "api_key": config.HUGGINGFACE_API_KEY,
                "placeholder": "YOUR_HUGGINGFACE_API_KEY_HERE",
                "func": self._call_huggingface
            }
        ]

        # ── DIAGNOSTIC: Print key presence for every provider at init time ──
        print("\n" + "="*60)
        print("[AIProviderManager] Provider Key Diagnostic:")
        print("="*60)
        for p in self.providers:
            key = p["api_key"]
            name = p["name"]
            if not key or key.strip() == "":
                status = "MISSING (empty or None)"
            elif key == p["placeholder"]:
                status = "PLACEHOLDER (not set)"
            else:
                prefix = key.strip()[:8]
                status = f"PRESENT (starts with: '{prefix}...')"
            print(f"  {name:15s}: {status}")
        print("="*60 + "\n")

    def _is_configured(self, provider):
        """Check if API key is provided and is not the placeholder."""
        key = provider["api_key"]
        return key and key.strip() != "" and key != provider["placeholder"]

    def generate_response(self, prompt: str, parser=None) -> str | dict:
        """
        Iterates through the providers in priority order and returns response from the first one that works.
        If a parser function is provided, it attempts to parse the raw text. If parsing fails, it falls back.
        """
        errors = []
        configured_any = False
        
        for provider in self.providers:
            name = provider["name"]
            
            # Check if this provider has a configured API key
            if not self._is_configured(provider):
                logger.info(f"Skipping {name} (API key not configured).")
                continue
                
            configured_any = True
            logger.info(f"Attempting to query provider: {name}")
            print(f"\n[AIProviderManager] Trying provider: {name} ...")
            try:
                res = provider["func"](prompt, provider["api_key"])
                if res:
                    if parser:
                        parsed_res = parser(res)
                        logger.info(f"Successfully generated and parsed response using provider: {name}")
                        print(f"[AIProviderManager] SUCCESS via {name} (with parsing)")
                        return parsed_res
                    logger.info(f"Successfully generated response using provider: {name}")
                    print(f"[AIProviderManager] SUCCESS via {name}")
                    return res
            except Exception as e:
                error_msg = f"{name} failed: {type(e).__name__}: {e}"
                if isinstance(e, requests.exceptions.HTTPError) and e.response is not None:
                    try:
                        error_msg += f" | HTTP {e.response.status_code} | Body: {e.response.text[:500]}"
                    except Exception:
                        pass
                elif isinstance(e, requests.exceptions.ConnectionError):
                    error_msg += " | (DNS/connection failure — endpoint may be unreachable or deprecated)"
                elif isinstance(e, requests.exceptions.Timeout):
                    error_msg += " | (Request timed out after timeout limit)"
                print(f"\n[AIProviderManager ERROR] {error_msg}\n")
                logger.warning(error_msg)
                errors.append(error_msg)
                
        if not configured_any:
            raise RuntimeError(
                "No API keys have been configured. Please specify at least one API key in config.py."
            )
            
        # If all configured providers fail
        error_summary = "\n".join(errors)
        logger.error(f"All configured providers failed.\nDetails:\n{error_summary}")
        print(f"\n[AIProviderManager] ALL PROVIDERS FAILED. Full summary:\n{error_summary}\n")
        
        raise RuntimeError(
            "Sorry, all configured AI providers failed to answer your request. "
            "Please check your API keys in config.py or internet connection."
        )

    def _call_groq(self, prompt, api_key):
        from groq import Groq
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "user", "content": prompt}]
        )
        return response.choices[0].message.content

    def _call_gemini(self, prompt, api_key):
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-3.6-flash")
        response = model.generate_content(prompt)
        return response.text

    def _call_openrouter(self, prompt, api_key):
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "openrouter/free",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=15
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def _call_openai(self, prompt, api_key):
        response = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=15
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def _call_cerebras(self, prompt, api_key):
        response = requests.post(
            "https://api.cerebras.ai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gemma-4-31b",
                "messages": [{"role": "user", "content": prompt}]
            },
            timeout=15
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

    def _call_huggingface(self, prompt, api_key):
        response = requests.post(
            "https://router.huggingface.co/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "meta-llama/Llama-3.2-3B-Instruct",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 1024
            },
            timeout=15
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

def _parse_ai_json(raw: str) -> dict:
    import json
    clean = raw.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    elif clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    return json.loads(clean.strip())

def suggest_target(df) -> dict:
    dtypes_str = df.dtypes.to_string()
    head_str = df.head(5).to_string(index=False)
    prompt = (
        "You are a data science expert. Based on the dataset below, recommend the single "
        "best target column for a predictive machine learning task.\n"
        f"Column names and dtypes:\n{dtypes_str}\n\n"
        f"First 5 rows sample:\n{head_str}\n\n"
        "Return ONLY a raw JSON object. Do not include markdown code fences (like ```json). "
        "The object must have exactly these keys:\n"
        "- 'target_column': The exact name of the recommended target column.\n"
        "- 'confidence': An integer from 0 to 100 representing your confidence.\n"
        "- 'reasoning': 1-2 sentences explaining why this is the best target."
    )
    ai_mgr = AIProviderManager()
    return ai_mgr.generate_response(prompt, parser=_parse_ai_json)

def generate_insights(df) -> dict:
    import pandas as pd
    shape_str = f"{df.shape[0]} rows, {df.shape[1]} columns"
    dtypes_str = df.dtypes.to_string()
    missing_str = df.isnull().sum().to_string()
    stats_str = df.describe().to_string()
    
    numeric_df = df.select_dtypes(include=['number'])
    if not numeric_df.empty and numeric_df.shape[1] > 1:
        corr_str = numeric_df.corr().to_string()
    else:
        corr_str = "Not enough numeric columns for correlations."

    prompt = (
        "You are a data science expert. Based on the dataset summary below, generate 4-6 concise, "
        "specific bullet-point insights about the dataset.\n"
        "Focus on patterns, correlations, class imbalance, data quality issues, or notable distributions.\n"
        "Format the output as a JSON object with a single key 'insights' containing a list of strings.\n"
        "Return ONLY the raw JSON object without any markdown code fences (like ```json).\n\n"
        f"Dataset Shape: {shape_str}\n\n"
        f"Column Types:\n{dtypes_str}\n\n"
        f"Missing Values:\n{missing_str}\n\n"
        f"Basic Statistics:\n{stats_str}\n\n"
        f"Numeric Correlations:\n{corr_str}\n"
    )
    
    ai_mgr = AIProviderManager()
    return ai_mgr.generate_response(prompt, parser=_parse_ai_json)

def generate_chart(df, user_prompt: str) -> dict:
    dtypes_str = df.dtypes.to_string()
    head_str = df.head(5).to_string(index=False)

    prompt = (
        "You are a data science expert. A user wants to visualize this dataset based on their request: "
        f"'{user_prompt}'.\n\n"
        "Here are the dataset columns and types:\n"
        f"{dtypes_str}\n\n"
        "Sample rows:\n"
        f"{head_str}\n\n"
        "Determine the best way to aggregate the data to fulfill the user's request.\n"
        "Return ONLY a raw JSON object with no markdown fences, containing exactly these keys:\n"
        '- "chart_type": "bar", "line", or "pie"\n'
        '- "x_axis": The exact column name to group by on the x-axis.\n'
        '- "y_axis": The exact column name to aggregate on the y-axis, or "count" if we should just count rows.\n'
        '- "agg": The pandas aggregation function to use: "mean", "sum", or "count".\n'
        '- "title": A short descriptive title for the chart.\n'
    )

    ai_mgr = AIProviderManager()
    parsed = ai_mgr.generate_response(prompt, parser=_parse_ai_json)

    x_col = parsed.get("x_axis")
    y_col = parsed.get("y_axis")
    agg_func = parsed.get("agg", "count")
    title = parsed.get("title", "Chart")
    chart_type = parsed.get("chart_type", "bar")

    if x_col not in df.columns:
        raise ValueError(f"AI suggested x_axis '{x_col}' which is not in dataset.")

    if agg_func == "count" or y_col == "count" or y_col not in df.columns:
        aggregated = df.groupby(x_col).size().reset_index(name="value")
    elif agg_func == "mean":
        aggregated = df.groupby(x_col)[y_col].mean().reset_index(name="value")
    elif agg_func == "sum":
        aggregated = df.groupby(x_col)[y_col].sum().reset_index(name="value")
    else:
        aggregated = df.groupby(x_col)[y_col].count().reset_index(name="value")

    data = [
        {"name": str(row[x_col]), "value": round(float(row["value"]), 2)}
        for _, row in aggregated.iterrows()
    ]

    return {
        "chart_type": chart_type,
        "x_axis": x_col,
        "y_axis": y_col,
        "title": title,
        "data": data,
    }
