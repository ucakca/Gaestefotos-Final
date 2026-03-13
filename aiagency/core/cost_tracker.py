"""
Cost tracker — logs token usage per agent call.
Ollama calls are free ($0). Premium LLM calls are tracked.
"""
import json
import time
import redis
from pathlib import Path

COSTS_PER_TOKEN = {
    "gpt-4o":           {"input": 2.50e-6,  "output": 10.00e-6},
    "gpt-4o-mini":      {"input": 0.15e-6,  "output": 0.60e-6},
    "gpt-4-turbo":      {"input": 10.00e-6, "output": 30.00e-6},
    "claude-3-5-sonnet":{"input": 3.00e-6,  "output": 15.00e-6},
    "claude-3-haiku":   {"input": 0.25e-6,  "output": 1.25e-6},
    "groq/llama3":      {"input": 0.05e-6,  "output": 0.08e-6},
    "ollama":           {"input": 0.0,       "output": 0.0},
}

_redis: redis.Redis | None = None

def _r() -> redis.Redis:
    global _redis
    if _redis is None:
        _redis = redis.Redis(host="localhost", decode_responses=True)
    return _redis


def track(agent: str, model: str, in_tokens: int, out_tokens: int, session_id: str = "global"):
    base_model = model.split("/")[-1].lower()
    rates = COSTS_PER_TOKEN.get(base_model, COSTS_PER_TOKEN.get("gpt-4o-mini"))
    cost = rates["input"] * in_tokens + rates["output"] * out_tokens

    try:
        r = _r()
        r.incrbyfloat(f"agency:costs:total", cost)
        r.incrbyfloat(f"agency:costs:session:{session_id}", cost)
        r.incrbyfloat(f"agency:costs:agent:{agent}", cost)
        r.incrby(f"agency:tokens:agent:{agent}:in", in_tokens)
        r.incrby(f"agency:tokens:agent:{agent}:out", out_tokens)
        r.rpush(f"agency:log:{session_id}", json.dumps({
            "ts": time.time(), "agent": agent, "model": model,
            "in": in_tokens, "out": out_tokens, "cost_usd": round(cost, 6)
        }))
    except Exception:
        pass  # Redis unavailable — continue without tracking

    label = "FREE" if cost == 0 else f"${cost:.5f}"
    print(f"  💰 [{agent}/{model}] {in_tokens}→{out_tokens} tokens = {label}")
    return cost


def get_session_cost(session_id: str) -> float:
    try:
        val = _r().get(f"agency:costs:session:{session_id}")
        return float(val) if val else 0.0
    except Exception:
        return 0.0


def get_total_cost() -> dict:
    try:
        r = _r()
        total = float(r.get("agency:costs:total") or 0)
        agents = {}
        for key in r.keys("agency:costs:agent:*"):
            agents[key.split(":")[-1]] = round(float(r.get(key) or 0), 6)
        return {"total_usd": round(total, 6), "by_agent": agents}
    except Exception:
        return {"total_usd": 0.0, "by_agent": {}}
