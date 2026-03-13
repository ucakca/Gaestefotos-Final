"""
Supervisor — runs on Ollama (FREE, local).
Responsibility: parse a project description, identify required departments,
create tasks with explicit dependencies, and output a structured plan.

No premium API credits are spent here.
"""
import json
import httpx
from pydantic import BaseModel

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"

AVAILABLE_AGENTS = {
    "software-architect":   "System design, architectural patterns, DDD, technical decisions, component boundaries",
    "backend-architect":    "API design, Node.js/Python backend, database schema, WebSockets, scalability, performance",
    "database-optimizer":   "SQL schema, indexes, query optimization, PostgreSQL, Redis, migrations",
    "frontend-developer":   "React, Next.js, Vue, TypeScript, components, browser, rendering, API integration",
    "senior-developer":     "Complex full-stack implementation, Laravel, Livewire, advanced CSS, Three.js",
    "ui-designer":          "Visual design system, component library, color, typography, spacing, pixel-perfect UI",
    "ux-architect":         "User flows, CSS architecture, accessibility, interaction design, layout systems",
    "devops-automator":     "CI/CD, Docker, nginx, deployment, infrastructure, systemd, server automation",
    "security-engineer":    "Auth, vulnerabilities, OWASP, permissions, secrets management, threat modeling",
    "code-reviewer":        "Code quality, correctness, maintainability, security review, best practices",
    "sre":                  "Monitoring, alerting, SLOs, reliability, incident response, observability",
}

SUPERVISOR_PROMPT = """\
You are a technical project supervisor. Analyze the project description and create a structured execution plan.

Available agents and their specialties:
{agents}

Project description:
{description}

Output ONLY valid JSON (no markdown, no explanation):
{{
  "project_summary": "one sentence",
  "complexity": "simple|medium|complex",
  "tasks": [
    {{
      "id": "t1",
      "agent": "agent-slug-from-list",
      "mission": "specific task for this agent",
      "depends_on": [],
      "rationale": "why this agent for this task"
    }}
  ]
}}

Rules:
- Use ONLY agents from the provided list (exact slug)
- depends_on contains task IDs that MUST complete before this task starts
- Order tasks by logical dependency (schema before API, API before frontend, UX before visual design)
- Do NOT create tasks without a clear dependency rationale
- Keep missions specific and actionable, not vague
- For simple tasks: 1-2 agents. Medium: 3-4. Complex: 5+.
"""


async def analyze(description: str) -> dict:
    """
    Calls Ollama to parse the project and return a structured task plan.
    Returns: { project_summary, complexity, tasks: [{id, agent, mission, depends_on, rationale}] }
    """
    agent_list = "\n".join(f"  - {slug}: {desc}" for slug, desc in AVAILABLE_AGENTS.items())
    prompt = SUPERVISOR_PROMPT.format(agents=agent_list, description=description)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 2048}
        })
        response.raise_for_status()
        raw = response.json()["response"]

    try:
        plan = json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r'\{[\s\S]*\}', raw)
        if match:
            plan = json.loads(match.group())
        else:
            raise ValueError(f"Supervisor returned invalid JSON: {raw[:200]}")

    _validate_plan(plan)
    return plan


def _validate_plan(plan: dict):
    """Basic sanity checks on the supervisor's output."""
    if "tasks" not in plan or not plan["tasks"]:
        raise ValueError("Supervisor returned empty task list")

    valid_agents = set(AVAILABLE_AGENTS.keys())
    task_ids = {t["id"] for t in plan["tasks"]}

    for task in plan["tasks"]:
        if task.get("agent") not in valid_agents:
            task["agent"] = _fuzzy_match_agent(task.get("agent", ""), valid_agents)
        for dep in task.get("depends_on", []):
            if dep not in task_ids:
                task["depends_on"] = [d for d in task["depends_on"] if d in task_ids]


def _fuzzy_match_agent(name: str, valid: set) -> str:
    """Fallback: find closest agent name if Ollama hallucinated a slug."""
    name_lower = name.lower()
    for agent in valid:
        if any(part in name_lower for part in agent.split("-")):
            return agent
    return "backend-architect"


def build_execution_order(tasks: list[dict]) -> list[list[dict]]:
    """
    Topological sort → returns tasks grouped into execution waves.
    Wave 0 = no dependencies (can start immediately).
    Wave 1 = depends on wave 0, etc.
    Tasks within the same wave CAN run in parallel (if desired).
    """
    task_map = {t["id"]: t for t in tasks}
    remaining = {t["id"]: set(t.get("depends_on", [])) for t in tasks}
    waves = []

    while remaining:
        # Tasks with all dependencies satisfied
        ready = [tid for tid, deps in remaining.items() if len(deps) == 0]
        if not ready:
            # Circular dependency guard — force remaining tasks
            ready = list(remaining.keys())[:1]

        wave = [task_map[tid] for tid in ready]
        waves.append(wave)

        for tid in ready:
            del remaining[tid]
        for deps in remaining.values():
            deps -= set(ready)

    return waves
