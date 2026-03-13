"""
Agent Factory — loads specialist personas from /root/agency-agents/*.md
and executes them via the configured premium LLM provider.

Premium LLM is only called here — all orchestration (Supervisor/Director) uses Ollama.
"""
import os
import re
import httpx
from pathlib import Path
from core.cost_tracker import track

AGENTS_DIR = Path(os.getenv("AGENTS_DIR", "/root/agency-agents"))

PROVIDER    = os.getenv("SPECIALIST_PROVIDER", "ollama")   # ollama | openai | anthropic | groq
MODEL       = os.getenv("SPECIALIST_MODEL", "llama3.2:3b")
API_KEY     = os.getenv("SPECIALIST_API_KEY", "")
MAX_TOKENS  = int(os.getenv("SPECIALIST_MAX_TOKENS", "4096"))

AGENT_SLUG_MAP = {
    "software-architect":   "engineering/engineering-software-architect.md",
    "backend-architect":    "engineering/engineering-backend-architect.md",
    "database-optimizer":   "engineering/engineering-database-optimizer.md",
    "frontend-developer":   "engineering/engineering-frontend-developer.md",
    "senior-developer":     "engineering/engineering-senior-developer.md",
    "ui-designer":          "design/design-ui-designer.md",
    "ux-architect":         "design/design-ux-architect.md",
    "devops-automator":     "engineering/engineering-devops-automator.md",
    "security-engineer":    "engineering/engineering-security-engineer.md",
    "code-reviewer":        "engineering/engineering-code-reviewer.md",
    "sre":                  "engineering/engineering-sre.md",
}

# Cache loaded agent prompts so we only read files once
_agent_cache: dict[str, str] = {}


def _load_agent_prompt(slug: str) -> str:
    if slug in _agent_cache:
        return _agent_cache[slug]

    relative = AGENT_SLUG_MAP.get(slug)
    if not relative:
        return f"You are a {slug.replace('-', ' ')} specialist."

    path = AGENTS_DIR / relative
    if not path.exists():
        return f"You are a {slug.replace('-', ' ')} specialist."

    content = path.read_text(encoding="utf-8")
    stripped = _strip_md(content)
    _agent_cache[slug] = stripped
    return stripped


def _strip_md(content: str, max_chars: int = 3000) -> str:
    """Strip frontmatter, examples, templates. Keep identity + core mission + critical rules."""
    # Remove frontmatter
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3:].strip()

    # Remove code blocks (bloat)
    content = re.sub(r'```[\s\S]*?```', '', content)

    # Remove markdown tables
    content = re.sub(r'(\|.+\|\n)+', '', content)

    # Split into sections and drop heavy ones
    sections = re.split(r'\n(?=##+ )', content)
    kept = []
    total = 0
    drop_patterns = re.compile(
        r'^##+ .*(example|template|deliverable|sample|format|metric|case study|scenario)',
        re.IGNORECASE
    )
    for section in sections:
        first_line = section.splitlines()[0] if section.splitlines() else ""
        if drop_patterns.match(first_line):
            continue
        if total + len(section) <= max_chars:
            kept.append(section.strip())
            total += len(section)
        else:
            if not kept:
                kept.append(section[:max_chars])
            break

    return "\n\n".join(kept)


async def run(
    agent_slug: str,
    mission: str,
    context: str = "",
    revision_instruction: str = "",
) -> tuple[str, int, int]:
    """
    Execute an agent with its persona + mission.
    Returns: (output_text, input_tokens, output_tokens)
    Premium LLM is called here.
    """
    system_prompt = _load_agent_prompt(agent_slug)

    user_message = f"Your specific mission for this project:\n{mission}"
    if context:
        user_message += f"\n\nContext from previous agents (use this as foundation):\n{context}"
    if revision_instruction:
        user_message += f"\n\n⚠️ Director revision request: {revision_instruction}\nPlease address these specific points."

    if PROVIDER == "openai":
        output, in_t, out_t = await _call_openai(system_prompt, user_message)
    elif PROVIDER == "anthropic":
        output, in_t, out_t = await _call_anthropic(system_prompt, user_message)
    elif PROVIDER == "groq":
        output, in_t, out_t = await _call_groq(system_prompt, user_message)
    else:
        output, in_t, out_t = await _call_ollama(system_prompt, user_message)

    track(agent_slug, f"{PROVIDER}/{MODEL}", in_t, out_t)
    return output, in_t, out_t


async def _call_ollama(system: str, user: str) -> tuple[str, int, int]:
    prompt = f"System:\n{system}\n\nUser:\n{user}"
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post("http://localhost:11434/api/generate", json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"temperature": 0.3, "num_predict": MAX_TOKENS}
        })
        r.raise_for_status()
        data = r.json()
    output = data.get("response", "")
    in_t = data.get("prompt_eval_count", len(prompt.split()))
    out_t = data.get("eval_count", len(output.split()))
    return output, in_t, out_t


async def _call_openai(system: str, user: str) -> tuple[str, int, int]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "max_tokens": MAX_TOKENS,
                "temperature": 0.3,
            }
        )
        r.raise_for_status()
        data = r.json()
    output = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return output, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)


async def _call_anthropic(system: str, user: str) -> tuple[str, int, int]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": MODEL,
                "system": system,
                "messages": [{"role": "user", "content": user}],
                "max_tokens": MAX_TOKENS,
            }
        )
        r.raise_for_status()
        data = r.json()
    output = data["content"][0]["text"]
    usage = data.get("usage", {})
    return output, usage.get("input_tokens", 0), usage.get("output_tokens", 0)


async def _call_groq(system: str, user: str) -> tuple[str, int, int]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
            json={
                "model": MODEL,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
                "max_tokens": MAX_TOKENS,
                "temperature": 0.3,
            }
        )
        r.raise_for_status()
        data = r.json()
    output = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return output, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)

