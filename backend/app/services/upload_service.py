import pandas as pd
import io
from fastapi import HTTPException, UploadFile
from app.core.session_store import store

async def handle_file_upload(file: UploadFile) -> str:
    try:
        contents = await file.read()
        filename = file.filename.lower()
        
        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or Excel files.")
            
        job_id = store.create_session(df=df, filename=file.filename)
        return job_id
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
