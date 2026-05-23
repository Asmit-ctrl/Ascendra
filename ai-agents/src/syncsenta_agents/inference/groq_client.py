"""Groq AI client for ultra-fast cloud inference - FREE tier available!"""

import os
import time
from typing import Dict, List, Optional, Any
import aiohttp
from dataclasses import dataclass

from ..core.config import config
from ..core.logging import AgentLogger
from ..core.exceptions import ModelUnavailableError, NetworkError


@dataclass
class GroqResponse:
    """Response from Groq API."""
    response: str
    model: str
    usage: Dict[str, int]
    finish_reason: str


class GroqClient:
    """Client for interacting with Groq's ultra-fast LLM API.
    
    Groq provides FREE access to:
    - Llama 3.1 (8B, 70B, 405B)
    - Mixtral 8x7B
    - Gemma 2 9B
    
    Get your FREE API key: https://console.groq.com/keys
    """
    
    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.base_url = "https://api.groq.com/openai/v1"
        self.logger = AgentLogger("groq_client")
        self.session: Optional[aiohttp.ClientSession] = None
        
        if not self.api_key:
            raise ValueError(
                "GROQ_API_KEY environment variable is required. "
                "Get your FREE key at: https://console.groq.com/keys"
            )
        
    async def __aenter__(self):
        """Async context manager entry."""
        await self.initialize()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
    
    async def initialize(self) -> None:
        """Initialize the Groq client."""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        self.session = aiohttp.ClientSession(
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=config.request_timeout_seconds)
        )
        
        self.logger.info(
            "Groq client initialized",
            model=self.model
        )
    
    async def close(self) -> None:
        """Close the client session."""
        if self.session:
            await self.session.close()
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        top_p: float = 1.0,
        stream: bool = False
    ) -> GroqResponse:
        """Send a chat completion request to Groq.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model to use (defaults to self.model)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            top_p: Nucleus sampling parameter
            stream: Whether to stream the response
            
        Returns:
            GroqResponse with the model's response
        """
        
        model = model or self.model
        
        # Prepare request payload
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "top_p": top_p,
            "stream": stream
        }
        
        start_time = time.time()
        
        try:
            async with self.session.post(
                f"{self.base_url}/chat/completions",
                json=payload
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    
                    generation_time_ms = int((time.time() - start_time) * 1000)
                    
                    choice = data["choices"][0]
                    message = choice["message"]
                    usage = data.get("usage", {})
                    
                    self.logger.info(
                        "Groq generation completed",
                        model=model,
                        generation_time_ms=generation_time_ms,
                        prompt_tokens=usage.get("prompt_tokens", 0),
                        completion_tokens=usage.get("completion_tokens", 0),
                        total_tokens=usage.get("total_tokens", 0)
                    )
                    
                    return GroqResponse(
                        response=message.get("content", ""),
                        model=data.get("model", model),
                        usage=usage,
                        finish_reason=choice.get("finish_reason", "stop")
                    )
                else:
                    error_text = await response.text()
                    self.logger.error(
                        "Groq generation failed",
                        model=model,
                        status_code=response.status,
                        error=error_text
                    )
                    
                    raise ModelUnavailableError(
                        f"Groq API request failed: {error_text}"
                    )
                    
        except aiohttp.ClientError as e:
            self.logger.error(
                "Network error during Groq generation",
                model=model,
                error=str(e)
            )
            raise NetworkError(f"Network error during Groq generation: {e}")
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> GroqResponse:
        """Generate text using Groq (compatible with Ollama interface).
        
        Args:
            model: Model name (ignored, uses self.model)
            prompt: User prompt
            system: System prompt
            options: Generation options (temperature, max_tokens, etc.)
            
        Returns:
            GroqResponse with the generated text
        """
        
        # Build messages
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        # Extract options
        temperature = 0.7
        max_tokens = 1024
        
        if options:
            temperature = options.get("temperature", 0.7)
            max_tokens = options.get("max_tokens", 1024)
        
        return await self.chat_completion(
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )


# Available Groq models
GROQ_MODELS = {
    # Llama 3.3 models (CURRENT - RECOMMENDED)
    "llama-3.3-70b-versatile": "Meta Llama 3.3 70B (balanced, RECOMMENDED)",
    
    # Llama 3.1 models (DEPRECATED)
    "llama-3.1-405b-reasoning": "Meta Llama 3.1 405B (DEPRECATED)",
    "llama-3.1-8b-instant": "Meta Llama 3.1 8B (DEPRECATED)",
    
    # Mixtral models
    "mixtral-8x7b-32768": "Mixtral 8x7B (good for long context)",
    
    # Gemma models
    "gemma2-9b-it": "Google Gemma 2 9B (instruction-tuned)",
    "gemma-7b-it": "Google Gemma 7B (instruction-tuned)",
    
    # Llama 3 models (older)
    "llama3-70b-8192": "Meta Llama 3 70B",
    "llama3-8b-8192": "Meta Llama 3 8B",
}


def get_recommended_model(task: str = "general") -> str:
    """Get recommended Groq model for a task.
    
    Args:
        task: Task type (general, tutoring, assessment, translation)
        
    Returns:
        Model name
    """
    
    recommendations = {
        "general": "llama-3.3-70b-versatile",
        "tutoring": "llama-3.3-70b-versatile",  # Best quality for education
        "assessment": "llama-3.1-8b-instant",   # Fast for quiz generation
        "translation": "llama-3.3-70b-versatile", # Good multilingual
        "fast": "llama-3.1-8b-instant",         # Fastest responses
    }
    
    return recommendations.get(task, "llama-3.3-70b-versatile")
