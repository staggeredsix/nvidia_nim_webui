# app/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from .api.routes import api_router
from .models.database import Base, engine
from .utils.metrics import collect_metrics
from .utils.connection import ConnectionManager
import asyncio
from .utils.logger import logger
from fastapi.websockets import WebSocketState
from app.services.benchmark_progress import ProgressTracker
progress_tracker = ProgressTracker()

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(strict_slashes=False)
connection_manager = ConnectionManager()
app.include_router(api_router, prefix="/api")
app.mount("/assets", StaticFiles(directory="frontend_dist/assets"), name="assets")

# Create an instance of CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with specific origins for production
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
    #allow_credentials=False,
)

# Define WebSocket route for metrics
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await connection_manager.connect(websocket)
        while True:
            try:
                if websocket.client_state == WebSocketState.DISCONNECTED:
                    break
                metrics = collect_metrics()
                if metrics:
                    await websocket.send_json({
                        "type": "metrics_update",
                        "metrics": metrics
                    })
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket error: {str(e)}")
                break
            await asyncio.sleep(1)
    finally:
        if websocket.client_state != WebSocketState.DISCONNECTED:
            try:
                await websocket.close()
            except:
                pass
        await connection_manager.disconnect(websocket)

# Define WebSocket route for benchmark progress
@app.websocket("/ws/benchmark")
async def benchmark_progress_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if websocket.client_state == WebSocketState.DISCONNECTED:
                break  # Exit the loop if the client has disconnected
            
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
        pass  # No need to do anything here since the connection is already closed.
    except Exception as e:
        logger.error(f"Benchmark WebSocket error: {e}")
    finally:
        await websocket.close()  # Ensure the connection is closed properly

@app.websocket("/metrics")
async def metrics_websocket(websocket: WebSocket):
    logger.info(f"WebSocket connection attempt from: {websocket.client.host}")
    await websocket.accept()
    try:
        while True:
            metrics = collect_metrics()
            if metrics:
                await websocket.send_json({"type": "metrics_update", "metrics": metrics})
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {websocket.client.host}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if websocket.client_state != WebSocketState.DISCONNECTED:
            try:
                await websocket.close()
            except:
                pass


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
