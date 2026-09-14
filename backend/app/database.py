from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core import config

SQLALCHEMY_DATABASE_URL = config.DATABASE_URL

# Normalize URLs so SQLAlchemy knows which driver to use
if SQLALCHEMY_DATABASE_URL.startswith("postgresql://") or SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg2://", 1
    ).replace("postgres://", "postgresql+psycopg2://", 1)

is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
