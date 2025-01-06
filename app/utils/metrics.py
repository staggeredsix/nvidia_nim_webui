import time
import GPUtil

# Track state for metrics calculations
state = {
    "token_count": 0,
    "start_time": None,
    "first_token_time": None,
    "last_token_time": None,
    "token_timestamps": []
}


def update_metrics(new_tokens):
    current_time = time.time()
    state["token_count"] += new_tokens
    
    if state["start_time"] is None:
        state["start_time"] = current_time

    if state["first_token_time"] is None and new_tokens > 0:
        state["first_token_time"] = current_time

    state["last_token_time"] = current_time
    state["token_timestamps"].append(current_time)


def calculate_tokens_per_second():
    if state["start_time"] is None or state["last_token_time"] is None:
        return 0

    elapsed_time = state["last_token_time"] - state["start_time"]
    return state["token_count"] / elapsed_time if elapsed_time > 0 else 0


def calculate_time_to_first_token():
    if state["start_time"] is None or state["first_token_time"] is None:
        return None

    return state["first_token_time"] - state["start_time"]


def calculate_inter_token_latency():
    if len(state["token_timestamps"]) < 2:
        return None

    intervals = [
        state["token_timestamps"][i] - state["token_timestamps"][i - 1]
        for i in range(1, len(state["token_timestamps"]))
    ]
    return sum(intervals) / len(intervals) if intervals else None


def calculate_power_efficiency():
    gpu = GPUtil.getGPUs()[0] if GPUtil.getGPUs() else None

    if gpu and state["token_count"] > 0:
        return gpu.powerDraw / calculate_tokens_per_second()

    return None


def collect_metrics():
    gpu = GPUtil.getGPUs()[0] if GPUtil.getGPUs() else None

    return {
        "tokens_per_second": calculate_tokens_per_second(),
        "time_to_first_token": calculate_time_to_first_token(),
        "inter_token_latency": calculate_inter_token_latency(),
        "power_efficiency": calculate_power_efficiency(),
        "gpu_utilization": gpu.load * 100 if gpu else 0,
        "gpu_memory": gpu.memoryUsed if gpu else 0,
        "gpu_temp": gpu.temperature if gpu else 0,
        "timestamp": time.time()
    }
