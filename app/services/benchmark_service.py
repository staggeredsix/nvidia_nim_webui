# app/services/benchmark_service.py
import json
import os
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

from ..models.benchmark_telemetry import BenchmarkRun
from ..utils.logger import logger

BENCHMARK_FILE = "benchmark_history.json"

class BenchmarkService:
    def __init__(self, file_path: str = BENCHMARK_FILE):
        self.file_path = file_path
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        if not os.path.exists(self.file_path):
            with open(self.file_path, "w") as f:
                json.dump([], f)

    def _load_benchmarks(self) -> List[Dict[str, Any]]:
        try:
            with open(self.file_path, "r") as f:
                return json.load(f)
        except json.JSONDecodeError:
            logger.error(f"Error reading benchmark file {self.file_path}")
            return []

    def _save_benchmarks(self, benchmarks: List[Dict[str, Any]]):
        with open(self.file_path, "w") as f:
            json.dump(benchmarks, f, indent=2)

    def create_benchmark(self, config: Dict[str, Any]) -> BenchmarkRun:
        benchmarks = self._load_benchmarks()
        new_id = len(benchmarks) + 1
        
        run = BenchmarkRun(
            id=new_id,
            name=config.get("name", f"Benchmark {new_id}"),
            description=config.get("description"),
            model_name=config["model_name"],
            nim_id=config["nim_id"],
            config=config,
            status="running",
            start_time=datetime.utcnow()
        )
        
        benchmarks.append(run.to_dict())
        self._save_benchmarks(benchmarks)
        return run

    def get_benchmark(self, run_id: int) -> Optional[BenchmarkRun]:
        benchmarks = self._load_benchmarks()
        run_data = next((run for run in benchmarks if run["id"] == run_id), None)
        return BenchmarkRun.from_dict(run_data) if run_data else None

    def update_benchmark(self, run: BenchmarkRun):
        benchmarks = self._load_benchmarks()
        for i, benchmark in enumerate(benchmarks):
            if benchmark["id"] == run.id:
                benchmarks[i] = run.to_dict()
                break
        self._save_benchmarks(benchmarks)

    def get_benchmark_history(self) -> List[BenchmarkRun]:
        benchmarks = self._load_benchmarks()
        return [BenchmarkRun.from_dict(run) for run in benchmarks]

benchmark_service = BenchmarkService()