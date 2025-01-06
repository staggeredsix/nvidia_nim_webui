import os
import asyncio
import json
import docker
from typing import Dict, List, Optional, Any
from ..config import settings
from ..utils.logger import logger
e = []
class ContainerManager:
   def __init__(self):
       self.client = docker.from_env()
       self._active_nim = self.load_nim()

   def list_containers(self) -> List[Dict[str, Any]]:
    try:
        # Debug containers list
        all_containers = self.client.containers.list()
        logger.info(f"All containers: {all_containers}")
        
        nim_containers = [c for c in all_containers if 'com.nvidia.nim' in c.labels]
        logger.info(f"NIM containers: {nim_containers}")
        
        return [{
            "container_id": c.id,
            "image_name": self._extract_nim_name(c),
            "port": self._get_container_port(c),
            "status": c.status
        } for c in nim_containers]
    except Exception as e:
        logger.error(f"Error in list_containers: {e}")
        return []

   def _extract_nim_name(self, container: docker.models.containers.Container) -> str:
       try:
           image_name = container.labels.get("com.nvidia.nim.image", "")
           if not image_name:
               image_name = container.image.tags[0] if container.image.tags else "unknown"
           
           if "/" in image_name:
               return image_name.split("/")[-1].replace(':latest', '')
           return image_name.replace(':latest', '')
       except Exception as e:
           logger.error(f"Error extracting NIM name: {e}")
           return "unknown"

   def _get_container_port(self, container: docker.models.containers.Container) -> Optional[int]:
       try:
           ports = container.attrs["NetworkSettings"]["Ports"]
           if "5000/tcp" in ports and ports["5000/tcp"]:
               return int(ports["5000/tcp"][0]["HostPort"])
           return None
       except (KeyError, IndexError, ValueError) as e:
           logger.error(f"Error getting container port: {e}")
           return None

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