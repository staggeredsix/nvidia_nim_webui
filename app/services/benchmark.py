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
            provider_name = config.get("provider", container_info.get("provider", "nim"))
            port = container_info.get('port', 8000)
            model_info = container_info.get('model_info', {
                'full_name': config.get('model_name', 'unknown')
            })
            endpoint_override = config.get("endpoint") or container_info.get("endpoint")
            endpoint_base = endpoint_override or f"http://localhost:{port}"
            quantization = config.get("quantization", "default")

            logger.info(
                f"Starting benchmark against {model_info['full_name']} on {provider_name}"
                f" at {endpoint_base} with quantization={quantization}"
            )

            success_count = 0
            total_tokens = 0
            total_latency = 0
            peak_tps = 0.0
            latencies = []
            start_time = datetime.now()
            gpu_metrics_history = []

            # Aggregate latency measurements
            time_to_first_token_samples: List[float] = []
            inter_token_latency_samples: List[float] = []
            completion_time_samples: List[float] = []
            prefill_latency_samples: List[float] = []
            tool_call_latency_samples: List[float] = []
            accuracy_samples: List[float] = []

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
                                first_token_time: Optional[datetime] = None
                                last_token_time: Optional[datetime] = None
                                token_timestamps: List[datetime] = []
                                tool_call_latency: Optional[float] = None

                                payload = {
                                    "model": model_info['full_name'],
                                    "prompt": config['prompt'],
                                    "max_tokens": config.get('max_tokens', 50),
                                    "stream": config.get('stream', False)
                                }

                                async with session.post(
                                    f"{endpoint_base}/v1/completions",
                                    json=payload
                                ) as response:
                                    if response.status != 200:
                                        logger.error(f"Request failed with status {response.status}")
                                        return

                                    completion_text = ""
                                    if config.get('stream', False):
                                        chunks = []
                                        async for line in response.content:
                                            if line.startswith(b'data: '):
                                                now = datetime.now()
                                                if not first_token_time:
                                                    first_token_time = now
                                                token_timestamps.append(now)
                                                try:
                                                    chunk = json.loads(line[6:])
                                                    choice = chunk.get('choices', [{}])[0]
                                                    if choice.get('text'):
                                                        chunks.append(choice['text'])
                                                    if choice.get('tool_calls'):
                                                        tool_call_latency = (now - req_start).total_seconds()
                                                except json.JSONDecodeError:
                                                    continue
                                        completion_text = ''.join(chunks)
                                        tokens = len(completion_text.split())
                                    else:
                                        data = await response.json()
                                        now = datetime.now()
                                        first_token_time = now
                                        token_timestamps.append(now)
                                        choice = data.get("choices", [{}])[0]
                                        completion_text = choice.get("text", "")
                                        tokens = len(completion_text.split())
                                        if choice.get('tool_calls'):
                                            tool_call_latency = (now - req_start).total_seconds()

                                    latency = (datetime.now() - req_start).total_seconds()
                                    success_count += 1
                                    total_tokens += tokens
                                    total_latency += latency
                                    latencies.append(latency)

                                    completion_time_samples.append(latency)
                                    if first_token_time:
                                        ttft = (first_token_time - req_start).total_seconds()
                                        time_to_first_token_samples.append(ttft)
                                        prefill_latency_samples.append(ttft)
                                    if len(token_timestamps) > 1:
                                        deltas = [
                                            (token_timestamps[i] - token_timestamps[i - 1]).total_seconds()
                                            for i in range(1, len(token_timestamps))
                                        ]
                                        inter_token_latency_samples.extend(deltas)
                                        last_token_time = token_timestamps[-1]
                                    else:
                                        last_token_time = token_timestamps[0] if token_timestamps else None

                                    if tool_call_latency is not None:
                                        tool_call_latency_samples.append(tool_call_latency)

                                    if config.get("expected_output"):
                                        accuracy_samples.append(
                                            1.0 if completion_text.strip() == config["expected_output"].strip() else 0.0
                                        )

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
                                        "total_requests": config['total_requests'],
                                        "provider": provider_name,
                                        "quantization": quantization
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
                        'gpu_utilization': gpu.get('gpu_utilization', 0),
                        'gpu_memory_used': gpu.get('gpu_memory_used', 0),
                        'gpu_memory_total': gpu.get('gpu_memory_total', 0),
                        'gpu_temp': gpu.get('gpu_temp', 0),
                        'power_draw': gpu.get('power_draw', 0)
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
                    "time_to_first_token": sum(time_to_first_token_samples) / len(time_to_first_token_samples)
                    if time_to_first_token_samples else 0,
                    "inter_token_latency": sum(inter_token_latency_samples) / len(inter_token_latency_samples)
                    if inter_token_latency_samples else 0,
                    "prefill_latency": sum(prefill_latency_samples) / len(prefill_latency_samples)
                    if prefill_latency_samples else 0,
                    "total_completion_time": sum(completion_time_samples) / len(completion_time_samples)
                    if completion_time_samples else 0,
                    "tool_call_latency": sum(tool_call_latency_samples) / len(tool_call_latency_samples)
                    if tool_call_latency_samples else 0,
                    "tool_call_accuracy": sum(accuracy_samples) / len(accuracy_samples) if accuracy_samples else None,
                    "gpu_metrics": gpu_metrics,
                    "total_tokens": total_tokens,
                    "tokens_per_watt": tokens_per_watt,
                    "successful_requests": success_count,
                    "failed_requests": config['total_requests'] - success_count,
                    "model_name": model_info['full_name'],
                    "provider": provider_name,
                    "quantization": quantization,
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
        external_provider = config.get("provider") and not config.get("nim_id")
        try:
            if not external_provider:
                container_info = await container_manager.start_container(
                    config['nim_id'],
                    config.get('gpu_count', 1)
                )
                if not container_info:
                    raise Exception("Failed to start NIM container")

                if not await self.wait_for_nim_ready(container_info['container_id']):
                    raise RuntimeError("NIM container did not become ready")
            else:
                container_info = {
                    "container_id": None,
                    "image_name": config.get("provider", "external"),
                    "port": config.get("port", 8000),
                    "status": "ready",
                    "is_container": False,
                    "health": {"healthy": True, "status": "external", "checks": []},
                    "model_info": {"full_name": config.get("model_name", config.get("provider", "external"))},
                    "endpoint": config.get("endpoint"),
                    "provider": config.get("provider", "external")
                }

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

            if container_info and container_info.get('container_id'):
                run_data["container_id"] = container_info['container_id']

            with open(benchmark_file, "w") as f:
                json.dump(run_data, f, indent=2)

            logger.info(f"Benchmark results saved to {benchmark_file}")
            return run_data

        except Exception as e:
            logger.error(f"Benchmark creation error: {str(e)}")
            raise
        finally:
            if container_info and container_info.get('container_id'):
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

    def get_benchmark(self, run_id: int) -> Optional[Dict[str, Any]]:
        try:
            for file_path in self.benchmark_dir.glob("benchmark_*.json"):
                with open(file_path, "r") as f:
                    run = json.load(f)
                    if run.get("id") == run_id:
                        return run
            return None
        except Exception as e:
            logger.error(f"Error retrieving benchmark {run_id}: {e}")
            return None

benchmark_service = BenchmarkService()

__all__ = ['benchmark_service']