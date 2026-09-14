from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Google Sub / ID
    email = Column(String, unique=True, index=True)
    name = Column(String)
    picture = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, index=True)
    job_id = Column(String, index=True, unique=True)
    filename = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    metadata_json = Column(String) # JSON string to store model metrics, best model etc.
