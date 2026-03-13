from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core import database as db

router = APIRouter(prefix="/api/memory", tags=["memory"])

class MemoryIn(BaseModel):
    key: str
    value: str
    scope: str = "global"
    agent_id: str | None = None
    session_id: str | None = None
    tags: list[str] = []

@router.get("")
def list_memory(scope: str = None, agent_id: str = None, search: str = None):
    return db.memory_list(scope, agent_id, search)

@router.post("")
def create_memory(body: MemoryIn):
    return db.memory_upsert(body.model_dump())

@router.put("/{mid}")
def update_memory(mid: str, body: MemoryIn):
    data = body.model_dump()
    data["id"] = mid
    return db.memory_upsert(data)

@router.delete("/{mid}")
def delete_memory(mid: str):
    db.memory_delete(mid)
    return {"ok": True}

@router.delete("")
def clear_memory(scope: str = "global", agent_id: str = None):
    items = db.memory_list(scope, agent_id)
    for item in items:
        db.memory_delete(item["id"])
    return {"deleted": len(items)}
