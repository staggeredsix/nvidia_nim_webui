# File: app/api/endpoints/benchmark.py
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Response
from sqlalchemy.orm import Session
from datetime import datetime
import json
import asyncio
from typing import Dict, Any
from app.models.database import get_db
from app.models.benchmark_telemetry import BenchmarkRun
from app.services.container import ContainerManager
from app.api.endpoints import BenchmarkConfig, BenchmarkExecutor
from app.utils import logger


router = APIRouter()
container_manager = ContainerManager()

@router.post("/benchmark")
async def create_benchmark(config: Dict[str, Any], db: Session = Depends(get_db)):
   try:
       nim_id = config.pop('nim_id', None)
       if not nim_id:
           raise HTTPException(status_code=400, detail="NIM ID is required")
           
       nim = next((n for n in container_manager.list_containers() if n['container_id'] == nim_id), None)
       if not nim:
           raise HTTPException(status_code=404, detail="Selected NIM not found")

       benchmark_config = BenchmarkConfig(
           total_requests=config.get('totalRequests', 100),
           concurrency_level=config.get('concurrencyLevel', 10),
           max_tokens=config.get('maxTokens', 100),
           prompt=config.get('prompt', '')
       )

       run = BenchmarkRun(
           model_name=config.get('prompt', ''),
           config=json.dumps(config),
           status="running"
       )
       db.add(run)
       db.commit()
       db.refresh(run)

       executor = BenchmarkExecutor(nim['url'], nim['image_name'], benchmark_config)
       asyncio.create_task(executor.run_benchmark())
       
       return {"run_id": run.id}
   except Exception as e:
       logger.error(f"Failed to start benchmark: {e}")
       raise HTTPException(status_code=500, detail=str(e))

@router.get("/benchmark/history")
def get_benchmark_history(db: Session = Depends(get_db)):
    try:
        runs = db.query(BenchmarkRun).order_by(BenchmarkRun.start_time.desc()).all()
        return [format_benchmark_run(run) for run in runs]
    except Exception as e:
        logger.error(f"Failed to get benchmark history: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def format_benchmark_run(run: BenchmarkRun):
    return {
        "id": run.id,
        "model_name": run.model_name,
        "status": run.status,
        "start_time": run.start_time.isoformat(),
        "end_time": run.end_time.isoformat() if run.end_time else None,
        "metrics": {
            "average_tps": run.average_tps,
            "peak_tps": run.peak_tps,
            "p95_latency": run.p95_latency
        }
    }

@router.get("/{run_id}/export")
async def export_benchmark(run_id: int, db: Session = Depends(get_db)):
    run = db.query(BenchmarkRun).filter(BenchmarkRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Benchmark run not found")
        
    benchmark_data = {
        "id": run.id,
        "name": run.name,
        "description": run.description,
        "model_name": run.model_name,
        "status": run.status,
        "start_time": run.start_time.isoformat(),
        "end_time": run.end_time.isoformat() if run.end_time else None,
        "config": json.loads(run.config),
        "metrics": {
            "average_tps": run.average_tps,
            "peak_tps": run.peak_tps,
            "p95_latency": run.p95_latency,
            "time_to_first_token": run.time_to_first_token,
            "inter_token_latency": run.inter_token_latency,
            "average_gpu_utilization": run.average_gpu_utilization,
            "peak_gpu_utilization": run.peak_gpu_utilization,
            "average_gpu_memory": run.average_gpu_memory,
            "peak_gpu_memory": run.peak_gpu_memory,
            "gpu_power_draw": run.gpu_power_draw,
            "total_tokens": run.total_tokens,
            "successful_requests": run.successful_requests,
            "failed_requests": run.failed_requests
        }
    }
    
    return Response(
        content=json.dumps(benchmark_data, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="benchmark-{run.name}-{run.id}.json"'
        }
    )