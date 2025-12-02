from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List

from app.services.model_setup import model_setup_service

router = APIRouter()


class NgcSetupRequest(BaseModel):
    source: str = Field(..., description="NGC model path, e.g. nvidia/llama2_70b:1.0")
    model_name: str = Field(..., description="Local name for the downloaded model")
    backends: List[str] = Field(
        default_factory=lambda: ["llama.cpp", "ollama", "sglang", "vllm"],
        description="Backends to prepare the model for",
    )
    overwrite: bool = Field(False, description="Replace any existing model directory with the same name")


@router.post("/ngc")
async def setup_ngc_model(request: NgcSetupRequest):
    try:
        return await model_setup_service.setup_ngc_model(
            request.source,
            request.model_name,
            request.backends,
            request.overwrite,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
