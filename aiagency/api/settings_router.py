from fastapi import APIRouter
from pydantic import BaseModel
from core import database as db

router = APIRouter(prefix="/api/settings", tags=["settings"])

class SettingIn(BaseModel):
    value: str

@router.get("")
def get_all():
    return db.settings_get_all()

@router.put("/{key}")
def set_setting(key: str, body: SettingIn):
    db.setting_set(key, body.value)
    return {"key": key, "value": body.value}

@router.put("")
def set_many(body: dict):
    for k, v in body.items():
        db.setting_set(k, str(v))
    return {"updated": list(body.keys())}
