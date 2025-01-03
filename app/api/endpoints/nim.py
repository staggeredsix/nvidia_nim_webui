# File: app/api/endpoints/nim.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict
from pydantic import BaseModel
from ...services.container import ContainerManager
from ...utils.logger import logger
from helpers.ngc_key_helper import key_exists
from typing import Any

router = APIRouter()
container_manager = ContainerManager()

class NimPullRequest(BaseModel):
    image_name: str

@router.post("/pull")  # Changed from "/nims/pull" to just "/pull"
async def pull_nim(request: NimPullRequest):
    if not key_exists():
        raise HTTPException(status_code=400, detail="NGC API key not set")
    try:
        return await container_manager.start_container(request.image_name)
    except Exception as e:
        logger.error(f"Failed to pull NIM: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")  # Changed from "/nims/stop" to just "/stop"
async def stop_nim():
    try:
        container_manager.stop_container()
        return {"status": "stopped"}
    except Exception as e:
        logger.error(f"Failed to stop NIM: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import JSONResponse

@router.get("/")
async def list_nims():
    print("List NIMs endpoint hit")
    try:
        containers = container_manager.list_containers()
        print(f"Containers: {containers}")
        return JSONResponse(content=containers)
    except Exception as e:
        print(f"Error listing containers: {e}")
        raise HTTPException(status_code=500, detail="Failed to list NIM containers")

