# app/services/benchmark.py
import json
import asyncio
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional
from ..utils.logger import logger
from ..services.container import container_manager
from ..utils.metrics import metrics_collector

class BenchmarkService:
    def __init__(self, benchmark_dir: str = "benchmarks"):
        self.benchmark_dir = Path(benchmark_dir)
        self.benchmark_dir.mkdir(exist_ok=True)
        self.current_benchmark_metrics = {}

    async def wait_for_nim_ready(self, nim_id: str, timeout: int = 60) -> bool:
        start_time = datetime.now()
        while (datetime.now() - start_time).seconds < timeout:
            nim_info = container_manager.load_nim()
            if not nim_info or nim_info["container_id"] != nim_id:
                logger.warning(f"NIM container {nim_id} not found or inactive.")
                return False
            if nim_info.get("status") == "ready":
                logger.info(f"NIM container {nim_id} is ready.")
                return True
            logger.debug(f"Waiting for NIM {nim_id} to be ready... ({timeout - (datetime.now() - start_time).seconds}s remaining)")
            await asyncio.sleep(1)
        logger.error(f"Timeout waiting for NIM container {nim_id} to be ready.")
        return False

    async def execute_nim_benchmark(self, config: Dict[str, Any], container_info: Dict[str, Any]) -> Dict[str, Any]:
        try:
            port = container_info['port']
            model_info = container_info['model_info']
            logger.info(f"Starting benchmark against {model_info['full_name']} on port {port}")

            success_count = 0
            total_tokens = 0
            total_latency = 0
            peak_tps = 0.0
            latencies = []
            start_time = datetime.now()
            gpu_metrics_history = []

            # Start metrics collection task
            async def collect_metrics():
                while True:
                    try:
                        metrics = metrics_collector.collect_metrics()
                        gpu_metrics_history.append(metrics)
                        await asyncio.sleep(1)  # Collect every second
                    except Exception as e:
                        logger.error(f"Metrics collection error: {e}")

            metrics_task = asyncio.create_task(collect_metrics())

            try:
                async with aiohttp.ClientSession() as session:
                    tasks = []
                    semaphore = asyncio.Semaphore(config['concurrency_level'])

                    async def make_request():
                        nonlocal success_count, total_tokens, total_latency, peak_tps
                        async with semaphore:
                            try:
                                req_start = datetime.now()
                                async with session.post(
                                    f"http://localhost:8000/v1/completions",
                                    json={
                                        "model": model_info['full_name'],
                                        "prompt": config['prompt'],
                                        "max_tokens": config.get('max_tokens', 50),
                                        "stream": config.get('stream', False)
                                    }
                                ) as response:
                                    if response.status != 200:
                                        logger.error(f"Request failed with status {response.status}")
                                        return

                                    if config.get('stream', False):
                                        chunks = []
                                        async for line in response.content:
                                            if line.startswith(b'data: '):
                                                try:
                                                    chunk = json.loads(line[6:])
                                                    if chunk.get('choices', [{}])[0].get('text'):
                                                        chunks.append(chunk['choices'][0]['text'])
                                                except json.JSONDecodeError:
                                                    continue
                                        tokens = len(''.join(chunks).split())
                                    else:
                                        data = await response.json()
                                        tokens = len(data.get("choices", [{}])[0].get("text", "").split())

                                    latency = (datetime.now() - req_start).total_seconds()
                                    success_count += 1
                                    total_tokens += tokens
                                    total_latency += latency
                                    latencies.append(latency)

                                    # Calculate current and peak TPS
                                    elapsed = (datetime.now() - start_time).total_seconds()
                                    current_tps = total_tokens / elapsed if elapsed > 0 else 0
                                    peak_tps = max(peak_tps, current_tps)

                                    # Update real-time metrics
                                    self.current_benchmark_metrics = {
                                        "tokens_per_second": current_tps,
                                        "peak_tps": peak_tps,
                                        "latency": sum(latencies) / len(latencies) if latencies else 0,
                                        "timestamp": datetime.now().isoformat(),
                                        "completed_requests": success_count,
                                        "total_requests": config['total_requests']
                                    }

                            except Exception as e:
                                logger.error(f"Request error: {str(e)}")

                    # Create and run concurrent requests
                    tasks = [make_request() for _ in range(config['total_requests'])]
                    await asyncio.gather(*tasks)

                if not latencies:
                    raise Exception("No successful requests completed")

                # Process GPU metrics
                if gpu_metrics_history:
                    avg_metrics = gpu_metrics_history[-1]  # Get latest metrics
                    gpu_metrics = [{
                        'gpu_utilization': gpu['gpu_utilization'],
                        'gpu_memory_used': gpu['gpu_memory_used'],
                        'gpu_temp': gpu['gpu_temp'],
                        'power_draw': gpu['power_draw']
                    } for gpu in avg_metrics['gpu_metrics']]
                    avg_power = avg_metrics['power_draw']
                else:
                    gpu_metrics = []
                    avg_power = 0

                tokens_per_watt = (total_tokens / total_latency) / avg_power if avg_power > 0 else 0

                # Calculate final metrics
                metrics = {
                    "tokens_per_second": total_tokens / total_latency if total_latency > 0 else 0,
                    "peak_tps": peak_tps,
                    "latency": sum(latencies) / len(latencies),
                    "p95_latency": sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0,
                    "time_to_first_token": min(latencies) if latencies else 0,
                    "inter_token_latency": (max(latencies) - min(latencies)) / len(latencies) if len(latencies) > 1 else 0,
                    "gpu_metrics": gpu_metrics,
                    "total_tokens": total_tokens,
                    "tokens_per_watt": tokens_per_watt,
                    "successful_requests": success_count,
                    "failed_requests": config['total_requests'] - success_count,
                    "model_name": model_info['full_name'],
                    "historical": [{
                        "timestamp": datetime.now().isoformat(),
                        "tokens_per_second": total_tokens / total_latency if total_latency > 0 else 0,
                        "latency": l
                    } for l in latencies]
                }

                logger.info(f"Benchmark complete: {success_count}/{config['total_requests']} requests successful")
                return metrics

            finally:
                metrics_task.cancel()
                try:
                    await metrics_task
                except asyncio.CancelledError:
                    pass

        except Exception as e:
            logger.error(f"Benchmark execution error: {str(e)}")
            raise

    async def create_benchmark(self, config: Dict[str, Any]) -> Dict[str, Any]:
        container_info = None
        try:
            container_info = await container_manager.start_container(
                config['nim_id'], 
                config.get('gpu_count', 1)
            )
            if not container_info:
                raise Exception("Failed to start NIM container")

            if not await self.wait_for_nim_ready(container_info['container_id']):
                raise RuntimeError("NIM container did not become ready")

            metrics = await self.execute_nim_benchmark(config, container_info)

            # Create safe filename from benchmark name
            safe_name = "".join(c for c in config['name'] if c.isalnum() or c in ('-', '_')).strip()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            benchmark_file = self.benchmark_dir / f"benchmark_{safe_name}_{timestamp}.json"

            run_data = {
                "id": len(self.get_benchmark_history()) + 1,
                "name": config['name'],
                "model_name": metrics['model_name'],
                "status": "completed",
                "start_time": datetime.now().isoformat(),
                "end_time": datetime.now().isoformat(),
                "config": config,
                "metrics": metrics
            }

            with open(benchmark_file, "w") as f:
                json.dump(run_data, f, indent=2)

            logger.info(f"Benchmark results saved to {benchmark_file}")
            return run_data

        except Exception as e:
            logger.error(f"Benchmark creation error: {str(e)}")
            raise
        finally:
            if container_info:
                try:
                    await container_manager.stop_container(container_info['container_id'])
                except Exception as e:
                    logger.error(f"Error stopping container: {str(e)}")

    def get_benchmark_history(self) -> List[Dict[str, Any]]:
        try:
            history = []
            for file_path in self.benchmark_dir.glob("benchmark_*.json"):
                try:
                    with open(file_path, "r") as f:
                        history.append(json.load(f))
                except json.JSONDecodeError:
                    logger.error(f"Error reading benchmark file: {file_path}")
                    continue
            return sorted(history, key=lambda x: x["id"], reverse=True)
        except Exception as e:
            logger.error(f"Error reading benchmark history: {e}")
            return []

benchmark_service = BenchmarkService()

__all__ = ['benchmark_service']