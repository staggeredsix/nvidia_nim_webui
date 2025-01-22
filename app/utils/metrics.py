# app/utils/metrics.py
import psutil
import subprocess
from typing import Dict
import json
from pathlib import Path

def get_gpu_metrics(gpu_index: int) -> Dict:
    try:
        result = subprocess.run(
            [
                'nvidia-smi',
                f'--id={gpu_index}',
                '--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw',
                '--format=csv,noheader,nounits'
            ],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            values = [v.strip() for v in result.stdout.strip().split(',')]
            return {
                'gpu_utilization': float(values[0]),
                'gpu_memory_used': float(values[1]) / 1024,
                'gpu_memory_total': float(values[2]) / 1024,
                'gpu_temp': float(values[3]),
                'power_draw': float(values[4])
            }
    except Exception as e:
        print(f"Error getting GPU {gpu_index} metrics: {e}")
    return {}

def collect_metrics() -> Dict:
    try:
        gpu_count = int(subprocess.check_output(
            ['nvidia-smi', '--query-gpu=gpu_name', '--format=csv,noheader'], 
            text=True
        ).count('\n'))
    except:
        gpu_count = 0

    gpu_metrics = [get_gpu_metrics(i) for i in range(gpu_count)]
    
    return {
        'type': 'metrics_update',
        'metrics': {
            'gpu_count': gpu_count,
            'gpu_metrics': gpu_metrics,
            'cpu_usage': psutil.cpu_percent(interval=None),
            'memory_used': psutil.virtual_memory().used / (1024**3),
            'memory_total': psutil.virtual_memory().total / (1024**3),
            'timestamp': int(psutil.time.time() * 1000)
        }
    }