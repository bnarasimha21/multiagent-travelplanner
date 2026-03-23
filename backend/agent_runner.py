"""
Parallel Agent Runner
Executes multiple agents concurrently and streams status updates via SSE.
"""

import asyncio
import time
import json
from typing import AsyncGenerator
from orchestrator import Orchestrator


class AgentRunner:
    def __init__(self, orchestrator: Orchestrator):
        self.orchestrator = orchestrator

    async def run_parallel(self, user_query: str) -> AsyncGenerator[str, None]:
        """
        Main execution pipeline:
        1. Orchestrator decomposes query into tasks
        2. All tasks run in parallel
        3. Results are aggregated into final itinerary

        Yields SSE events at each stage for real-time UI updates.
        """
        total_start = time.time()

        # Phase 1: Decompose the query
        yield self._sse_event("phase", {"phase": "decomposing", "message": "Analyzing your query..."})

        decompose_start = time.time()
        plan = await self.orchestrator.decompose_query(user_query)
        decompose_time = time.time() - decompose_start

        tasks = plan["tasks"]
        destination = plan.get("destination", {"name": "Unknown", "lat": 0, "lng": 0})

        yield self._sse_event("plan", {
            "analysis": plan["analysis"],
            "destination": destination,
            "tasks": [
                {"id": t["id"], "name": t["name"], "reason": t["reason"], "category": t["category"]}
                for t in tasks
            ],
            "decompose_time_ms": round(decompose_time * 1000),
        })

        # Phase 2: Run all agents in parallel
        yield self._sse_event("phase", {"phase": "executing", "message": f"Spawning {len(tasks)} parallel agents..."})

        # Mark all agents as started
        for task in tasks:
            yield self._sse_event("agent_start", {"task_id": task["id"], "name": task["name"]})

        # Execute all agents concurrently
        parallel_start = time.time()
        agent_results = await self._run_agents_parallel(tasks)
        parallel_time = time.time() - parallel_start

        # Also measure what sequential would have been
        sequential_time_ms = sum(r["execution_time_ms"] for r in agent_results)
        parallel_time_ms = round(parallel_time * 1000)

        # Send individual agent completion events
        for result in agent_results:
            yield self._sse_event("agent_complete", {
                "task_id": result["task_id"],
                "task_name": result["task_name"],
                "execution_time_ms": result["execution_time_ms"],
                "summary": result.get("summary", ""),
                "recommendation_count": len(result.get("recommendations", [])),
            })

        yield self._sse_event("timing", {
            "parallel_time_ms": parallel_time_ms,
            "sequential_time_ms": sequential_time_ms,
            "speedup_factor": round(sequential_time_ms / max(parallel_time_ms, 1), 2),
            "agents_count": len(tasks),
        })

        # Phase 3: Aggregate results
        yield self._sse_event("phase", {"phase": "aggregating", "message": "Combining results into your itinerary..."})

        aggregate_start = time.time()
        itinerary = await self.orchestrator.aggregate_results(user_query, agent_results, destination)
        aggregate_time = round((time.time() - aggregate_start) * 1000)

        total_time = round((time.time() - total_start) * 1000)

        # Collect all map markers from agent results
        all_markers = []
        for result in agent_results:
            for rec in result.get("recommendations", []):
                if rec.get("lat") and rec.get("lng"):
                    all_markers.append({
                        "name": rec["name"],
                        "description": rec.get("description", ""),
                        "lat": rec["lat"],
                        "lng": rec["lng"],
                        "category": rec.get("category", result.get("category", "general")),
                        "cost_estimate": rec.get("cost_estimate", ""),
                    })

        # Phase 4: Send final result
        yield self._sse_event("result", {
            "itinerary": itinerary,
            "destination": destination,
            "markers": all_markers,
            "timing": {
                "decompose_ms": round(decompose_time * 1000),
                "parallel_execution_ms": parallel_time_ms,
                "sequential_equivalent_ms": sequential_time_ms,
                "aggregation_ms": aggregate_time,
                "total_ms": total_time,
                "speedup_factor": round(sequential_time_ms / max(parallel_time_ms, 1), 2),
            },
        })

        yield self._sse_event("done", {})

    async def _run_agents_parallel(self, tasks: list[dict]) -> list[dict]:
        """Run all agent tasks concurrently using asyncio.gather."""

        async def _run_single(task):
            start = time.time()
            result = await self.orchestrator.run_agent(task)
            result["execution_time_ms"] = round((time.time() - start) * 1000)
            return result

        results = await asyncio.gather(*[_run_single(t) for t in tasks])
        return list(results)

    @staticmethod
    def _sse_event(event_type: str, data: dict) -> str:
        """Format a Server-Sent Event."""
        return json.dumps({"event": event_type, "data": data})
