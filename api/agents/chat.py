"""
Vercel Serverless Function for SyncSenta AI Agents Chat
"""

import os
import json
from typing import Dict, Any
import aiohttp
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Initialize FastAPI app
app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def call_groq_api(
    message: str,
    model: str = None,
    temperature: float = 0.7,
    max_tokens: int = 2000
) -> Dict[str, Any]:
    """Call Groq API directly."""
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY environment variable is required")
    
    model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are an expert Kenyan teacher assistant helping with CBC curriculum. Provide detailed, practical, and culturally relevant responses."
            },
            {
                "role": "user",
                "content": message
            }
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload
        ) as response:
            if response.status == 200:
                data = await response.json()
                return {
                    "success": True,
                    "response": data["choices"][0]["message"]["content"],
                    "model": data.get("model", model),
                    "usage": data.get("usage", {})
                }
            else:
                error_text = await response.text()
                return {
                    "success": False,
                    "error": f"Groq API error: {error_text}",
                    "status_code": response.status
                }


@app.post("/api/agents/chat")
async def chat_endpoint(request: Request):
    """Main chat endpoint for AI agents."""
    
    try:
        body = await request.json()
        
        message = body.get("message", "")
        if not message:
            return JSONResponse(
                status_code=400,
                content={"success": False, "error": "Message is required"}
            )
        
        # Call Groq API
        result = await call_groq_api(
            message=message,
            temperature=body.get("temperature", 0.7),
            max_tokens=body.get("max_tokens", 2000)
        )
        
        return JSONResponse(content=result)
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )


@app.get("/api/agents/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "syncsenta-ai-agents",
        "groq_configured": bool(os.getenv("GROQ_API_KEY"))
    }


# Vercel serverless handler
async def handler(request: Request):
    """Vercel serverless handler."""
    return await app(request)
