"""
Agency Orchestrator — FastAPI backend (full platform)
"""
import os
import json
import uuid
from pathlib import Path
from dotenv import load_dotenv

from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

load_dotenv()

from core import database as db, cost_tracker
from api import agents_router, rules_router, memory_router, keys_router, chat_router, settings_router, studio_router

db.init()

API_KEY = os.getenv("AGENCY_API_KEY", "change-me")

app = FastAPI(title="Agency Orchestrator", version="2.0.0")
app.mount("/static", StaticFiles(directory="static"), name="static")


def verify_key(request: Request):
    key = request.headers.get("x-api-key") or request.query_params.get("api_key")
    if key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return key


app.include_router(agents_router.router)
app.include_router(rules_router.router)
app.include_router(memory_router.router)
app.include_router(keys_router.router)
app.include_router(chat_router.router)
app.include_router(settings_router.router)
app.include_router(studio_router.router)


# ─── System routes ───────────────────────────────────────────────────────────



@app.get("/", response_class=HTMLResponse)
async def index():
    return HTMLResponse(Path("static/app.html").read_text())


@app.get("/api/health")
async def health():
    import httpx
    ollama_ok = False
    ollama_models = []
    try:
        async with httpx.AsyncClient(timeout=3.0) as c:
            r = await c.get("http://localhost:11434/api/tags")
            ollama_ok = r.status_code == 200
            ollama_models = [m["name"] for m in r.json().get("models", [])]
    except Exception:
        pass
    return {"status": "ok", "ollama": ollama_ok, "ollama_models": ollama_models,
            "agents": len(db.agent_list()), "costs": cost_tracker.get_total_cost()}


@app.get("/api/costs")
async def get_costs():
    return JSONResponse(cost_tracker.get_total_cost())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=7000, reload=True)
