# app/api/routes.py
from fastapi import APIRouter, WebSocket
from slowapi import Limiter
from slowapi.util import get_remote_address
import asyncio

from app.utils.logger import logger
from app.utils.connection import connection_manager
from app.utils.metrics import metrics_collector
from .endpoints.benchmark_endpoint import router as benchmark_router
from .endpoints.nim import router as nim_router
from .endpoints.ngc import router as ngc_router
from .endpoints.logs import router as logs_router
from .endpoints.metrics_endpoint import router as metrics_router
from .endpoints.model_setup import router as model_setup_router

limiter = Limiter(key_func=get_remote_address)
api_router = APIRouter()

api_router.include_router(benchmark_router, prefix="/benchmark", tags=["benchmark"])
api_router.include_router(nim_router, prefix="/nims", tags=["nim"])
api_router.include_router(ngc_router, prefix="/ngc-key", tags=["ngc"])
api_router.include_router(logs_router, prefix="/logs", tags=["logs"])
api_router.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
api_router.include_router(model_setup_router, prefix="/models", tags=["models"])


@api_router.websocket("/metrics")
async def metrics_websocket(websocket: WebSocket):
    await connection_manager.connect(websocket)
    try:
        while True:
            metrics = metrics_collector.collect_metrics()
            await websocket.send_json({
                "type": "metrics_update",
                "metrics": metrics
            })
            await asyncio.sleep(1)
    except Exception as e:
        logger.error(f"Metrics WebSocket error: {e}")
    finally:
        await connection_manager.disconnect(websocket)
