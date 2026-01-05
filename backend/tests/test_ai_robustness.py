import asyncio
import unittest
from unittest.mock import MagicMock, AsyncMock, patch
from app.services.ai_service import AIOperationService

class TestAIRobustness(unittest.IsolatedAsyncioTestCase):
    
    async def asyncSetUp(self):
        # Reset singleton or create new instance logic if needed
        self.service = AIOperationService()
        self.service.api_keys = ["sk-test-key-1", "sk-test-key-2"]
        self.service.MODELS_TO_TRY = ["test/model-1", "test/model-2"]

    @patch("openai.AsyncOpenAI")
    async def test_successful_run(self, mock_openai_cls):
        """Test happy path where first key/model works."""
        mock_agent = AsyncMock()
        mock_agent.run.return_value = MagicMock(data="Success Response")
        mock_agent.system_prompt = "System Prompt"

        result = await self.service.execute_agent(mock_agent, "Hello", {})
        self.assertEqual(result, "Success Response")

    @patch("openai.AsyncOpenAI")
    async def test_rate_limit_switching_model(self, mock_openai_cls):
        """Test that 429 Error triggers switch to next model."""
        mock_agent = AsyncMock()
        mock_agent.system_prompt = "System Prompt"
        
        # First call raises 429, Second call works
        mock_agent.run.side_effect = [
            Exception("429 Rate Limit Exceeded"),
            MagicMock(data="Recovered Response")
        ]

        result = await self.service.execute_agent(mock_agent, "Hello", {})
        
        self.assertEqual(result, "Recovered Response")
        self.assertEqual(mock_agent.run.call_count, 2)
        
    @patch("openai.AsyncOpenAI")
    async def test_validation_error_retry(self, mock_openai_cls):
        """Test that Pydantic Validation Error triggers retry."""
        mock_agent = AsyncMock()
        mock_agent.system_prompt = "System Prompt"
        
        # First call raises Validation Error, Second call works
        mock_agent.run.side_effect = [
            Exception("pydantic_core.ValidationError: validation error"),
            MagicMock(data="Valid Response")
        ]
        
        result = await self.service.execute_agent(mock_agent, "Hello", {})
        self.assertEqual(result, "Valid Response")

    @patch("openai.AsyncOpenAI")
    async def test_quota_exhausted_switching_key(self, mock_openai_cls):
        """Test that Insufficient Quota switches to Next Key."""
        mock_agent = AsyncMock()
        mock_agent.system_prompt = "System Prompt"
        
        # Simulate Key 1 fails completely (all models fail for it, or immediate break)
        # In our logic: "insufficient_quota" breaks the inner loop immediately.
        
        mock_agent.run.side_effect = [
            Exception("Error: insufficient_quota"), # Key 1 fail
            MagicMock(data="Key 2 Success")         # Key 2 success
        ]
        
        result = await self.service.execute_agent(mock_agent, "Hello", {})
        self.assertEqual(result, "Key 2 Success")
        
    @patch("httpx.AsyncClient")
    async def test_all_fallback(self, mock_httpx):
        """Test that if everything fails, we hit fallback."""
        # Force Agent.run to always fail
        mock_agent = AsyncMock()
        mock_agent.run.side_effect = Exception("Unknown Critical Error")
        mock_agent.system_prompt = "System Prompt"
        
        # Mock Fallback HTTP Call
        mock_client_instance = AsyncMock()
        mock_httpx.return_value.__aenter__.return_value = mock_client_instance
        mock_client_instance.post.return_value = MagicMock(
            status_code=200,
            json=lambda: {"choices": [{"message": {"content": "Fallback Success"}}]}
        )

        result = await self.service.execute_agent(mock_agent, "Hello", {})
        self.assertEqual(result, "Fallback Success")

if __name__ == "__main__":
    unittest.main()
