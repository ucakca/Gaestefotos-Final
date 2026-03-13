"""
Chat router — handles conversations and orchestration pipeline with SSE streaming.
Uses DB-stored agents, rules, memory, and settings.
"""
import json
import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from core import database as db, supervisor, director, agents as agent_runner, cost_tracker

router = APIRouter(prefix="/api/chat", tags=["chat"])


class RunRequest(BaseModel):
    conversation_id: str | None = None
    message: str
    mode: str = "auto"  # auto | single | agent_slug


class ConvUpdateIn(BaseModel):
    title: str | None = None
    pinned: bool | None = None


# ─── Conversations ────────────────────────────────────────────────────────────

@router.get("/conversations")
def list_conversations():
    return db.conv_list()

@router.post("/conversations")
def create_conversation():
    return db.conv_create()

@router.get("/conversations/{cid}")
def get_conversation(cid: str):
    return {"conversation": db.conv_list(), "messages": db.messages_get(cid)}

@router.get("/conversations/{cid}/messages")
def get_messages(cid: str):
    return db.messages_get(cid)

@router.patch("/conversations/{cid}")
def update_conversation(cid: str, body: ConvUpdateIn):
    kwargs = {k: v for k, v in body.model_dump().items() if v is not None}
    db.conv_update(cid, **kwargs)
    return {"ok": True}

@router.delete("/conversations/{cid}")
def delete_conversation(cid: str):
    db.conv_delete(cid)
    return {"ok": True}


# ─── Run orchestration ────────────────────────────────────────────────────────

