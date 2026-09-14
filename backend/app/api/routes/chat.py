from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services import chat_service

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

@router.post("/chat/{job_id}")
def chat_with_data(job_id: str, request: ChatRequest):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="The question cannot be empty.")
    try:
        answer = chat_service.answer_question(job_id, request.question)
        return {"answer": answer}
    except ValueError as e:
        # E.g., when the session is not found
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # E.g., when the AI provider fails
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")
