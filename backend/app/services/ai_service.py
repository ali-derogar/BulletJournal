import logging
import asyncio
from typing import Optional, List, Any, Dict
from openai import AsyncOpenAI
from pydantic_ai import Agent, RunContext
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIOperationService:
    """
    Service to handle AI operations with robust error handling,
    key rotation, and model fallback strategies.
    """
    
    # Models to try in order of preference
    # Using free models as requested/configured in original code
    MODELS_TO_TRY = [
        'google/gemini-2.0-flash-exp:free',
        'meta-llama/llama-3.3-70b-instruct:free',
        'mistralai/mistral-7b-instruct:free'
    ]

    def __init__(self):
        self.api_keys = settings.NEXT_PUBLIC_OPENROUTER_API_KEYS
        if not self.api_keys:
            logger.warning("No AI API Keys configured!")

    async def execute_agent(
        self, 
        agent: Agent, 
        message: str, 
        deps: Any
    ) -> str:
        """
        Executes the given agent with the message and dependencies.
        Iterates through API keys and Models to find a working combination.
        """
        if not self.api_keys:
             return "Configuration Error: No AI API Keys available."

        last_error = None

        # Outer Loop: API Keys
        for key_index, api_key in enumerate(self.api_keys):
            # Create client for this key
            try:
                client = AsyncOpenAI(
                    api_key=api_key,
                    base_url='https://openrouter.ai/api/v1',
                )
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client for Key #{key_index+1}: {e}")
                continue

            # Inner Loop: Models
            for model_name in self.MODELS_TO_TRY:
                try:
                    logger.info(f"AIService: Trying Key #{key_index+1} with Model '{model_name}'")
                    
                    # Prepare Model with Provider Wrapper
                    provider = OpenAIProvider(openai_client=client)
                    model = OpenAIChatModel(model_name, provider=provider)
                    
                    # Execute
                    result = await agent.run(message, deps=deps, model=model)
                    return result.output

                except Exception as e:
                    error_str = str(e).lower()
                    last_error = e
                    
                    # ERROR HANDLING STRATEGY
                    
                    # 1. Quota Exhausted -> Kill Key, Break to next Key
                    if "insufficient_quota" in error_str:
                        logger.warning(f"Key #{key_index+1} Exhausted (Insufficient Quota). trying next key.")
                        break 
                    
                    # 2. Validation Error (Bad Response) -> Try next model
                    if "validation error" in error_str or "invalid response" in error_str:
                        logger.warning(f"Validation Error with {model_name}: {e}. Trying next model.")
                        continue
                        
                    # 3. Rate Limit / Timeout / Upstream Error -> Try next model
                    if any(x in error_str for x in ["429", "rate limit", "timeout", "unavailable", "503", "502"]):
                        logger.warning(f"Transient Error ({model_name}): {e}. Trying next model.")
                        continue
                        
                    # 4. Unknown Error -> Log and continue (aggressive retry)
                    logger.error(f"Unexpected Error with Key #{key_index+1}/{model_name}: {e}. Trying next.")
                    continue

        # If we get here, everything failed. Try Raw Fallback.
        logger.error(f"All standard strategies failed. Last error: {last_error}. Attempting Raw Fallback.")
        return await self._fallback_raw(message, agent.system_prompt)

    async def _fallback_raw(self, message: str, system_prompt: Any) -> str:
        """
        Last resort manual HTTP call.
        """
        import httpx
        
        # Handle system_prompt being a method or string
        prompt_content = system_prompt
        if callable(prompt_content):
            # Should not happen if we fix usages, but safe handling:
            try:
                prompt_content = prompt_content()
            except:
                prompt_content = "You are a helpful assistant."
        
        # Determine actual string content (pydantic-ai might store it differently)
        # Assuming the caller passes the STRING constant or we handle the method above.
        # Ideally, we pass the explicit string.
        if not isinstance(prompt_content, str):
             # Final safety net
             prompt_content = str(prompt_content)

        last_exception = None

        for api_key in self.api_keys:
            for model in self.MODELS_TO_TRY:
                try:
                    headers = {
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://bulletjournal.local"
                    }
                    payload = {
                        "model": model,
                        "messages": [
                            {"role": "system", "content": prompt_content},
                            {"role": "user", "content": message}
                        ]
                    }
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        resp = await client.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
                        if resp.status_code == 200:
                            data = resp.json()
                            content = data.get("choices", [{}])[0].get("message", {}).get("content")
                            if content:
                                return content
                        else:
                            last_exception = f"HTTP {resp.status_code}: {resp.text[:50]}"
                except Exception as e:
                    last_exception = str(e)
                    continue
        
        return f"AI Service Unavailable. All attempts failed. ({last_exception})"

# Global Instance
ai_service = AIOperationService()
