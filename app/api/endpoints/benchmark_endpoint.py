# app/api/endpoints/benchmark_endpoint.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional

from ...services.benchmark_service import benchmark_service
from ...services.container import container_manager
from ...utils.logger import logger

router = APIRouter()

class BenchmarkConfig(BaseModel):
    total_requests: int
    concurrency_level: int
    max_tokens: Optional[int] = None
    prompt: str
    name: str
    description: Optional[str] = None
    nim_id: str

@router.post("/")  # Changed from @router.post("/benchmark")
async def create_benchmark(config: BenchmarkConfig):
    try:
        logger.info(f"Received benchmark config: {config}")
        
        # Validate NIM exists
        nim = next((n for n in container_manager.list_containers() 
                   if n['container_id'] == config.nim_id), None)
        
        if not nim:
            raise HTTPException(status_code=404, detail="Selected NIM not found")

        run = benchmark_service.create_benchmark({
            "total_requests": config.total_requests,
            "concurrency_level": config.concurrency_level,
            "max_tokens": config.max_tokens,
            "prompt": config.prompt,
            "name": config.name,
            "description": config.description,
            "nim_id": config.nim_id,
            "model_name": nim['image_name']
        })
        
        logger.info(f"Created benchmark run: {run.id}")
        return {"run_id": run.id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start benchmark: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
def get_benchmark_history():
    try:
        runs = benchmark_service.get_benchmark_history()
        return [run.to_dict() for run in runs]
    except Exception as e:
        logger.error(f"Failed to get benchmark history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{run_id}")
def get_benchmark(run_id: int):
    run = benchmark_service.get_benchmark(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
    return run.to_dict()