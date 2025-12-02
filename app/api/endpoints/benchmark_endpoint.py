# app/api/endpoints/benchmark_endpoint.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

from app.services.benchmark import benchmark_service

router = APIRouter()


class BenchmarkConfig(BaseModel):
    total_requests: int = Field(..., gt=0, description="Total number of requests to send")
    concurrency_level: int = Field(..., gt=0, description="Number of concurrent requests")
    max_tokens: Optional[int] = Field(None, gt=0, description="Maximum number of tokens per request")
    prompt: str = Field(..., min_length=1, description="Prompt template for the benchmark")
    name: str = Field(..., min_length=1, description="Name of the benchmark")
    description: Optional[str] = Field(None, description="Optional description of the benchmark")
    nim_id: Optional[str] = Field(None, description="ID of the NIM container to use (omit for external providers)")
    provider: Optional[str] = Field(None, description="External provider identifier (llama.cpp, ollama, sglang, vllm, nim)")
    endpoint: Optional[str] = Field(None, description="Base URL for the provider (defaults to http://localhost:8000)")
    model_name: Optional[str] = Field(None, description="Model identifier visible to the provider")
    quantization: Optional[str] = Field("default", description="Quantization mode such as default or nvfp4")
    stream: bool = Field(False, description="Enable streaming to capture first-token latency")
    expected_output: Optional[str] = Field(None, description="Expected completion text for simple accuracy scoring")
    port: Optional[int] = Field(8000, description="Port to use when no full endpoint is provided")


@router.post("/")
async def create_benchmark(config: BenchmarkConfig):
    try:
        run = await benchmark_service.create_benchmark(config.model_dump())
        return {
            "run_id": run.get("id"),
            "metrics": run.get("metrics"),
            "container_id": run.get("container_id"),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_benchmark_history():
    return [run for run in benchmark_service.get_benchmark_history()]


@router.get("/{run_id}")
def get_benchmark(run_id: int):
    run = benchmark_service.get_benchmark(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
    return run
