# app/services/benchmark.py
from datetime import datetime
import aiohttp
from typing import List, Dict, Any
from ..utils.logger import logger

class BenchmarkConfig:
    def __init__(
        self,
        total_requests: int,
        concurrency_level: int,
        max_tokens: int = 100,
        timeout: int = 30,
        prompt: str = "Explain quantum computing briefly"
    ):
        self.total_requests = total_requests
        self.concurrency_level = concurrency_level
        self.max_tokens = max_tokens
        self.timeout = timeout
        self.prompt = prompt

class BenchmarkExecutor:
    def __init__(self, url: str, model_name: str, config: BenchmarkConfig):
        self.url = url
        self.model_name = model_name
        self.config = config

    async def run_benchmark(self) -> List[Dict[str, Any]]:
        async with aiohttp.ClientSession() as session:
            tasks = [
                self._make_request(session, i)
                for i in range(self.config.total_requests)
            ]
            return await asyncio.gather(*tasks)

    async def _make_request(self, session: aiohttp.ClientSession, request_id: int) -> Dict:
        start_time = datetime.utcnow()
        token_timestamps = []
        try:
            async with session.post(
                f"{self.url}/v1/completions",
                json={
                    "model": self.model_name,
                    "prompt": self.config.prompt,
                    "max_tokens": self.config.max_tokens,
                },
                timeout=self.config.timeout
            ) as response:
                response.raise_for_status()
                response_json = await response.json()

                for token in response_json.get("tokens", []):
                    token_timestamps.append(datetime.utcnow())

                if token_timestamps:
                    time_to_first_token = (token_timestamps[0] - start_time).total_seconds()
                    inter_token_latency = (
                        sum((token_timestamps[i] - token_timestamps[i - 1]).total_seconds()
                            for i in range(1, len(token_timestamps)))
                        / (len(token_timestamps) - 1)
                    ) if len(token_timestamps) > 1 else 0.0
                else:
                    time_to_first_token = 0.0
                    inter_token_latency = 0.0

                latency = (datetime.utcnow() - start_time).total_seconds()

                return {
                    "request_id": request_id,
                    "status": "success",
                    "latency": latency,
                    "time_to_first_token": time_to_first_token,
                    "inter_token_latency": inter_token_latency
                }
        except Exception as e:
            logger.error(f"Request {request_id} failed: {e}")
            return {
                "request_id": request_id,
                "status": "failed",
                "error": str(e)
            }
