import asyncio
import json
import os
import shutil
from pathlib import Path
from typing import Any, Dict, List

from app.utils.logger import logger
from app.utils.ngc_key_helper import retrieve_key


class ModelSetupService:
    def __init__(self, base_dir: str = "models"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def _run_ngc_download(self, source: str, dest: Path) -> Dict[str, str]:
        ngc_key = retrieve_key()
        if not ngc_key:
            raise RuntimeError("NGC API key is not set. Please add it through the WebUI before downloading models.")

        ngc_path = shutil.which("ngc")
        if not ngc_path:
            raise RuntimeError("ngc CLI is not installed or not on PATH. Please install it before preparing models.")

        env = os.environ.copy()
        env["NGC_API_KEY"] = ngc_key
        dest.mkdir(parents=True, exist_ok=True)

        cmd = [
            ngc_path,
            "registry",
            "model",
            "download-version",
            source,
            "--dest",
            str(dest),
        ]

        logger.info(f"Downloading {source} into {dest} via NGC CLI")
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(
                f"ngc download failed with code {process.returncode}: {stderr.decode().strip() or stdout.decode().strip()}"
            )

        return {"stdout": stdout.decode(), "stderr": stderr.decode()}

    def _link_download_into_backends(self, download_root: Path, target_root: Path, backends: List[str]) -> Dict[str, Dict[str, str]]:
        backend_configs: Dict[str, Dict[str, str]] = {}
        for backend in backends:
            backend_dir = target_root / backend
            backend_dir.mkdir(parents=True, exist_ok=True)

            for item in download_root.iterdir():
                target_path = backend_dir / item.name
                if target_path.exists():
                    continue
                try:
                    if item.is_dir():
                        target_path.symlink_to(item, target_is_directory=True)
                    else:
                        target_path.symlink_to(item)
                except OSError:
                    # Fall back to copying if symlinks are not permitted
                    if item.is_dir():
                        shutil.copytree(item, target_path, dirs_exist_ok=True)
                    else:
                        shutil.copy2(item, target_path)

            backend_configs[backend] = {
                "model_dir": str(backend_dir),
                "launch_example": self._launch_example(backend, backend_dir),
            }
        return backend_configs

    def _launch_example(self, backend: str, model_dir: Path) -> str:
        if backend == "llama.cpp":
            return f"./llama-server -m {model_dir}/model.gguf --port 8000"
        if backend == "ollama":
            return f"OLLAMA_MODELS={model_dir} ollama serve"
        if backend == "sglang":
            return f"python -m sglang.launch_server --model-path {model_dir} --port 8000"
        if backend == "vllm":
            return f"python -m vllm.entrypoints.openai.api_server --model {model_dir} --port 8000"
        return ""

    async def setup_ngc_model(
        self,
        source: str,
        model_name: str,
        backends: List[str],
        overwrite: bool = False,
    ) -> Dict[str, Any]:
        target_root = self.base_dir / model_name
        if target_root.exists() and not overwrite:
            raise RuntimeError(
                f"Model directory {target_root} already exists. Re-run with overwrite=true to replace it."
            )

        if target_root.exists() and overwrite:
            shutil.rmtree(target_root)
        target_root.mkdir(parents=True, exist_ok=True)

        download_dir = target_root / "download"
        download_result = await self._run_ngc_download(source, download_dir)

        downloaded_entries = list(download_dir.iterdir())
        if not downloaded_entries:
            raise RuntimeError("NGC download completed but no files were found in the destination directory.")

        # Pick the deepest directory that contains the payload
        if len(downloaded_entries) == 1 and downloaded_entries[0].is_dir():
            download_root = downloaded_entries[0]
        else:
            download_root = download_dir

        backend_configs = self._link_download_into_backends(download_root, target_root, backends)

        manifest = {
            "source": source,
            "model_name": model_name,
            "download_root": str(download_root),
            "backends": backend_configs,
        }
        with open(target_root / "manifest.json", "w") as f:
            json.dump(manifest, f, indent=2)

        logger.info(f"Prepared {model_name} for backends {backends} at {target_root}")
        return {
            "model_name": model_name,
            "target_root": str(target_root),
            "download": download_result,
            "backends": backend_configs,
        }


model_setup_service = ModelSetupService()

__all__ = ["model_setup_service", "ModelSetupService"]
