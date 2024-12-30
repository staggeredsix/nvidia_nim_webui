# File: app/services/container.py
import docker
import socket
import os
import json
from typing import Dict, Optional
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

    def stop_container(self):
        if not self._active_nim:
            raise RuntimeError("No NIM is currently running.")

        try:
            container = self.docker_client.containers.get(self._active_nim["container_id"])
            container.stop()
            self._active_nim = None
            if os.path.exists(settings.NIM_FILE):
                os.remove(settings.NIM_FILE)
        except Exception as e:
            logger.error(f"Failed to stop container: {e}")
            raise RuntimeError(f"Container stop error: {str(e)}")

    def list_containers(self):
        return [self._active_nim] if self._active_nim else []

    def _find_available_port(self) -> int:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('', 0))
        port = s.getsockname()[1]
        s.close()
        return port
