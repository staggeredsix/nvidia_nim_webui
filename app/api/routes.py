# File: app/api/routes.py
from fastapi import APIRouter
from .endpoints.benchmark import router as benchmark_router
from .endpoints.nim import router as nim_router
from .endpoints.ngc import router as ngc_router

api_router = APIRouter()

# Mount the routers
api_router.include_router(benchmark_router, prefix="/benchmark", tags=["benchmark"])
api_router.include_router(nim_router, prefix="/nims", tags=["nim"])
api_router.include_router(ngc_router, prefix="/ngc-key", tags=["ngc"])
