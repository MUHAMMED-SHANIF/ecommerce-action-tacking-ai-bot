from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
import os
import json

app = FastAPI()

class InteractionRequest(BaseModel):
    text_input: str
    user_context: Optional[Dict] = {}

class InteractionResponse(BaseModel):
    intent: str
    action_params: Dict
    reply_text: str

@app.get("/")
def read_root():
    return {"status": "AI Service Running"}

@app.post("/analyze_intent", response_model=InteractionResponse)
def analyze_intent(request: InteractionRequest):
    # TODO: Integrate LLM here. For MVP, we use rule-based parsing.
    text = request.text_input.lower()
    
    intent = "UNKNOWN"
    params = {}
    reply = "I'm not sure how to help with that yet."

    if "search" in text or "find" in text:
        intent = "SEARCH_PRODUCT"
        # Naive extraction
        params = {"query": text.replace("search", "").replace("find", "").strip()}
        reply = f"Searching for {params['query']}..."
        
    elif "cart" in text and "add" in text:
        intent = "ADD_TO_CART"
        reply = "Adding to cart..."
        
    return {
        "intent": intent,
        "action_params": params,
        "reply_text": reply
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
