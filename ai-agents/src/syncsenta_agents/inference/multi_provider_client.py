"""Multi-Provider LLM Client with Automatic Fallback.

Primary provider:
1. Groq (fast, free, rate-limited but sufficient for our needs)

Automatically handles rate limits with retry logic.
"""

import os
import asyncio
import logging
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

log = logging.getLogger(__name__)


class ProviderType(str, Enum):
    """Available LLM providers."""
    GROQ = "groq"


@dataclass
class ProviderConfig:
    """Configuration for an LLM provider."""
    name: ProviderType
    api_key: Optional[str]
    base_url: str
    models: List[str]
    enabled: bool = True
    rate_limit_retry_delay: int = 60  # seconds


class MultiProviderClient:
    """LLM client that automatically falls back between providers.
    
    Usage:
        client = MultiProviderClient()
        response = await client.generate(
            prompt="Hello",
            system="You are helpful",
            max_tokens=1024
        )
    """
    
    def __init__(self):
        self.logger = logging.getLogger("multi_provider_client")
        self.providers = self._initialize_providers()
        self.current_provider_index = 0
        self._rate_limited_until: Dict[str, float] = {}
        
    def _initialize_providers(self) -> List[ProviderConfig]:
        """Initialize provider configurations from environment."""
        providers = []
        
        # Groq (Primary and only provider - fast and free)
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key:
            providers.append(ProviderConfig(
                name=ProviderType.GROQ,
                api_key=groq_key,
                base_url="https://api.groq.com/openai/v1",
                models=[
                    "llama-3.3-70b-versatile",
                    "llama-3.1-8b-instant",
                ],
                rate_limit_retry_delay=120  # Groq: wait 2 minutes
            ))
        
        if not providers:
            raise ValueError(
                "No LLM providers configured. Set GROQ_API_KEY environment variable"
            )
        
        self.logger.info(
            f"Initialized {len([p for p in providers if p.enabled])} provider(s): "
            f"{', '.join(p.name for p in providers if p.enabled)}"
        )
        
        return providers
    
    def _is_rate_limited(self, provider: ProviderConfig) -> bool:
        """Check if provider is currently rate-limited."""
        import time
        if provider.name in self._rate_limited_until:
            if time.time() < self._rate_limited_until[provider.name]:
                return True
            else:
                # Rate limit expired, remove it
                del self._rate_limited_until[provider.name]
        return False
    
    def _mark_rate_limited(self, provider: ProviderConfig):
        """Mark provider as rate-limited."""
        import time
        self._rate_limited_until[provider.name] = (
            time.time() + provider.rate_limit_retry_delay
        )
        self.logger.warning(
            f"Provider {provider.name} rate-limited, "
            f"will retry in {provider.rate_limit_retry_delay}s"
        )
    
    async def generate(
        self,
        prompt: str,
        *,
        system: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.3,
        max_retries: int = 3
    ) -> str:
        """Generate text using available providers with automatic fallback.
        
        Args:
            prompt: User prompt
            system: System prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            max_retries: Max retries per provider
            
        Returns:
            Generated text
            
        Raises:
            Exception: If all providers fail
        """
        last_error = None
        
        # Try each enabled provider
        for provider in self.providers:
            if not provider.enabled:
                continue
                
            # Skip if rate-limited
            if self._is_rate_limited(provider):
                self.logger.info(f"Skipping rate-limited provider: {provider.name}")
                continue
            
            # Try this provider
            for attempt in range(max_retries):
                try:
                    self.logger.info(
                        f"Attempting generation with {provider.name} "
                        f"(attempt {attempt + 1}/{max_retries})"
                    )
                    
                    response = await self._generate_with_provider(
                        provider=provider,
                        prompt=prompt,
                        system=system,
                        max_tokens=max_tokens,
                        temperature=temperature
                    )
                    
                    self.logger.info(f"✅ Success with {provider.name}")
                    return response
                    
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    
                    # Check if rate limit error
                    if any(x in error_str for x in ["rate_limit", "rate limit", "429", "too many requests"]):
                        self.logger.warning(f"Rate limit hit on {provider.name}")
                        self._mark_rate_limited(provider)
                        break  # Don't retry this provider, move to next
                    
                    # Other error - retry with backoff
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        self.logger.warning(
                            f"Error with {provider.name}: {e}. "
                            f"Retrying in {wait_time}s..."
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        self.logger.error(
                            f"Failed all retries with {provider.name}: {e}"
                        )
        
        # All providers failed
        raise Exception(
            f"All LLM providers failed. Last error: {last_error}. "
            "Please check your API keys and try again later."
        )
    
    async def _generate_with_provider(
        self,
        provider: ProviderConfig,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> str:
        """Generate text using a specific provider."""
        if provider.name == ProviderType.GROQ:
            return await self._generate_groq(
                provider, prompt, system, max_tokens, temperature
            )
        else:
            raise ValueError(f"Unsupported provider: {provider.name}")
    
    async def _generate_groq(
        self,
        provider: ProviderConfig,
        prompt: str,
        system: Optional[str],
        max_tokens: int,
        temperature: float
    ) -> str:
        """Generate using Groq."""
        from langchain_groq import ChatGroq
        
        llm = ChatGroq(
            model=provider.models[0],
            api_key=provider.api_key,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        
        response = await asyncio.to_thread(llm.invoke, messages)
        return response.content if hasattr(response, 'content') else str(response)
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers."""
        import time
        status = {}
        
        for provider in self.providers:
            is_rate_limited = self._is_rate_limited(provider)
            time_until_retry = 0
            
            if is_rate_limited:
                time_until_retry = int(
                    self._rate_limited_until[provider.name] - time.time()
                )
            
            status[provider.name] = {
                "enabled": provider.enabled,
                "rate_limited": is_rate_limited,
                "retry_in_seconds": time_until_retry if is_rate_limited else 0,
                "models": provider.models,
            }
        
        return status


# Singleton instance
_client: Optional[MultiProviderClient] = None


def get_multi_provider_client() -> MultiProviderClient:
    """Get or create the singleton multi-provider client."""
    global _client
    if _client is None:
        _client = MultiProviderClient()
    return _client