@router.post("/run")
async def run_chat(body: RunRequest):
    cid = body.conversation_id
    if not cid:
        conv = db.conv_create(body.message[:60])
        cid = conv["id"]
    else:
        convs = db.conv_list()
        if not any(c["id"] == cid for c in convs):
            raise HTTPException(404, "Conversation not found")

    db.message_add(cid, "user", body.message)

    async def stream():
        session_id = str(uuid.uuid4())[:8]

        # Yield conversation_id first so client knows where to save
        yield {"event": "meta", "data": json.dumps({"conversation_id": cid, "session_id": session_id})}

        # Gather context: global rules + memory
        rules = db.rules_list(scope="global")
        active_rules = [r["content"] for r in rules if r["enabled"]]
        global_memory = db.memory_list(scope="global")
        memory_ctx = "\n".join(f"- {m['key']}: {m['value']}" for m in global_memory[:20])

        description = body.message
        if memory_ctx:
            description += f"\n\n[Global context from memory:\n{memory_ctx}]"
        if active_rules:
            description += f"\n\n[Active rules:\n" + "\n".join(active_rules[:3]) + "]"

        # Single agent mode
        if body.mode not in ("auto",) and body.mode != "auto":
            agent_slug = body.mode
            a = db.agent_get(agent_slug)
            if not a:
                yield {"event": "error", "data": json.dumps({"message": f"Agent '{agent_slug}' not found"})}
                return
            yield {"event": "agent", "data": json.dumps({"status": "working", "agent": agent_slug, "mission": body.message})}
            try:
                output, in_t, out_t = await _run_agent_from_db(a, body.message, "")
            except Exception as e:
                yield {"event": "error", "data": json.dumps({"message": str(e)})}
                return
            db.message_add(cid, "assistant", output, agent=agent_slug, meta={"tokens_in": in_t, "tokens_out": out_t})
            yield {"event": "agent", "data": json.dumps({"status": "done", "agent": agent_slug, "output": output, "tokens_in": in_t, "tokens_out": out_t})}
            cost = cost_tracker.get_session_cost(session_id)
            yield {"event": "done", "data": json.dumps({"conversation_id": cid, "total_cost_usd": round(cost, 5)})}
            return

        # Auto orchestration mode
        yield {"event": "supervisor", "data": json.dumps({"status": "analyzing", "message": "Analysiere Anforderungen..."})}

        try:
            plan = await supervisor.analyze(description)
        except Exception as e:
            yield {"event": "error", "data": json.dumps({"message": f"Supervisor: {e}"})}
            return

        db.message_add(cid, "system", json.dumps(plan), agent="supervisor",
                       meta={"type": "plan", "cost": 0})

        yield {"event": "supervisor", "data": json.dumps({
            "status": "plan_ready",
            "project_summary": plan.get("project_summary", ""),
            "complexity": plan.get("complexity", ""),
            "tasks": plan.get("tasks", []),
        })}

        yield {"event": "director", "data": json.dumps({"status": "validating", "message": "Validiere Plan..."})}
        try:
            validation = await director.validate_plan(plan)
        except Exception as e:
            validation = {"verdict": "approved", "issues": [str(e)]}

        yield {"event": "director", "data": json.dumps({
            "status": "plan_validated",
            "verdict": validation.get("verdict", "approved"),
            "issues": validation.get("issues", []),
        })}

        waves = supervisor.build_execution_order(plan["tasks"])
        execution_log = []
        project_summary = plan.get("project_summary", description[:100])

        for wave_idx, wave in enumerate(waves):
            yield {"event": "director", "data": json.dumps({
                "status": "wave_start", "wave": wave_idx + 1,
                "total_waves": len(waves), "agents": [t["agent"] for t in wave],
            })}

            for task in wave:
                agent_slug = task["agent"]
                mission = task["mission"]
                context = director.build_context_summary(execution_log)
                revision_count = 0
                revision_instruction = ""
                agent_output = ""

                # Look up agent in DB (fallback to file-based)
                db_agent = db.agent_get(agent_slug)

                while revision_count <= director.MAX_REVISIONS:
                    yield {"event": "agent", "data": json.dumps({
                        "status": "working", "agent": agent_slug,
                        "mission": mission, "attempt": revision_count + 1,
                    })}
                    try:
                        if db_agent and db_agent.get("system_prompt"):
                            output, in_t, out_t = await _run_agent_from_db(
                                db_agent, mission, context, revision_instruction)
                        else:
                            output, in_t, out_t = await agent_runner.run(
                                agent_slug, mission, context=context,
                                revision_instruction=revision_instruction)
                        agent_output = output
                    except Exception as e:
                        agent_output = f"[Error: {e}]"
                        in_t = out_t = 0
                        break

                    yield {"event": "agent", "data": json.dumps({
                        "status": "done", "agent": agent_slug, "output": agent_output,
                        "tokens_in": in_t, "tokens_out": out_t,
                    })}
                    db.message_add(cid, "assistant", agent_output, agent=agent_slug,
                                   meta={"tokens_in": in_t, "tokens_out": out_t, "mission": mission})

                    yield {"event": "director", "data": json.dumps({
                        "status": "reviewing", "agent": agent_slug,
                        "message": f"Überprüfe {agent_slug}..."
                    })}
                    try:
                        review = await director.review_output(
                            project_summary, agent_slug, mission,
                            agent_output, context, revision_count)
                    except Exception as e:
                        review = {"verdict": "approved", "score": 3, "issues": [], "revision_instruction": ""}

                    yield {"event": "director", "data": json.dumps({
                        "status": "review_result", "agent": agent_slug,
                        "verdict": review.get("verdict", "approved"),
                        "score": review.get("score", 3),
                        "issues": review.get("issues", []),
                    })}

                    if review.get("verdict") == "approved":
                        break
                    revision_instruction = review.get("revision_instruction", "")
                    revision_count += 1

                execution_log.append({"task_id": task["id"], "agent": agent_slug,
                                       "mission": mission, "output": agent_output, "revisions": revision_count})

        yield {"event": "director", "data": json.dumps({"status": "synthesizing", "message": "Erstelle Synthese..."})}
        try:
            synthesis = await director.synthesize(project_summary, execution_log)
        except Exception as e:
            synthesis = {"summary": str(e), "overall_quality": 3, "next_steps": []}

        cost = cost_tracker.get_session_cost(session_id)
        db.message_add(cid, "system", json.dumps(synthesis), agent="director",
                       meta={"type": "synthesis", "cost_usd": cost})

        yield {"event": "done", "data": json.dumps({
            "conversation_id": cid, "synthesis": synthesis,
            "total_cost_usd": round(cost, 5),
            "agents_used": [e["agent"] for e in execution_log],
        })}

    return EventSourceResponse(stream())


