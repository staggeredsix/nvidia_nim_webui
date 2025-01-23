# app/api/routes.py
from fastapi import APIRouter, Request, HTTPException, WebSocket
from slowapi import Limiter
from slowapi.util import get_remote_address
import asyncio
from app.utils.logger import logger
import os
from app.utils.ngc_key_helper import retrieve_key
from .endpoints.benchmark_endpoint import router as benchmark_router
from .endpoints.nim import router as nim_router
from .endpoints.ngc import router as ngc_router
from .endpoints.logs import router as logs_router
from app.services.benchmark import benchmark_service
from app.services.container import container_manager
from app.utils.connection import connection_manager
from app.utils.metrics import metrics_collector

limiter = Limiter(key_func=get_remote_address)
api_router = APIRouter()

api_router.include_router(benchmark_router, prefix="/benchmark", tags=["benchmark"])
api_router.include_router(nim_router, prefix="/nims", tags=["nim"])
api_router.include_router(ngc_router, prefix="/ngc-key", tags=["ngc"])
api_router.include_router(logs_router, prefix="/logs", tags=["logs"])



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
    
@api_router.post("/benchmark")
async def benchmark(request: Request):
    """Handles benchmark creation requests."""
    try:
        payload = await request.json()
        if not payload:
            raise HTTPException(status_code=400, detail="Request payload must be in JSON format.")

        name = payload.get('name')
        parameters = payload.get('parameters', {})
        nim_id = payload.get('nim_id')
        gpu_count = payload.get('gpu_count', 1)
        concurrency_level = payload.get('concurrency_level', 1)
        max_tokens = payload.get('max_tokens', 50)
        total_requests = payload.get('total_requests', 100)

        if not nim_id:
            raise HTTPException(status_code=400, detail="'nim_id' is a required field.")

        ngc_api_key = retrieve_key()
        if not ngc_api_key:
            raise HTTPException(status_code=500, detail="NGC API key is not set. Please add it through the WebUI.")

        os.environ["NGC_API_KEY"] = ngc_api_key
        local_nim_cache = os.path.expanduser("~/.cache/nim")
        os.makedirs(local_nim_cache, exist_ok=True)

        result = await benchmark_service.create_benchmark(payload)
        return result

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

@api_router.get("/nims", tags=["nim"])
@limiter.limit("1000/minute")
async def default_nims_route(request: Request):
    try:
        containers = container_manager.list_containers()
        return containers if containers is not None else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/benchmark/history")
@limiter.limit("1000/minute")
def default_benchmark_history_route(request: Request):
    try:
        return benchmark_service.get_benchmark_history()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))