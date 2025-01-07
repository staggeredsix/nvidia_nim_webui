# app/models/benchmark.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON
from .database import Base

class BenchmarkRun(Base):
    __tablename__ = "benchmark_runs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    model_name = Column(String, index=True)
    nim_id = Column(String, index=True)
    config = Column(JSON)
    status = Column(String, default="pending")
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime, nullable=True)
    
    total_requests = Column(Integer, default=0)
    successful_requests = Column(Integer, default=0)
    failed_requests = Column(Integer, default=0)
    total_tokens = Column(Integer, default=0)
    
    average_tps = Column(Float, default=0.0)
    peak_tps = Column(Float, default=0.0)
    p95_latency = Column(Float, default=0.0)
    time_to_first_token = Column(Float, default=0.0)
    inter_token_latency = Column(Float, default=0.0)
    
    average_gpu_utilization = Column(Float, default=0.0)
    peak_gpu_utilization = Column(Float, default=0.0)
    average_gpu_memory = Column(Float, default=0.0) 
    peak_gpu_memory = Column(Float, default=0.0)
    gpu_power_draw = Column(Float, default=0.0)

    @property
    def completion_percentage(self):
        if not self.total_requests:
            return 0
        return (self.successful_requests + self.failed_requests) / self.total_requests * 100

    @property
    def success_rate(self):
        if not self.total_requests:
            return 0
        return self.successful_requests / self.total_requests * 100
