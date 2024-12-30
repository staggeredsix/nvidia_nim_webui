# app/services/database.py
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from ..models.benchmark import BenchmarkRun, MetricPoint
import json

class DatabaseService:
    def create_benchmark_run(self, db: Session, model_name: str, config: Dict[str, Any]) -> BenchmarkRun:
        run = BenchmarkRun(
            model_name=model_name,
            config=json.dumps(config),
            status="starting"
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    def get_benchmark_history(self, db: Session) -> List[Dict[str, Any]]:
        runs = db.query(BenchmarkRun).order_by(BenchmarkRun.start_time.desc()).all()
        return [self._format_benchmark_run(run) for run in runs]

    def _format_benchmark_run(self, run: BenchmarkRun) -> Dict[str, Any]:
        return {
            "id": run.id,
            "model_name": run.model_name,
            "status": run.status,
            "start_time": run.start_time.isoformat(),
            "end_time": run.end_time.isoformat() if run.end_time else None,
            "metrics": {
                "average_tps": run.average_tps,
                "peak_tps": run.peak_tps,
                "p95_latency": run.p95_latency,
                "time_to_first_token": run.time_to_first_token,
                "inter_token_latency": run.inter_token_latency
            }
        }

# app/services/container.py
import docker
import socket
import os
import json
from typing import Dict, Optional, List
from ..config import settings
from ..utils.logger import logger

class ContainerManager:
    def __init__(self):
        self._active_nim = None
        self.docker_client = docker.from_env()
    
    def save_nim(self, nim_info: Dict):
        with open(settings.NIM_FILE, "w") as f:
            f.write(json.dumps(nim_info))
    
    def load_nim(self) -> Optional[Dict]:
        if not os.path.exists(settings.NIM_FILE):
            return None
        with open(settings.NIM_FILE, "r") as f:
            return json.loads(f.read())

    async def start_container(self, image_name: str) -> Dict:
        if self._active_nim:
            raise RuntimeError("A NIM is already running. Stop it before starting another.")
        
        port = self._find_available_port()
        
        try:
            container = self.docker_client.containers.run(
                image_name,
                detach=True,
                remove=True,
                environment=[f"NGC_API_KEY={settings.NGC_API_KEY}"],
                ports={8000: port},
                device_requests=[
                    docker.types.DeviceRequest(
                        count=-1,
                        capabilities=[['gpu']]
                    )
                ],
                shm_size='16G'
            )

            container_info = {
                "container_id": container.id,
                "port": port,
                "url": f"http://localhost:{port}",
                "image_name": image_name
            }
            
            self._active_nim = container_info
            self.save_nim(container_info)
            return container_info

        except Exception as e:
            logger.error(f"Failed to start container: {e}")
            raise RuntimeError(f"Container error: {str(e)}")

    def _find_available_port(self) -> int:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('', 0))
        port = s.getsockname()[1]
        s.close()
        return port

# app/services/nim_pull.py
from typing import Dict
import docker
import threading
from queue import Queue
import asyncio
import json

class NimPullProgress:
    def __init__(self, image_name: str, progress_queues: Dict[str, Queue]):
        self.image_name = image_name
        self.queue = Queue()
        self.total_size = 0
        self.current_size = 0
        progress_queues[image_name] = self.queue

    def __call__(self, current: Dict):
        if 'total' in current:
            self.total_size = current['total']
        if 'current' in current:
            self.current_size = current['current']
        
        self.queue.put({
            'total_size': self.total_size,
            'current_size': self.current_size,
            'status': 'in_progress'
        })
