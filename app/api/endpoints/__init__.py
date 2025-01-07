# app/api/endpoints/__init__.py
from .benchmark import router as benchmark_router
from .nim import router as nim_router
from .ngc import router as ngc_router

__all__ = ['benchmark_router', 'nim_router', 'ngc_router']
