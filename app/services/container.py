# app/services/container.py
import os
import asyncio
import json
import docker
from docker.errors import APIError
from typing import Dict, List, Optional, Any
from ..config import settings
from ..utils.logger import logger

class ContainerManager:
    def __init__(self):
        self.client = docker.from_env()
        self._active_nim = None

    def list_containers(self) -> List[Dict[str, Any]]:
        """Lists all NIM-related containers and images."""
        try:
            # Get all containers, both running and stopped
            all_containers = self.client.containers.list(all=True)
            # Get all images
            all_images = self.client.images.list()
            
            nim_containers = []
            seen_images = set()  # Track which images we've already processed
            
            # First, process containers
            for container in all_containers:
                image_name = container.image.tags[0] if container.image.tags else container.image.id
                
                # Check if this is a NIM container either by label or image name
                is_nim = (
                    container.labels.get("com.nvidia.nim") == "true" or
                    any("nim" in tag.lower() for tag in container.image.tags) if container.image.tags else False
                )
                
                if is_nim:
                    seen_images.add(image_name)
                    container_info = {
                        "container_id": container.id,
                        "image_name": image_name,
                        "port": self._get_container_port(container),
                        "status": "running" if container.status == "running" else "stopped",
                        "is_container": True,
                        "health": self._check_container_health(container),
                        "labels": container.labels,
                        "tags": container.image.tags
                    }
                    logger.debug(f"Found NIM container: {container_info}")
                    nim_containers.append(container_info)
            
            # Then, process images that haven't been seen in containers
            for image in all_images:
                for tag in image.tags:
                    if "nim" in tag.lower() and tag not in seen_images:
                        image_info = {
                            "container_id": None,  # No container exists
                            "image_name": tag,
                            "port": None,
                            "status": "not_running",  # Image exists but no container
                            "is_container": False,
                            "health": {"healthy": False, "status": "no_container", "checks": []},
                            "labels": image.labels,
                            "tags": [tag]
                        }
                        logger.debug(f"Found NIM image: {image_info}")
                        nim_containers.append(image_info)
                        seen_images.add(tag)

            # Sort the list: running containers first, then stopped containers, then images
            nim_containers.sort(key=lambda x: (
                0 if x.get("status") == "running" else
                1 if x.get("status") == "stopped" else
                2
            ))

            return nim_containers

        except Exception as e:
            logger.error(f"Error listing containers: {e}")
            return []

    def _check_container_health(self, container) -> Dict[str, Any]:
        try:
            if container.status != "running":
                return {"healthy": False, "status": "not_running", "checks": []}

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

    def _get_container_port(self, container) -> Optional[int]:
        try:
            if container.status != "running":
                return None
                
            ports = container.ports.get('5000/tcp', [])
            if ports:
                return int(ports[0]['HostPort'])
            return None
        except (KeyError, IndexError, ValueError):
            return None

    async def pull_image(self, image_name: str, progress_dict: Dict):
        """Pull a Docker image with progress tracking"""
        try:
            # Update progress dict for status tracking
            progress_dict[image_name].update({
                "status": "pulling",
                "current_size": 0,
                "total_size": 0
            })
            
            # Pull the image with progress tracking
            for line in self.client.api.pull(image_name, stream=True, decode=True):
                if 'progressDetail' in line:
                    detail = line['progressDetail']
                    if 'current' in detail and 'total' in detail:
                        progress_dict[image_name].update({
                            "current_size": detail['current'],
                            "total_size": detail['total'],
                            "status": "downloading"
                        })
                
            # Update final status
            progress_dict[image_name]["status"] = "completed"
            
        except Exception as e:
            logger.error(f"Error pulling image: {e}")
            progress_dict[image_name].update({
                "status": "failed",
                "error": str(e)
            })
            raise

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
                "image_name": image_name,
                "port": self._get_container_port(container),
                "status": container.status,
                "is_container": True,
                "health": self._check_container_health(container)
            }

            self._active_nim = container_info
            self.save_nim(container_info)
            return container_info

        except Exception as e:
            logger.error(f"Failed to start container: {e}")
            raise RuntimeError(f"Container error: {str(e)}")

    async def stop_container(self, container_id: str):
        try:
            container = self.client.containers.get(container_id)
            container.stop()
            container.remove()
        except Exception as e:
            logger.error(f"Error stopping container: {e}")
            raise RuntimeError(f"Failed to stop container: {str(e)}")

    def save_nim(self, nim_info: Dict):
        """Save NIM information to a file"""
        try:
            with open(settings.NIM_FILE, "w") as f:
                json.dump(nim_info, f)
        except Exception as e:
            logger.error(f"Error saving NIM file: {e}")

    def load_nim(self) -> Optional[Dict]:
        """Load NIM information from file"""
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

# Create singleton instance
container_manager = ContainerManager()

# Export the instance
__all__ = ['container_manager']