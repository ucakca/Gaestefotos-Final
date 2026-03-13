from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core import database as db

router = APIRouter(prefix="/api/rules", tags=["rules"])

class RuleIn(BaseModel):
    name: str
    description: str = ""
    content: str
    scope: str = "global"
    agent_id: str | None = None
    enabled: bool = True
    priority: int = 0

@router.get("")
def list_rules(scope: str = None, agent_id: str = None):
    return db.rules_list(scope, agent_id)

@router.post("")
def create_rule(body: RuleIn):
    return db.rule_upsert(body.model_dump())

@router.put("/{rid}")
def update_rule(rid: str, body: RuleIn):
    data = body.model_dump()
    data["id"] = rid
    return db.rule_upsert(data)

@router.delete("/{rid}")
def delete_rule(rid: str):
    db.rule_delete(rid)
    return {"ok": True}

@router.patch("/{rid}/toggle")
def toggle_rule(rid: str):
    rules = db.rules_list()
    rule = next((r for r in rules if r["id"] == rid), None)
    if not rule:
        raise HTTPException(404)
    data = dict(rule)
    data["enabled"] = not bool(rule["enabled"])
    return db.rule_upsert(data)
