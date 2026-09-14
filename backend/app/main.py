from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import upload, eda, ml, explain, data_quality, outliers, feature_engineering, reports, chat, export, auth, user
from app.database import engine, Base
import app.models
from app.core import config

Base.metadata.create_all(bind=engine)
app = FastAPI(title="DataForge AI API", version="1.0.0")

@app.on_event("startup")
def check_api_keys_startup():
    keys = {
        "GROQ_API_KEY": config.GROQ_API_KEY,
        "GEMINI_API_KEY": config.GEMINI_API_KEY,
        "OPENROUTER_API_KEY": config.OPENROUTER_API_KEY,
        "CEREBRAS_API_KEY": config.CEREBRAS_API_KEY,
        "HUGGINGFACE_API_KEY": config.HUGGINGFACE_API_KEY,
    }
    for name, val in keys.items():
        print(f"{name}: {'SET' if val else 'MISSING'}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://dataforge-ai-frontend.vercel.app",
        config.FRONTEND_URL,  # from .env, for production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(upload.router, tags=["upload"])
app.include_router(eda.router, prefix="/eda", tags=["eda"])
app.include_router(ml.router, prefix="/ml", tags=["ml"])
app.include_router(explain.router, prefix="/shap", tags=["shap"])
app.include_router(data_quality.router, prefix="/data-quality", tags=["data-quality"])
app.include_router(outliers.router, prefix="/outliers", tags=["outliers"])
app.include_router(feature_engineering.router, prefix="/feature-engineering", tags=["feature-engineering"])
app.include_router(reports.router, tags=["reports"])
app.include_router(chat.router, tags=["chat"])
app.include_router(export.router, tags=["export"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(user.router, prefix="/user", tags=["user"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
