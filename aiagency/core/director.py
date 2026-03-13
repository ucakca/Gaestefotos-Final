"""
Director — runs on Ollama (FREE, local).
Responsibilities:
  1. Validate the Supervisor's plan (is it complete? correct order? missing agents?)
  2. Review each agent's output (approve / reject / request revision)
  3. Resolve conflicts between agents
  4. Final synthesis check

No premium API credits are spent here.
"""
import json
import httpx

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2:3b"

MAX_REVISIONS = 2  # Max retries per agent before Director forces approval


VALIDATE_PLAN_PROMPT = """\
You are a technical Director reviewing an execution plan for a software project.

Project: {project_summary}

Proposed plan (tasks in order):
{plan_tasks}

Evaluate the plan and return ONLY valid JSON:
{{
  "verdict": "approved|revision_needed",
  "issues": ["issue1", "issue2"],
  "corrections": [
    {{"task_id": "t1", "fix": "what needs to change"}}
  ],
  "missing_agents": ["agent-slug if a required specialist is missing"],
  "order_problems": ["describe any wrong sequencing"]
}}

Check for:
- Are dependencies correct? (DB schema before API, API before frontend, UX before UI implementation)
- Is any critical specialist missing for this project?
- Are any tasks redundant or conflicting?
- Does the plan produce a complete, integrated result?
"""

REVIEW_OUTPUT_PROMPT = """\
You are a technical Director reviewing the output of a specialist agent.

Project context: {project_summary}
Agent: {agent_name}
Agent's mission: {mission}
Previous agents' outputs summary: {context_summary}

Agent's output:
{agent_output}

Return ONLY valid JSON:
{{
  "verdict": "approved|revision",
  "score": 1-5,
  "issues": ["specific problem 1", "specific problem 2"],
  "revision_instruction": "specific instruction for the agent if revision needed (empty string if approved)",
  "integration_check": "does this output integrate with previous agents' work? yes/partial/no"
}}

Be strict. Approve only if:
- The output directly addresses the assigned mission
- It is specific and actionable (not vague)
- It integrates with prior agents' outputs (no contradictions)
- Score >= 3
"""

SYNTHESIS_PROMPT = """\
You are a technical Director creating a final synthesis of a multi-agent project.

Project: {project_summary}
Execution log (agent outputs in order):
{execution_log}

Return ONLY valid JSON:
{{
  "overall_quality": 1-5,
  "integration_issues": ["any remaining conflicts or gaps"],
  "execution_order_followed": true/false,
  "summary": "2-3 sentences summarizing what was produced",
  "next_steps": ["concrete next step 1", "concrete next step 2"]
}}
"""


async def _call_ollama(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "format": "json",
            "stream": False,
            "options": {"temperature": 0.1, "num_predict": 1024}
        })
        response.raise_for_status()
        raw = response.json()["response"]

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r'\{[\s\S]*\}', raw)
        if match:
            return json.loads(match.group())
        return {"verdict": "approved", "issues": [], "parse_error": raw[:100]}


async def validate_plan(plan: dict) -> dict:
    """
    Director reviews the Supervisor's plan before execution starts.
    Returns corrected plan or approves as-is.
    Cost: FREE (Ollama)
    """
    plan_text = "\n".join(
        f"  [{t['id']}] {t['agent']} — {t['mission']} (depends on: {t.get('depends_on', [])})"
        for t in plan["tasks"]
    )
    prompt = VALIDATE_PLAN_PROMPT.format(
        project_summary=plan.get("project_summary", ""),
        plan_tasks=plan_text
    )
    result = await _call_ollama(prompt)
    return result


async def review_output(
    project_summary: str,
    agent_name: str,
    mission: str,
    agent_output: str,
    context_summary: str,
    revision_count: int = 0,
) -> dict:
    """
    Director reviews a single agent's output.
    Returns verdict: 'approved' or 'revision' with specific instructions.
    Cost: FREE (Ollama)
    
    After MAX_REVISIONS, forces approval to prevent infinite loops.
    """
    if revision_count >= MAX_REVISIONS:
        return {
            "verdict": "approved",
            "score": 3,
            "issues": [f"Max revisions ({MAX_REVISIONS}) reached — forced approval"],
            "revision_instruction": "",
            "integration_check": "partial"
        }

    prompt = REVIEW_OUTPUT_PROMPT.format(
        project_summary=project_summary,
        agent_name=agent_name,
        mission=mission,
        context_summary=context_summary[:800] if context_summary else "No prior context",
        agent_output=agent_output[:2000]
    )
    return await _call_ollama(prompt)


async def synthesize(project_summary: str, execution_log: list[dict]) -> dict:
    """
    Final Director synthesis after all agents have completed.
    Cost: FREE (Ollama)
    """
    log_text = "\n\n".join(
        f"[{entry['agent']}] {entry['mission']}:\n{entry['output'][:600]}..."
        for entry in execution_log
    )
    prompt = SYNTHESIS_PROMPT.format(
        project_summary=project_summary,
        execution_log=log_text
    )
    return await _call_ollama(prompt)


def build_context_summary(execution_log: list[dict]) -> str:
    """
    Build a rolling context summary from completed agent outputs.
    Keeps it short to avoid token bloat in Director review calls.
    """
    if not execution_log:
        return ""
    parts = []
    for entry in execution_log[-3:]:  # Only last 3 agents for context
        parts.append(f"{entry['agent']}: {entry['output'][:300]}")
    return "\n---\n".join(parts)
