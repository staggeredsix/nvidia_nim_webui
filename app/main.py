from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from .api.routes import api_router
from .utils.metrics import collect_metrics
from .utils.connection import ConnectionManager
import asyncio
from .utils.logger import logger
from fastapi.websockets import WebSocketState
from app.services.benchmark_progress import ProgressTracker
import json
import os

progress_tracker = ProgressTracker()

# Text file to store benchmark history
BENCHMARK_HISTORY_FILE = "benchmark_history.json"

# Initialize history file if not present
if not os.path.exists(BENCHMARK_HISTORY_FILE):
    with open(BENCHMARK_HISTORY_FILE, "w") as file:
        json.dump([], file)

app = FastAPI(strict_slashes=False)
connection_manager = ConnectionManager()
app.include_router(api_router, prefix="/api")
app.mount("/assets", StaticFiles(directory="frontend_dist/assets"), name="assets")

# Enable CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with specific domains in production
    allow_methods=["GET", "POST", "OPTIONS"],  # Allow WebSocket handshake
    allow_headers=["*"],
    allow_credentials=True,
)

# Define WebSocket route for metrics
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    logger.info(f"WebSocket connection attempt from: {websocket.client.host}")
    await websocket.accept()
    try:
        await connection_manager.connect(websocket)
        while True:
            try:
                if websocket.client_state == WebSocketState.DISCONNECTED:
                    break
                metrics = collect_metrics()
                if metrics is None:
                    logger.warning("Metrics collection returned None. Sending default values.")
                    metrics = {
                        "gpu_utilization": 0,
                        "gpu_memory": 0,
                        "tokens_per_second": 0
                    }
                logger.info(f"Sending metrics: {metrics}")
                await websocket.send_json({
                    "type": "metrics_update",
                    "metrics": metrics
                })
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected.")
                break
            except Exception as e:
                logger.error(f"WebSocket error while sending metrics: {e}")
                break
            await asyncio.sleep(1)
    finally:
        if websocket.client_state != WebSocketState.DISCONNECTED:
            try:
                await websocket.close()
            except Exception as e:
                logger.error(f"Error while closing WebSocket: {e}")
        await connection_manager.disconnect(websocket)

# Define WebSocket route for benchmark progress
@app.websocket("/ws/benchmark")
async def benchmark_progress_ws(websocket: WebSocket):
    logger.info(f"Benchmark WebSocket connection attempt from: {websocket.client.host}")
    await websocket.accept()
    try:
        while True:
            if websocket.client_state == WebSocketState.DISCONNECTED:
                break  # Exit the loop if the client has disconnected
            
            if not progress_tracker.progress:
                logger.debug("No benchmark progress available. Retrying...")
                await asyncio.sleep(1)
                continue
                
            for run_id, progress in progress_tracker.progress.items():
                logger.info(f"Sending benchmark progress for run_id {run_id}: {progress}")
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
        logger.info("Benchmark WebSocket disconnected.")
    except Exception as e:
        logger.error(f"Benchmark WebSocket error: {e}")
    finally:
        try:
            await websocket.close()
        except Exception as e:
            logger.error(f"Error while closing Benchmark WebSocket: {e}")

@app.get("/api/benchmark/history")
def get_benchmark_history():
    try:
        with open(BENCHMARK_HISTORY_FILE, "r") as file:
            history = json.load(file)
        logger.info(f"Retrieved {len(history)} benchmark runs from the text file.")
        return history
    except Exception as e:
        logger.error(f"Failed to get benchmark history: {e}")
        raise HTTPException(status_code=500, detail="Error reading benchmark history")

@app.post("/api/benchmark/add")
def add_benchmark_run(run: dict):
    try:
        with open(BENCHMARK_HISTORY_FILE, "r+") as file:
            history = json.load(file)
            history.append(run)
            file.seek(0)
            json.dump(history, file, indent=4)
        logger.info(f"Added new benchmark run: {run}")
        return {"message": "Benchmark run added successfully"}
    except Exception as e:
        logger.error(f"Failed to add benchmark run: {e}")
        raise HTTPException(status_code=500, detail="Error adding benchmark run")

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api") or full_path.startswith("ws"):
        raise HTTPException(status_code=404)
    spa_path = Path("frontend_dist/index.html")
    if not spa_path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(spa_path)

print("Registered Routes:")
for route in app.routes:
    if hasattr(route, "methods"):  # Ensure the route has a methods attribute
        print(f"Path: {route.path}, Name: {route.name}, Methods: {route.methods}")
    else:
        print(f"Path: {route.path}, Name: {route.name}, Type: {type(route).__name__}")
