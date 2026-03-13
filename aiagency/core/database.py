"""
SQLite database layer for Agency Orchestrator.
All persistent data: agents, rules, memory, api_keys, conversations, messages, settings.
"""
import sqlite3
import json
import uuid
import os
import base64
from datetime import datetime
from pathlib import Path
from contextlib import contextmanager

DB_PATH = os.getenv("DB_PATH", "/root/agency-orchestrator/agency.db")
_SECRET = os.getenv("AGENCY_SECRET", "agency-secret-key-change-me").encode()


def _xor(data: bytes) -> bytes:
    key = (_SECRET * (len(data) // len(_SECRET) + 1))[:len(data)]
    return bytes(a ^ b for a, b in zip(data, key))


def encrypt(value: str) -> str:
    return base64.b64encode(_xor(value.encode())).decode()


def decrypt(value: str) -> str:
    return _xor(base64.b64decode(value)).decode()


def mask_key(key: str) -> str:
    if len(key) < 8:
        return "****"
    return key[:6] + "..." + key[-4:]


@contextmanager
def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA foreign_keys=ON")
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def init():
    with conn() as c:
        c.executescript("""
        CREATE TABLE IF NOT EXISTS agents (
            id TEXT PRIMARY KEY,
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            system_prompt TEXT DEFAULT '',
            model_override TEXT,
            provider_override TEXT,
            enabled INTEGER DEFAULT 1,
            source TEXT DEFAULT 'custom',
            category TEXT DEFAULT 'engineering',
            color TEXT DEFAULT 'purple',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            content TEXT NOT NULL,
            scope TEXT DEFAULT 'global',
            agent_id TEXT REFERENCES agents(id) ON DELETE CASCADE,
            enabled INTEGER DEFAULT 1,
            priority INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS memory (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL,
            value TEXT NOT NULL,
            scope TEXT DEFAULT 'global',
            agent_id TEXT,
            session_id TEXT,
            tags TEXT DEFAULT '[]',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            label TEXT DEFAULT '',
            key_masked TEXT NOT NULL,
            key_encrypted TEXT NOT NULL,
            model_default TEXT DEFAULT '',
            base_url TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            last_tested TEXT,
            test_status TEXT DEFAULT 'untested',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT DEFAULT 'Neue Unterhaltung',
            pinned INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            agent TEXT DEFAULT '',
            content TEXT NOT NULL,
            meta TEXT DEFAULT '{}',
            created_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'general'
        );

        CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_memory_scope ON memory(scope, agent_id);
        CREATE INDEX IF NOT EXISTS idx_rules_scope ON rules(scope, enabled);
        """)
        _seed_defaults(c)


def _seed_defaults(c):
    defaults = [
        ("specialist_provider", "ollama", "LLM provider for specialist agents", "llm"),
        ("specialist_model", "llama3.2:3b", "Model for specialist agents", "llm"),
        ("supervisor_model", "llama3.2:3b", "Ollama model for supervisor/director (always free)", "llm"),
        ("max_revisions", "2", "Max revision cycles per agent", "orchestration"),
        ("max_agents_per_run", "8", "Max agents in a single orchestration", "orchestration"),
        ("stream_thinking", "true", "Show supervisor/director thinking in UI", "ui"),
        ("theme", "dark", "UI theme", "ui"),
    ]
    for key, value, desc, cat in defaults:
        c.execute(
            "INSERT OR IGNORE INTO settings(key, value, description, category) VALUES(?,?,?,?)",
            (key, value, desc, cat)
        )


# ─── Agents ──────────────────────────────────────────────────────────────────

def agent_list() -> list[dict]:
    with conn() as c:
        rows = c.execute("SELECT * FROM agents ORDER BY category, name").fetchall()
        return [dict(r) for r in rows]


def agent_get(slug: str) -> dict | None:
    with conn() as c:
        r = c.execute("SELECT * FROM agents WHERE slug=? OR id=?", (slug, slug)).fetchone()
        return dict(r) if r else None


def agent_upsert(data: dict) -> dict:
    now = datetime.utcnow().isoformat()
    aid = data.get("id") or str(uuid.uuid4())
    with conn() as c:
        c.execute("""
            INSERT INTO agents(id,slug,name,description,system_prompt,model_override,
                provider_override,enabled,source,category,color,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(slug) DO UPDATE SET
                name=excluded.name, description=excluded.description,
                system_prompt=excluded.system_prompt, model_override=excluded.model_override,
                provider_override=excluded.provider_override, enabled=excluded.enabled,
                category=excluded.category, color=excluded.color, updated_at=excluded.updated_at
        """, (aid, data["slug"], data["name"], data.get("description",""),
              data.get("system_prompt",""), data.get("model_override"),
              data.get("provider_override"), int(data.get("enabled", True)),
              data.get("source","custom"), data.get("category","engineering"),
              data.get("color","purple"), now, now))
    return agent_get(data["slug"])


def agent_delete(slug: str):
    with conn() as c:
        c.execute("DELETE FROM agents WHERE slug=? OR id=?", (slug, slug))


# ─── Rules ───────────────────────────────────────────────────────────────────

def rules_list(scope: str = None, agent_id: str = None) -> list[dict]:
    with conn() as c:
        if scope:
            rows = c.execute(
                "SELECT * FROM rules WHERE scope=? AND (agent_id=? OR agent_id IS NULL) ORDER BY priority DESC",
                (scope, agent_id)
            ).fetchall()
        else:
            rows = c.execute("SELECT * FROM rules ORDER BY scope, priority DESC").fetchall()
        return [dict(r) for r in rows]


def rule_upsert(data: dict) -> dict:
    rid = data.get("id") or str(uuid.uuid4())
    with conn() as c:
        c.execute("""
            INSERT INTO rules(id,name,description,content,scope,agent_id,enabled,priority)
            VALUES(?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
                name=excluded.name, description=excluded.description,
                content=excluded.content, scope=excluded.scope,
                agent_id=excluded.agent_id, enabled=excluded.enabled, priority=excluded.priority
        """, (rid, data["name"], data.get("description",""), data["content"],
              data.get("scope","global"), data.get("agent_id"), int(data.get("enabled",True)),
              data.get("priority",0)))
        return dict(c.execute("SELECT * FROM rules WHERE id=?", (rid,)).fetchone())


def rule_delete(rid: str):
    with conn() as c:
        c.execute("DELETE FROM rules WHERE id=?", (rid,))


# ─── Memory ──────────────────────────────────────────────────────────────────

def memory_list(scope: str = None, agent_id: str = None, search: str = None) -> list[dict]:
    with conn() as c:
        q = "SELECT * FROM memory WHERE 1=1"
        args = []
        if scope:
            q += " AND scope=?"; args.append(scope)
        if agent_id:
            q += " AND agent_id=?"; args.append(agent_id)
        if search:
            q += " AND (key LIKE ? OR value LIKE ?)"; args += [f"%{search}%", f"%{search}%"]
        q += " ORDER BY updated_at DESC"
        return [dict(r) for r in c.execute(q, args).fetchall()]


def memory_upsert(data: dict) -> dict:
    mid = data.get("id") or str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    tags = json.dumps(data.get("tags", []))
    with conn() as c:
        c.execute("""
            INSERT INTO memory(id,key,value,scope,agent_id,session_id,tags,created_at,updated_at)
            VALUES(?,?,?,?,?,?,?,?,?)
            ON CONFLICT(id) DO UPDATE SET
                key=excluded.key, value=excluded.value, scope=excluded.scope,
                agent_id=excluded.agent_id, tags=excluded.tags, updated_at=excluded.updated_at
        """, (mid, data["key"], data["value"], data.get("scope","global"),
              data.get("agent_id"), data.get("session_id"), tags, now, now))
        return dict(c.execute("SELECT * FROM memory WHERE id=?", (mid,)).fetchone())


def memory_delete(mid: str):
    with conn() as c:
        c.execute("DELETE FROM memory WHERE id=?", (mid,))


# ─── API Keys ─────────────────────────────────────────────────────────────────

def keys_list() -> list[dict]:
    with conn() as c:
        rows = c.execute("SELECT id,provider,label,key_masked,model_default,base_url,is_active,last_tested,test_status,created_at FROM api_keys ORDER BY provider").fetchall()
        return [dict(r) for r in rows]


def key_get_decrypted(kid: str) -> str | None:
    with conn() as c:
        r = c.execute("SELECT key_encrypted FROM api_keys WHERE id=?", (kid,)).fetchone()
        return decrypt(r[0]) if r else None


def key_upsert(data: dict) -> dict:
    kid = data.get("id") or str(uuid.uuid4())
    raw_key = data.get("key_value", "")
    masked = mask_key(raw_key) if raw_key else data.get("key_masked", "****")
    encrypted = encrypt(raw_key) if raw_key else ""

    with conn() as c:
        if raw_key:
            c.execute("""
                INSERT INTO api_keys(id,provider,label,key_masked,key_encrypted,model_default,base_url,is_active)
                VALUES(?,?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET
                    provider=excluded.provider, label=excluded.label,
                    key_masked=excluded.key_masked, key_encrypted=excluded.key_encrypted,
                    model_default=excluded.model_default, base_url=excluded.base_url,
                    is_active=excluded.is_active
            """, (kid, data["provider"], data.get("label",""), masked, encrypted,
                  data.get("model_default",""), data.get("base_url",""),
                  int(data.get("is_active", True))))
        else:
            c.execute("""
                UPDATE api_keys SET provider=?, label=?, model_default=?, base_url=?, is_active=?
                WHERE id=?
            """, (data["provider"], data.get("label",""), data.get("model_default",""),
                  data.get("base_url",""), int(data.get("is_active", True)), kid))
        r = c.execute("SELECT id,provider,label,key_masked,model_default,base_url,is_active,last_tested,test_status FROM api_keys WHERE id=?", (kid,)).fetchone()
        return dict(r)


def key_set_test_result(kid: str, status: str):
    now = datetime.utcnow().isoformat()
    with conn() as c:
        c.execute("UPDATE api_keys SET last_tested=?, test_status=? WHERE id=?", (now, status, kid))


def key_delete(kid: str):
    with conn() as c:
        c.execute("DELETE FROM api_keys WHERE id=?", (kid,))


# ─── Conversations & Messages ─────────────────────────────────────────────────

def conv_list() -> list[dict]:
    with conn() as c:
        rows = c.execute("""
            SELECT c.*, COUNT(m.id) as message_count
            FROM conversations c LEFT JOIN messages m ON m.conversation_id=c.id
            GROUP BY c.id ORDER BY c.pinned DESC, c.updated_at DESC
        """).fetchall()
        return [dict(r) for r in rows]


def conv_create(title: str = "Neue Unterhaltung") -> dict:
    cid = str(uuid.uuid4())[:8]
    now = datetime.utcnow().isoformat()
    with conn() as c:
        c.execute("INSERT INTO conversations(id,title,created_at,updated_at) VALUES(?,?,?,?)",
                  (cid, title, now, now))
        return dict(c.execute("SELECT * FROM conversations WHERE id=?", (cid,)).fetchone())


def conv_update(cid: str, **kwargs):
    fields = {k: v for k, v in kwargs.items() if k in ("title", "pinned")}
    if not fields:
        return
    sets = ", ".join(f"{k}=?" for k in fields)
    with conn() as c:
        c.execute(f"UPDATE conversations SET {sets}, updated_at=datetime('now') WHERE id=?",
                  (*fields.values(), cid))


def conv_delete(cid: str):
    with conn() as c:
        c.execute("DELETE FROM conversations WHERE id=?", (cid,))


def messages_get(cid: str) -> list[dict]:
    with conn() as c:
        rows = c.execute("SELECT * FROM messages WHERE conversation_id=? ORDER BY created_at", (cid,)).fetchall()
        result = []
        for r in rows:
            d = dict(r)
            try:
                d["meta"] = json.loads(d.get("meta") or "{}")
            except Exception:
                d["meta"] = {}
            result.append(d)
        return result


def message_add(cid: str, role: str, content: str, agent: str = "", meta: dict = None) -> dict:
    mid = str(uuid.uuid4())[:12]
    now = datetime.utcnow().isoformat()
    meta_str = json.dumps(meta or {})
    with conn() as c:
        c.execute("INSERT INTO messages(id,conversation_id,role,agent,content,meta,created_at) VALUES(?,?,?,?,?,?,?)",
                  (mid, cid, role, agent, content, meta_str, now))
        c.execute("UPDATE conversations SET updated_at=? WHERE id=?", (now, cid))
        return {"id": mid, "conversation_id": cid, "role": role, "agent": agent,
                "content": content, "meta": meta or {}, "created_at": now}


# ─── Settings ─────────────────────────────────────────────────────────────────

def settings_get_all() -> dict:
    with conn() as c:
        rows = c.execute("SELECT key, value, description, category FROM settings ORDER BY category, key").fetchall()
        return {r["key"]: {"value": r["value"], "description": r["description"], "category": r["category"]} for r in rows}


def setting_get(key: str, default: str = "") -> str:
    with conn() as c:
        r = c.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return r[0] if r else default


def setting_set(key: str, value: str):
    with conn() as c:
        c.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                  (key, value))
