# app/api/routes.py
from fastapi import APIRouter, HTTPException
from .endpoints.benchmark import router as benchmark_router
from .endpoints.nim import router as nim_router
from .endpoints.ngc import router as ngc_router
from .endpoints.nim import list_nims  # Import the list_nims function
from .endpoints.benchmark import get_benchmark_history # Import get_benchmark_history function

api_router = APIRouter()

api_router.include_router(benchmark_router, prefix="/benchmark", tags=["benchmark"])
api_router.include_router(nim_router, prefix="/nims", tags=["nim"])
api_router.include_router(ngc_router, prefix="/ngc-key", tags=["ngc"])

@api_router.get("/nims", tags=["nim"])
async def default_nims_route():
   return await list_nims()

@api_router.get("/benchmark/history", tags=["benchmark"]) 
async def default_benchmark_history_route():
   return await get_benchmark_history()

