# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketState
from pathlib import Path
import asyncio
from datetime import datetime

from .api.routes import api_router
from .utils.metrics import collect_metrics
from .utils.connection import ConnectionManager
from .utils.logger import logger
from .services.benchmark_progress import ProgressTracker

progress_tracker = ProgressTracker()

app = FastAPI(strict_slashes=False)
connection_manager = ConnectionManager()

# Mount API router without benchmark prefix to fix 405 error
app.include_router(api_router, prefix="/api")
app.mount("/assets", StaticFiles(directory="frontend_dist/assets"), name="assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.websocket("/metrics")
async def metrics_websocket(websocket: WebSocket):
    await websocket.accept()
    try:
        await connection_manager.connect(websocket)
        while True:
            try:
                # Use WebSocketState for state checking
                if websocket.client_state == WebSocketState.DISCONNECTED:
                    break
                    
                metrics = collect_metrics()
                # Send empty metrics instead of breaking if no data available
                await websocket.send_json({
                    "type": "metrics_update",
                    "metrics": metrics or {
                        "tokens_per_second": 0,
                        "gpu_utilization": 0,
                        "power_efficiency": 0,
                        "gpu_memory": 0,
                        "gpu_temp": 0,
                        "timestamp": str(datetime.utcnow()),
                        "requests_per_second": 0,
                        "latency": 0,
                        "memory_used": 0,
                        "memory_total": 0
                    }
                })
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                break
            await asyncio.sleep(10)  # 10 second refresh rate
    finally:
        await connection_manager.disconnect(websocket)
        try:
            if websocket.client_state != WebSocketState.DISCONNECTED:
                await websocket.close()
        except Exception as e:
            logger.error(f"Error closing websocket: {e}")

@app.websocket("/ws/benchmark")
async def benchmark_progress_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if websocket.client_state == WebSocketState.DISCONNECTED:
                break
            
            if not progress_tracker.progress:
                await asyncio.sleep(1)
                continue
                
            for run_id, progress in progress_tracker.progress.items():
                await websocket.send_json({
                    "type": "benchmark_progress",
                    "progress": {
                        "completed": progress.completed,
                        "total": progress.total,
                        "currentTps": progress.current_tps,
                        "estimatedTimeRemaining": progress.estimated_time_remaining
                    }
                })
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"Benchmark WebSocket error: {e}")
    finally:
        try:
            if websocket.client_state != WebSocketState.DISCONNECTED:
                await websocket.close()
        except Exception as e:
            logger.error(f"Error closing benchmark websocket: {e}")

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/") or full_path.startswith("ws/"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    spa_path = Path("frontend_dist/index.html")
    if not spa_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return FileResponse(spa_path)