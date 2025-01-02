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
# Create tables
Base.metadata.create_all(bind=engine)

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

# Define WebSocket route
from .utils.metrics import collect_metrics

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        await connection_manager.connect(websocket)
        while True:
            metrics = collect_metrics()
            if metrics:
                await websocket.send_json(metrics)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        await connection_manager.disconnect(websocket)

# File: app/main.py
@app.websocket("/ws/benchmark")
async def benchmark_progress_ws(websocket: WebSocket):
   await websocket.accept()
   try:
       while True:
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


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    spa_path = Path("frontend_dist/index.html")
    if not spa_path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(spa_path)
