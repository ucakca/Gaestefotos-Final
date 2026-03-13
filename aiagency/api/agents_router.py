from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pathlib import Path
import re, os
from core import database as db

router = APIRouter(prefix="/api/agents", tags=["agents"])

AGENTS_DIR = Path(os.getenv("AGENTS_DIR", "/root/agency-agents"))

class AgentIn(BaseModel):
    slug: str
    name: str
    description: str = ""
    system_prompt: str = ""
    model_override: str | None = None
    provider_override: str | None = None
    enabled: bool = True
    source: str = "custom"
    category: str = "engineering"
    color: str = "purple"

@router.get("")
def list_agents():
    return db.agent_list()

@router.get("/from-files")
def agents_from_files():
    """Scan /root/agency-agents/ and return all .md files as importable agents."""
    results = []
    for md in sorted(AGENTS_DIR.rglob("*.md")):
        if md.parent.name in ("scripts", "integrations", "examples", "docs"):
            continue
        content = md.read_text(encoding="utf-8", errors="ignore")
        name, description = _parse_frontmatter(content)
        slug = md.stem
        category = md.parent.name
        results.append({
            "slug": slug, "name": name, "description": description,
            "category": category, "file": str(md.relative_to(AGENTS_DIR)),
            "already_imported": db.agent_get(slug) is not None
        })
    return results

@router.post("/import-from-file")
def import_from_file(data: dict):
    """Import a specific .md file as an agent into the DB."""
    file_path = AGENTS_DIR / data["file"]
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    content = file_path.read_text(encoding="utf-8", errors="ignore")
    name, description = _parse_frontmatter(content)
    slug = file_path.stem
    category = file_path.parent.name
    system_prompt = _strip_for_db(content)
    return db.agent_upsert({
        "slug": slug, "name": name, "description": description,
        "system_prompt": system_prompt, "category": category,
        "source": "agency-agents", "enabled": True, "color": "blue"
    })

@router.post("/import-all")
def import_all():
    """Import all .md agents from agency-agents directory."""
    imported = []
    for md in sorted(AGENTS_DIR.rglob("*.md")):
        if md.parent.name in ("scripts", "integrations", "examples", "docs"):
            continue
        content = md.read_text(encoding="utf-8", errors="ignore")
        name, desc = _parse_frontmatter(content)
        slug = md.stem
        db.agent_upsert({
            "slug": slug, "name": name, "description": desc,
            "system_prompt": _strip_for_db(content),
            "category": md.parent.name, "source": "agency-agents",
            "enabled": True, "color": "blue"
        })
        imported.append(slug)
    return {"imported": len(imported), "slugs": imported}

@router.get("/{slug}")
def get_agent(slug: str):
    a = db.agent_get(slug)
    if not a:
        raise HTTPException(404, "Agent not found")
    return a

@router.post("")
def create_agent(body: AgentIn):
    return db.agent_upsert(body.model_dump())

@router.put("/{slug}")
def update_agent(slug: str, body: AgentIn):
    existing = db.agent_get(slug)
    if not existing:
        raise HTTPException(404, "Agent not found")
    data = body.model_dump()
    data["id"] = existing["id"]
    return db.agent_upsert(data)

@router.delete("/{slug}")
def delete_agent(slug: str):
    db.agent_delete(slug)
    return {"ok": True}

@router.patch("/{slug}/toggle")
def toggle_agent(slug: str):
    a = db.agent_get(slug)
    if not a:
        raise HTTPException(404)
    data = dict(a)
    data["enabled"] = not bool(a["enabled"])
    return db.agent_upsert(data)


def _parse_frontmatter(content: str) -> tuple[str, str]:
    name, description = "", ""
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            fm = content[3:end]
            for line in fm.splitlines():
                if line.startswith("name:"):
                    name = line.split(":", 1)[1].strip()
                elif line.startswith("description:"):
                    description = line.split(":", 1)[1].strip()
    if not name:
        for line in content.splitlines():
            if line.startswith("# "):
                name = line.lstrip("# ").strip(); break
    if not name:
        name = "Unknown Agent"
    return name, description[:200]


def _strip_for_db(content: str, max_chars: int = 4000) -> str:
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3:].strip()
    content = re.sub(r'```[\s\S]*?```', '', content)
    content = re.sub(r'(\|.+\|\n)+', '', content)
    sections = re.split(r'\n(?=##+ )', content)
    drop = re.compile(r'^##+ .*(example|template|deliverable|sample|format|metric)', re.I)
    kept, total = [], 0
    for s in sections:
        if drop.match(s.splitlines()[0] if s.splitlines() else ""):
            continue
        if total + len(s) < max_chars:
            kept.append(s.strip()); total += len(s)
    return "\n\n".join(kept)
