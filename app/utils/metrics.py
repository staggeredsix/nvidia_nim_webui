import psutil
import subprocess
from typing import Dict, List
from datetime import datetime
import time
from ..utils.logger import logger

class MetricsCollector:
    def __init__(self):
        self.peak_tps = 0.0
        self.peak_gpu_util = 0.0
        self.peak_gpu_mem = 0.0
        self.tokens_count = 0
        self.tokens_last_window = 0
        self.last_update = time.time()
        self.historical_metrics: List[Dict] = []

    def get_gpu_metrics(self, gpu_index: int) -> Dict:
        try:
            result = subprocess.run([
                'nvidia-smi',
                f'--id={gpu_index}',
                '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,clocks.sm',
                '--format=csv,nounits'
            ], capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                values = [v.strip() for v in result.stdout.strip().split(',')]
                metrics = {
                    'gpu_utilization': float(values[0]),
                    'gpu_memory_used': float(values[1]) / 1024,
                    'gpu_memory_total': float(values[2]) / 1024,
                    'gpu_temp': float(values[3]),
                    'power_draw': float(values[4]),
                    'sm_clock': float(values[5])
                }
                self.peak_gpu_util = max(self.peak_gpu_util, metrics['gpu_utilization'])
                self.peak_gpu_mem = max(self.peak_gpu_mem, metrics['gpu_memory_used'])
                return metrics
        except Exception as e:
            logger.error(f"GPU {gpu_index} metrics error: {e}")
        return {}

    def calculate_tps(self) -> float:
        current_time = time.time()
        window_size = current_time - self.last_update
        if window_size > 0:
            tps = (self.tokens_count - self.tokens_last_window) / window_size
            self.tokens_last_window = self.tokens_count
            self.last_update = current_time
            self.peak_tps = max(self.peak_tps, tps)
            return tps
        return 0.0

    def collect_metrics(self) -> Dict:
        try:
            gpu_count = int(subprocess.check_output(
                ['nvidia-smi', '--query-gpu=gpu_name', '--format=csv,noheader'], 
                text=True
            ).count('\n'))
        except:
            gpu_count = 0

        gpu_metrics = [self.get_gpu_metrics(i) for i in range(gpu_count)]
        current_tps = self.calculate_tps()
        
        if gpu_metrics:
            avg_util = sum(gpu['gpu_utilization'] for gpu in gpu_metrics) / len(gpu_metrics)
            avg_mem = sum(gpu['gpu_memory_used'] for gpu in gpu_metrics) / len(gpu_metrics)
            avg_power = sum(gpu['power_draw'] for gpu in gpu_metrics) / len(gpu_metrics)
        else:
            avg_util = avg_mem = avg_power = 0

        metrics = {
            'timestamp': datetime.now().isoformat(),
            'gpu_count': gpu_count,
            'gpu_metrics': gpu_metrics,
            'cpu_usage': psutil.cpu_percent(interval=1),
            'memory_used': psutil.virtual_memory().used / (1024**3),
            'memory_total': psutil.virtual_memory().total / (1024**3),
            'tokens_per_second': current_tps,
            'peak_tps': self.peak_tps,
            'avg_gpu_utilization': avg_util,
            'peak_gpu_util': self.peak_gpu_util,
            'avg_gpu_memory': avg_mem,
            'peak_gpu_mem': self.peak_gpu_mem,
            'power_draw': avg_power,
            'tokens_per_watt': current_tps / avg_power if avg_power > 0 else 0
        }

        # Keep last 60 seconds of history
        self.historical_metrics.append(metrics)
        if len(self.historical_metrics) > 60:
            self.historical_metrics.pop(0)

        metrics['historical_metrics'] = self.historical_metrics
        return metrics

    def record_tokens(self, count: int):
        self.tokens_count += count
        logger.debug(f"Tokens recorded: {count}, Total: {self.tokens_count}")

    def reset_peaks(self):
        self.peak_tps = 0.0
        self.peak_gpu_util = 0.0
        self.peak_gpu_mem = 0.0
        self.tokens_count = 0
        self.tokens_last_window = 0
        self.last_update = time.time()
        self.historical_metrics.clear()

metrics_collector = MetricsCollector()

def collect_metrics() -> Dict:
    return metrics_collector.collect_metrics()

def record_tokens(count: int):
    metrics_collector.record_tokens(count)