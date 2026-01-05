import os
import asyncio
import logging
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from openai import AsyncOpenAI
from app.services.ai_service import AIOperationService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def reproduce():
    service = AIOperationService()
    
    # Simple agent for testing
    model = OpenAIChatModel('google/gemma-3-27b-it:free') 
    agent = Agent(model, system_prompt="You are a helper.")

    print("Running AIService...")
    try:
        # We pass empty deps because our simple agent doesn't use tools
        result = await service.execute_agent(agent, "Hello, are you working?", deps={})
        print("Success:", result)
    except Exception as e:
        print("Caught Exception:")
        print(e)
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(reproduce())
