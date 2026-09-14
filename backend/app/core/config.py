import os
from dotenv import load_dotenv
load_dotenv()  # .env file load hoti hai yahan

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
JWT_SECRET = os.getenv("JWT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Optional OAuth — warn but don't crash if missing (guest mode)
if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
    print("[config] WARNING: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set — OAuth disabled, guest-only mode.")
if not JWT_SECRET:
    import secrets
    JWT_SECRET = secrets.token_urlsafe(32)
    print("[config] WARNING: JWT_SECRET not set — generated ephemeral key (sessions reset on restart).")