async def _run_agent_from_db(db_agent: dict, mission: str, context: str,
                              revision_instruction: str = "") -> tuple[str, int, int]:
    """Run an agent using its DB-stored system prompt + configured provider."""
    from core.database import setting_get, key_get_decrypted, keys_list
    import httpx, os

    system_prompt = db_agent.get("system_prompt", "")
    provider = db_agent.get("provider_override") or setting_get("specialist_provider", "ollama")
    model = db_agent.get("model_override") or setting_get("specialist_model", "llama3.2:3b")

    user_msg = f"Your mission: {mission}"
    if context:
        user_msg += f"\n\nContext from previous agents:\n{context}"
    if revision_instruction:
        user_msg += f"\n\n⚠️ Director: {revision_instruction}"

    # Get API key from DB
    api_key = ""
    all_keys = keys_list()
    active_key = next((k for k in all_keys if k["provider"] == provider and k["is_active"]), None)
    if active_key:
        api_key = key_get_decrypted(active_key["id"]) or ""

    if provider == "openai":
        return await agent_runner._call_openai.__wrapped__(system_prompt, user_msg) if hasattr(agent_runner._call_openai, '__wrapped__') else await _openai_call(system_prompt, user_msg, model, api_key)
    elif provider == "anthropic":
        return await _anthropic_call(system_prompt, user_msg, model, api_key)
    elif provider == "groq":
        return await _groq_call(system_prompt, user_msg, model, api_key)
    else:
        return await _ollama_call(system_prompt, user_msg, model)


async def _ollama_call(system: str, user: str, model: str) -> tuple[str, int, int]:
    import httpx
    prompt = f"System:\n{system}\n\nUser:\n{user}"
    async with httpx.AsyncClient(timeout=120.0) as c:
        r = await c.post("http://localhost:11434/api/generate",
                         json={"model": model, "prompt": prompt, "stream": False,
                               "options": {"temperature": 0.3, "num_predict": 4096}})
        r.raise_for_status()
        data = r.json()
    output = data.get("response", "")
    return output, data.get("prompt_eval_count", 0), data.get("eval_count", 0)


async def _openai_call(system: str, user: str, model: str, key: str) -> tuple[str, int, int]:
    import httpx
    async with httpx.AsyncClient(timeout=120.0) as c:
        r = await c.post("https://api.openai.com/v1/chat/completions",
                         headers={"Authorization": f"Bearer {key}"},
                         json={"model": model, "messages": [{"role": "system", "content": system},
                                                             {"role": "user", "content": user}],
                               "max_tokens": 4096, "temperature": 0.3})
        r.raise_for_status()
        data = r.json()
    output = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return output, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)


async def _anthropic_call(system: str, user: str, model: str, key: str) -> tuple[str, int, int]:
    import httpx
    async with httpx.AsyncClient(timeout=120.0) as c:
        r = await c.post("https://api.anthropic.com/v1/messages",
                         headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                         json={"model": model, "system": system,
                               "messages": [{"role": "user", "content": user}], "max_tokens": 4096})
        r.raise_for_status()
        data = r.json()
    output = data["content"][0]["text"]
    usage = data.get("usage", {})
    return output, usage.get("input_tokens", 0), usage.get("output_tokens", 0)


async def _groq_call(system: str, user: str, model: str, key: str) -> tuple[str, int, int]:
    import httpx
    async with httpx.AsyncClient(timeout=60.0) as c:
        r = await c.post("https://api.groq.com/openai/v1/chat/completions",
                         headers={"Authorization": f"Bearer {key}"},
                         json={"model": model, "messages": [{"role": "system", "content": system},
                                                             {"role": "user", "content": user}],
                               "max_tokens": 4096, "temperature": 0.3})
        r.raise_for_status()
        data = r.json()
    output = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})
    return output, usage.get("prompt_tokens", 0), usage.get("completion_tokens", 0)
