# app/models/benchmark_telemetry.py
from datetime import datetime
from typing import Dict, Any, Optional

class BenchmarkRun:
    def __init__(
        self,
        id: int,
        name: str,
        description: Optional[str],
        model_name: str,
        nim_id: str,
        config: Dict[str, Any],
        status: str = "pending",
        start_time: Optional[datetime] = None,
    ):
        self.id = id
        self.name = name
        self.description = description
        self.model_name = model_name
        self.nim_id = nim_id
        self.config = config
        self.status = status
        self.start_time = start_time or datetime.utcnow()
        self.end_time = None
        
        # Performance metrics
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.total_tokens = 0
        
        self.average_tps = 0.0
        self.peak_tps = 0.0
        self.p95_latency = 0.0
        self.time_to_first_token = 0.0
        self.inter_token_latency = 0.0
        
        self.average_gpu_utilization = 0.0
        self.peak_gpu_utilization = 0.0
        self.average_gpu_memory = 0.0
        self.peak_gpu_memory = 0.0
        self.gpu_power_draw = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "model_name": self.model_name,
            "nim_id": self.nim_id,
            "config": self.config,
            "status": self.status,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "metrics": {
                "total_requests": self.total_requests,
                "successful_requests": self.successful_requests,
                "failed_requests": self.failed_requests,
                "total_tokens": self.total_tokens,
                "average_tps": self.average_tps,
                "peak_tps": self.peak_tps,
                "p95_latency": self.p95_latency,
                "time_to_first_token": self.time_to_first_token,
                "inter_token_latency": self.inter_token_latency,
                "average_gpu_utilization": self.average_gpu_utilization,
                "peak_gpu_utilization": self.peak_gpu_utilization,
                "average_gpu_memory": self.average_gpu_memory,
                "peak_gpu_memory": self.peak_gpu_memory,
                "gpu_power_draw": self.gpu_power_draw
            }
        }

    @staticmethod
    def from_dict(data: Dict[str, Any]) -> 'BenchmarkRun':
        run = BenchmarkRun(
            id=data["id"],
            name=data["name"],
            description=data.get("description"),
            model_name=data["model_name"],
            nim_id=data["nim_id"],
            config=data["config"],
            status=data["status"],
            start_time=datetime.fromisoformat(data["start_time"])
        )
        
        if data.get("end_time"):
            run.end_time = datetime.fromisoformat(data["end_time"])
            
        metrics = data.get("metrics", {})
        for key, value in metrics.items():
            setattr(run, key, value)
            
        return run