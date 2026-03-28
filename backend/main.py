"""
FastAPI server for the Multi-Agent Travel Planner.
Exposes SSE endpoint for real-time agent orchestration updates.
"""

import os
import json
import time
import asyncio
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sse_starlette.sse import EventSourceResponse
from guardian_tap import attach_observer
from orchestrator import Orchestrator
from agent_runner import AgentRunner
from usage_logger import log_usage

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(title="Multi-Agent Travel Planner")
attach_observer(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
app.mount("/static", StaticFiles(directory=frontend_path), name="static")


@app.get("/", response_class=HTMLResponse)
async def serve_frontend():
    index_path = os.path.join(frontend_path, "index.html")
    with open(index_path) as f:
        return f.read()


@app.get("/dashboard", response_class=HTMLResponse)
async def serve_dashboard():
    """Serve the same single-page app (dashboard is now a tab)."""
    index_path = os.path.join(frontend_path, "index.html")
    with open(index_path) as f:
        return f.read()


@app.get("/api/config")
async def get_config():
    """Return Mapbox token to frontend."""
    return {"mapbox_token": os.getenv("MAPBOX_ACCESS_TOKEN", "")}


@app.get("/api/plan")
async def plan_trip(request: Request, query: str, api_key: str = None, provider: str = None):
    """
    SSE endpoint: takes a travel query, dynamically decomposes it,
    runs parallel agents, and streams progress back to the client.
    Accepts an optional user-provided API key and provider (openai, anthropic, gemini).
    """
    resolved_provider = provider or "openai"
    resolved_key = api_key or os.getenv("OPENAI_API_KEY")
    is_byok = bool(api_key)

    if not resolved_key:
        return {"error": "No API key available. Please provide an API key."}

    orchestrator = Orchestrator(api_key=resolved_key, provider=resolved_provider)
    runner = AgentRunner(orchestrator)
    start_time = time.time()

    async def event_generator():
        destination = None
        agents_count = 0
        success = True

        try:
            async for event_str in runner.run_parallel(query):
                event_data = json.loads(event_str)
                event_type = event_data["event"]
                data = event_data["data"]

                # Capture metadata for logging
                if event_type == "plan":
                    destination = data.get("destination", {}).get("name")
                    agents_count = len(data.get("tasks", []))

                yield {
                    "event": event_type,
                    "data": json.dumps(data),
                }
        except Exception:
            success = False
            raise
        finally:
            # Log usage asynchronously (fire and forget)
            elapsed_ms = round((time.time() - start_time) * 1000)
            asyncio.create_task(log_usage(
                request,
                endpoint="/api/plan",
                query=query,
                destination=destination,
                provider=resolved_provider,
                is_byok=is_byok,
                success=success,
                response_time_ms=elapsed_ms,
                agents_count=agents_count,
            ))

    return EventSourceResponse(event_generator())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
