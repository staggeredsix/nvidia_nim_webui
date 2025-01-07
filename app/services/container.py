import os
import asyncio
import json
import docker
from docker.errors import APIError
from typing import Dict, List, Optional, Any
from ..config import settings
from ..utils.logger import logger

e = []

class ContainerManager:
    def __init__(self):
        self.client = docker.from_env()

    def list_containers(self) -> List[Dict[str, Any]]:
        try:
            containers = self.client.containers.list(
                filters={
                    "label": ["com.nvidia.nim=true"],
                    "status": ["running"]
                }
            )

            nim_containers = []
            for container in containers:
                health = self._check_container_health(container)
                if not health['healthy']:
                    continue

                nim_containers.append({
                    "container_id": container.id,
                    "image_name": self._extract_nim_name(container),
                    "port": self._get_container_port(container),
                    "status": container.status,
                    "health": health
                })

            return nim_containers

        except APIError as e:
            logger.error(f"Docker API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Error listing containers: {e}")
            return []

    def _check_container_health(self, container) -> Dict[str, Any]:
        try:
            health = container.attrs.get('State', {}).get('Health', {})
            status = health.get('Status', 'unknown')

            return {
                "healthy": status == "healthy",
                "status": status,
                "checks": health.get('Log', [])
            }
        except Exception as e:
            logger.error(f"Error checking container health: {e}")
            return {"healthy": False, "status": "unknown", "checks": []}

    async def start_container(self, image_name: str) -> Dict[str, Any]:
        try:
            container = self.client.containers.run(
                image_name,
                detach=True,
                remove=True,
                environment=[f"NGC_API_KEY={settings.NGC_API_KEY}"],
                labels={"com.nvidia.nim": "true", "com.nvidia.nim.image": image_name},
                ports={5000: None},
                device_requests=[
                    docker.types.DeviceRequest(count=-1, capabilities=[['gpu']])
                ],
                shm_size='16G'
            )

            await asyncio.sleep(2)  # Wait for container to initialize

            container_info = {
                "container_id": container.id,
                "image_name": self._extract_nim_name(container),
                "port": self._get_container_port(container),
                "status": container.status
            }

            self._active_nim = container_info
            self.save_nim(container_info)
            return container_info

        except Exception as e:
            logger.error(f"Failed to start container: {e}")
            raise RuntimeError(f"Container error: {str(e)}")

    def stop_container(self, container_id: str):
        try:
            container = self.client.containers.get(container_id)
            container.stop()
            container.remove()
        except Exception as e:
            logger.error(f"Error stopping container: {e}")
            raise RuntimeError(f"Failed to stop container: {str(e)}")

    def save_nim(self, nim_info: Dict):
        try:
            with open(settings.NIM_FILE, "w") as f:
                json.dump(nim_info, f)
        except Exception as e:
            logger.error(f"Error saving NIM file: {e}")

    def load_nim(self) -> Optional[Dict]:
        try:
            if not os.path.exists(settings.NIM_FILE):
                logger.warning(f"NIM file not found: {settings.NIM_FILE}")
                return None

            with open(settings.NIM_FILE, "r") as f:
                data = f.read().strip()
                if not data:
                    return None
                loaded_data = json.loads(data)
                logger.info(f"Loaded NIM data: {loaded_data}")
                return loaded_data

        except Exception as e:
            logger.error(f"Error loading NIM file: {e}")
            return None
