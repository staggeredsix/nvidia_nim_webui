# app/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from .api.routes import api_router
from .models.database import Base, engine

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Mount static files
app.mount("/assets", StaticFiles(directory="frontend_dist/assets"), name="assets")

# Include API routes
app.include_router(api_router, prefix="/api")

# Handle SPA routes - this must be the last route
@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    spa_path = Path("frontend_dist/index.html")
    if not spa_path.exists():
        raise HTTPException(status_code=404)
    return FileResponse(spa_path)

# app/utils/logger.py
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("benchmark-system")
