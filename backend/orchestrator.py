"""
Dynamic Task Orchestrator
Analyzes user queries and intelligently decides what sub-agents to spawn.
No pre-defined agents - everything is determined at runtime by the LLM.
"""

import json
from llm_provider import chat_complete

DECOMPOSITION_PROMPT = """You are an intelligent travel planning orchestrator.
Given a user's travel query, you must analyze it and break it down into independent research tasks
that can be executed IN PARALLEL by separate agents.

IMPORTANT RULES:
1. Only create tasks that are ACTUALLY needed based on the query
2. Each task must be INDEPENDENT (can run without results from other tasks)
3. Be smart about what tasks to create - a weekend trip needs fewer tasks than a 2-week international trip
4. Each task's prompt must be self-contained with all context needed

For each task, provide:
- id: unique identifier
- name: human-readable name (e.g., "Flight Research", "Hotel Finder")
- reason: WHY you decided this task is needed (reference specific parts of the user's query)
- prompt: the detailed prompt to give to the research agent
- category: one of [flights, hotels, restaurants, attractions, weather, visa, transportation, budget, safety, culture, packing, family, accessibility]

You MUST respond with valid JSON in this exact format:
{
  "analysis": "Brief analysis of what the user needs",
  "destination": {"name": "city/country", "lat": 0.0, "lng": 0.0},
  "tasks": [
    {
      "id": "task_1",
      "name": "Task Name",
      "reason": "Why this task is needed",
      "prompt": "Detailed research prompt...",
      "category": "category_name"
    }
  ]
}
"""

AGENT_SYSTEM_PROMPT = """You are a specialized travel research agent. Research the given topic thoroughly
and return structured, actionable information.

You MUST respond with valid JSON in this exact format:
{
  "summary": "2-3 sentence summary of findings",
  "details": ["detail 1", "detail 2", ...],
  "recommendations": [
    {
      "name": "Place/Item name",
      "description": "Why this is recommended",
      "lat": 0.0,
      "lng": 0.0,
      "cost_estimate": "$XX",
      "category": "the category"
    }
  ],
  "estimated_cost_usd": 0,
  "tips": ["tip 1", "tip 2"]
}

IMPORTANT: For recommendations, always include realistic lat/lng coordinates for the destination.
If you don't know exact coordinates, provide approximate ones for the neighborhood/area.
Return 3-5 recommendations with accurate geographic coordinates."""

AGGREGATOR_PROMPT = """You are a travel itinerary aggregator. You receive research results from multiple
parallel agents and must combine them into a coherent, day-by-day travel itinerary.

Create a well-organized itinerary that:
1. Arranges activities logically by day and geography (nearby things on the same day)
2. Includes practical details (costs, timings, tips)
3. Highlights the best recommendations from each research area

Respond with valid JSON:
{
  "title": "Trip title",
  "summary": "Overall trip summary",
  "total_estimated_cost_usd": 0,
  "days": [
    {
      "day": 1,
      "title": "Day theme",
      "activities": [
        {
          "time": "09:00",
          "name": "Activity name",
          "description": "What to do",
          "location": {"name": "Place", "lat": 0.0, "lng": 0.0},
          "cost_estimate": "$XX",
          "category": "category"
        }
      ]
    }
  ],
  "key_tips": ["tip 1", "tip 2"],
  "packing_suggestions": ["item 1", "item 2"]
}"""


class Orchestrator:
    def __init__(self, api_key: str, provider: str = "openai"):
        self.api_key = api_key
        self.provider = provider

    async def decompose_query(self, user_query: str) -> dict:
        """Analyze user query and dynamically decide what agents to spawn."""
        text = await chat_complete(
            provider=self.provider,
            api_key=self.api_key,
            model_tier="main",
            messages=[
                {"role": "system", "content": DECOMPOSITION_PROMPT},
                {"role": "user", "content": user_query},
            ],
        )
        return json.loads(text)

    async def run_agent(self, task: dict) -> dict:
        """Run a single research agent for a given task."""
        text = await chat_complete(
            provider=self.provider,
            api_key=self.api_key,
            model_tier="fast",
            messages=[
                {"role": "system", "content": AGENT_SYSTEM_PROMPT},
                {"role": "user", "content": task["prompt"]},
            ],
        )
        result = json.loads(text)
        result["task_id"] = task["id"]
        result["task_name"] = task["name"]
        result["category"] = task["category"]
        return result

    async def aggregate_results(self, user_query: str, results: list[dict], destination: dict) -> dict:
        """Combine all agent results into a coherent itinerary."""
        results_text = json.dumps(results, indent=2)
        prompt = f"""Original user query: {user_query}
Destination: {destination['name']} (lat: {destination['lat']}, lng: {destination['lng']})

Research results from {len(results)} parallel agents:
{results_text}

Combine these into a coherent day-by-day itinerary. Use the actual coordinates from the research results."""

        text = await chat_complete(
            provider=self.provider,
            api_key=self.api_key,
            model_tier="main",
            messages=[
                {"role": "system", "content": AGGREGATOR_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        return json.loads(text)
