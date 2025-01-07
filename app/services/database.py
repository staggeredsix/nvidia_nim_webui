# app/services/database.py
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.benchmark_telemetry import BenchmarkRun, MetricPoint

import json

from .database_config import SessionLocal

def get_db():
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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

