"""
Advisor router — handles query and streaming WebSocket endpoints.
"""
import sys
import os
import json
import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Depends
from loguru import logger

# Add project root to path so we can import src.*
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.models import AdvisorRequest, AdvisorResponse
from backend.auth import get_current_user
from backend.db_models import User

router = APIRouter(prefix="/api/advisor", tags=["advisor"])


def _profile_to_dict(profile) -> Optional[dict]:
    if profile is None:
        return None
    return profile.model_dump()


@router.post("/query", response_model=AdvisorResponse)
async def query_advisor(request: AdvisorRequest, current_user: User = Depends(get_current_user)):
    """
    Run the full multi-agent finance advisor pipeline synchronously.
    Returns the complete AdvisorResponse when all agents have finished.
    """
    try:
        from src.graph.workflow import run_finance_advisor

        profile_dict = _profile_to_dict(request.user_profile)

        # Run in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        final_state = await loop.run_in_executor(
            None,
            lambda: run_finance_advisor(
                user_query=request.query,
                uploaded_pdfs=request.uploaded_pdfs,
                user_profile=profile_dict,
                stream=False,
            ),
        )

        return AdvisorResponse(
            summary=final_state.get("summary"),
            final_advice=final_state.get("final_advice"),
            research_output=final_state.get("research_output"),
            analysis_output=final_state.get("analysis_output"),
            execution_output=final_state.get("execution_output"),
            plan_output=final_state.get("plan_output"),
            disclaimer=final_state.get("disclaimer"),
            tool_results=final_state.get("tool_results"),
            messages=final_state.get("messages"),
        )

    except Exception as e:
        logger.exception("Error running finance advisor")
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/stream")
async def stream_advisor(websocket: WebSocket):
    """
    WebSocket endpoint for real-time streaming of agent updates.

    Client sends JSON: {"query": "...", "user_profile": {...}, "uploaded_pdfs": [...]}
    Server streams JSON events:
      {"agent": "researcher", "output": "...", "done": false}
      ...
      {"agent": "__final__", "state": {...}, "done": true}
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted")

    try:
        # Receive the request payload
        raw = await websocket.receive_text()
        payload = json.loads(raw)

        query = payload.get("query", "")
        user_profile = payload.get("user_profile", {})
        uploaded_pdfs = payload.get("uploaded_pdfs", [])

        if not query:
            await websocket.send_text(json.dumps({"error": "query is required", "done": True}))
            await websocket.close()
            return

        from src.graph.workflow import run_finance_advisor

        # Run streaming in a thread executor and relay events over WebSocket
        loop = asyncio.get_event_loop()
        queue: asyncio.Queue = asyncio.Queue()

        def _stream_to_queue():
            try:
                gen = run_finance_advisor(
                    user_query=query,
                    uploaded_pdfs=uploaded_pdfs,
                    user_profile=user_profile,
                    stream=True,
                )
                for node_name, state_update in gen:
                    asyncio.run_coroutine_threadsafe(
                        queue.put(("update", node_name, state_update)), loop
                    )
            except Exception as exc:
                asyncio.run_coroutine_threadsafe(
                    queue.put(("error", str(exc), None)), loop
                )
            finally:
                asyncio.run_coroutine_threadsafe(queue.put(("done", None, None)), loop)

        # Start streaming in background thread
        import threading
        thread = threading.Thread(target=_stream_to_queue, daemon=True)
        thread.start()

        # Relay messages from queue to WebSocket
        while True:
            item = await queue.get()
            kind = item[0]

            if kind == "error":
                await websocket.send_text(
                    json.dumps({"error": item[1], "done": True})
                )
                break

            if kind == "done":
                break

            # kind == "update"
            node_name = item[1]
            state_update = item[2]

            if node_name == "__final__":
                # Serialize the final state safely
                serializable_state = {}
                for k, v in state_update.items():
                    try:
                        json.dumps(v)
                        serializable_state[k] = v
                    except (TypeError, ValueError):
                        serializable_state[k] = str(v)

                await websocket.send_text(
                    json.dumps({"agent": "__final__", "state": serializable_state, "done": True})
                )
            else:
                # Extract meaningful output from state_update
                output = ""
                for field in ["research_output", "analysis_output", "execution_output",
                               "plan_output", "critic_output", "final_advice", "summary"]:
                    if state_update.get(field):
                        output = state_update[field]
                        break

                await websocket.send_text(
                    json.dumps({"agent": node_name, "output": output, "done": False})
                )

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception("WebSocket error")
        try:
            await websocket.send_text(json.dumps({"error": str(e), "done": True}))
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
