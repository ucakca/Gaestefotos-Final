from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core import database as db
import httpx

router = APIRouter(prefix="/api/keys", tags=["api-keys"])

class KeyIn(BaseModel):
    provider: str
    label: str = ""
    key_value: str = ""
    model_default: str = ""
    base_url: str = ""
    is_active: bool = True

@router.get("")
def list_keys():
    return db.keys_list()

@router.post("")
def create_key(body: KeyIn):
    if not body.key_value:
        raise HTTPException(400, "key_value is required")
    return db.key_upsert(body.model_dump())

@router.put("/{kid}")
def update_key(kid: str, body: KeyIn):
    data = body.model_dump()
    data["id"] = kid
    return db.key_upsert(data)

@router.delete("/{kid}")
def delete_key(kid: str):
    db.key_delete(kid)
    return {"ok": True}

@router.post("/{kid}/test")
async def test_key(kid: str):
    key = db.key_get_decrypted(kid)
    keys = db.keys_list()
    entry = next((k for k in keys if k["id"] == kid), None)
    if not entry:
        raise HTTPException(404)

    provider = entry["provider"]
    status = "error"
    message = ""

    try:
        if provider == "openai":
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get("https://api.openai.com/v1/models",
                                headers={"Authorization": f"Bearer {key}"})
                status = "ok" if r.status_code == 200 else "error"
                message = f"HTTP {r.status_code}"
        elif provider == "anthropic":
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.post("https://api.anthropic.com/v1/messages",
                                 headers={"x-api-key": key, "anthropic-version": "2023-06-01",
                                          "content-type": "application/json"},
                                 json={"model": entry.get("model_default") or "claude-3-haiku-20240307",
                                       "max_tokens": 1, "messages": [{"role": "user", "content": "hi"}]})
                status = "ok" if r.status_code in (200, 400) else "error"
                message = f"HTTP {r.status_code}"
        elif provider == "groq":
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get("https://api.groq.com/openai/v1/models",
                                headers={"Authorization": f"Bearer {key}"})
                status = "ok" if r.status_code == 200 else "error"
                message = f"HTTP {r.status_code}"
        elif provider == "ollama":
            base = entry.get("base_url") or "http://localhost:11434"
            async with httpx.AsyncClient(timeout=5) as c:
                r = await c.get(f"{base}/api/tags")
                status = "ok" if r.status_code == 200 else "error"
                models = [m["name"] for m in r.json().get("models", [])]
                message = f"{len(models)} models: {', '.join(models[:5])}"
    except Exception as e:
        status = "error"
        message = str(e)[:100]

    db.key_set_test_result(kid, status)
    return {"status": status, "message": message}
