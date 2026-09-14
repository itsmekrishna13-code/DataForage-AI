import uuid
from typing import Dict, Any
import pandas as pd

class SessionStore:
    def __init__(self):
        # Maps job_id to a dictionary containing the dataframe and metadata
        self._store: Dict[str, Dict[str, Any]] = {}

    def create_session(self, df: pd.DataFrame, filename: str) -> str:
        job_id = str(uuid.uuid4())
        self._store[job_id] = {
            "df": df,
            "filename": filename
        }
        return job_id

    def get_session(self, job_id: str) -> Dict[str, Any]:
        return self._store.get(job_id)

    def get_df(self, job_id: str) -> pd.DataFrame:
        session = self.get_session(job_id)
        return session.get("df") if session else None

    def save_model_artifacts(self, job_id: str, artifacts: Dict[str, Any]):
        if job_id not in self._store:
            raise ValueError("Session not found")
        self._store[job_id]["ml_artifacts"] = artifacts

    def get_model_artifacts(self, job_id: str) -> Dict[str, Any]:
        session = self.get_session(job_id)
        return session.get("ml_artifacts") if session else None

    def delete_session(self, job_id: str):
        if job_id in self._store:
            del self._store[job_id]

# Singleton instance for the app
store = SessionStore()
