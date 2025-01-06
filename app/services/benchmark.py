# benchmark.py
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime
import json
import asyncio
from typing import Dict, Any
from models.database import get_db
from models.benchmark import BenchmarkRun
from services.container  import ContainerManager
from utils.logger import logger

router = APIRouter()
container_manager = ContainerManager()

class BenchmarkConfig:
   def __init__(self, total_requests: int = 100, concurrency_level: int = 10,
                max_tokens: int = 100, prompt: str = ''):
       self.total_requests = total_requests
       self.concurrency_level = concurrency_level
       self.max_tokens = max_tokens
       self.prompt = prompt

@router.post("/benchmark")
async def create_benchmark(config: Dict[str, Any], db: Session = Depends(get_db)):
   try:
       logger.info(f"Received benchmark config: {config}")
       nim_id = config.pop('nim_id', None)
       
       if not nim_id:
           raise HTTPException(status_code=400, detail="NIM ID is required")
           
       nim = next((n for n in container_manager.list_containers() 
                  if n['container_id'] == nim_id), None)
       logger.info(f"Found NIM for benchmark: {nim}")
       
       if not nim:
           raise HTTPException(status_code=404, detail="Selected NIM not found")

       benchmark_config = BenchmarkConfig(
           total_requests=config.get('total_requests', 100),
           concurrency_level=config.get('concurrency_level', 10),
           max_tokens=config.get('max_tokens', 100),
           prompt=config.get('prompt', '')
       )

       run = BenchmarkRun(
           model_name=nim['image_name'],
           config=json.dumps(config),
           status="running",
           nim_id=nim_id
       )
       db.add(run)
       db.commit()
       db.refresh(run)
       
       logger.info(f"Created benchmark run: {run.id}")
       asyncio.create_task(execute_benchmark(run.id, nim, benchmark_config))
       return {"run_id": run.id}

   except Exception as e:
       logger.error(f"Failed to start benchmark: {e}")
       raise HTTPException(status_code=500, detail=str(e))

async def execute_benchmark(run_id: int, nim: Dict[str, Any], config: BenchmarkConfig):
   try:
       logger.info(f"Starting benchmark execution for run {run_id}")
       # Implement actual benchmark execution logic here
       
   except Exception as e:
       logger.error(f"Benchmark execution failed: {e}")

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

