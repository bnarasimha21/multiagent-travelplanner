# Multi-Agent Travel Planner

AI-powered travel planner that dynamically decomposes your query into parallel research agents. Instead of running a fixed set of agents for every request, an orchestrator analyzes what you actually need and spins up the right agents on the fly.

**Live App:** [narasimha-badrinath.com/multiagent-travelplanner](https://narasimha-badrinath.com/multiagent-travelplanner/)

**Read the article:** [Let the Model Decide: From Fixed Pipelines to Dynamic Agent Orchestration](https://www.linkedin.com/feed/update/urn:li:activity:7442131074467663872/)

## How It Works

The system runs in three phases:

1. **Decompose** - An orchestrator LLM analyzes the travel query and creates independent research tasks. A weekend beach trip might get 4 tasks. A two-week international family vacation might get 10.

2. **Execute in Parallel** - All tasks run concurrently using `asyncio.gather()`. Each agent researches its topic and returns structured results. Progress streams to the frontend in real time via SSE.

3. **Aggregate** - A final LLM call combines all agent results into a coherent day-by-day itinerary with costs, timings, and tips.

```
User Query
    |
    v
[Orchestrator] --> Decompose into N tasks
    |
    v
[Agent 1] [Agent 2] [Agent 3] ... [Agent N]  (all parallel)
    |
    v
[Aggregator] --> Day-by-day itinerary + map markers
```

## Features

- **Dynamic agent orchestration** - No hardcoded agents. The model decides what research is needed per query.
- **Parallel execution** - 4-5x faster than sequential. 6 agents finish in ~4 seconds instead of 15-20.
- **Multi-provider LLM support** - OpenAI (GPT-4o), Anthropic (Claude Sonnet), Google (Gemini 2.5 Flash).
- **Two-tier model strategy** - Powerful model for orchestration, fast cheap model for individual agents.
- **BYOK (Bring Your Own Key)** - Users can provide their own API keys.
- **Interactive map** - Mapbox GL with color-coded markers across 17 categories.
- **Agent dashboard** - Real-time execution metrics, parallel vs sequential timing.
- **SSE streaming** - Live progress updates as agents complete their research.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python, FastAPI, asyncio |
| LLM | OpenAI, Anthropic, Google Gemini |
| Frontend | Vanilla JS, Mapbox GL JS |
| Streaming | Server-Sent Events (SSE) |
| Deployment | Railway |
| Analytics | Supabase (optional) |

## Project Structure

```
multiagent-travelplanner/
├── backend/
│   ├── main.py              # FastAPI server, SSE endpoint
│   ├── orchestrator.py      # Query decomposition and result aggregation
│   ├── agent_runner.py      # Parallel agent execution and streaming
│   ├── llm_provider.py      # Multi-provider LLM abstraction
│   ├── usage_logger.py      # Analytics logging to Supabase
│   └── requirements.txt
├── frontend/
│   ├── index.html           # Main app shell
│   ├── app.js               # Client logic, map, SSE handling
│   ├── style.css            # UI styling
│   └── dashboard.html       # Agent execution dashboard
├── .env.example             # Environment variables template
├── requirements.txt         # Python dependencies
├── Procfile                 # Railway deployment
└── railway.json             # Railway config
```

## Getting Started

### Prerequisites

- Python 3.8+
- API key for at least one LLM provider (OpenAI, Anthropic, or Google)
- Mapbox access token (for map rendering)

### Setup

```bash
git clone https://github.com/bnarasimha21/multiagent-travelplanner.git
cd multiagent-travelplanner

cp .env.example .env
# Edit .env with your API keys

pip install -r requirements.txt

cd backend
python main.py
```

The app runs at `http://localhost:8000`.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (if using OpenAI) | OpenAI API key |
| `MAPBOX_ACCESS_TOKEN` | Yes | Mapbox token for map rendering |
| `SUPABASE_URL` | No | Supabase project URL for analytics |
| `SUPABASE_ANON_KEY` | No | Supabase anon key for analytics |

## Architecture

The key insight: the orchestrator prompt is what makes this a travel planner. Swap it out and the same code becomes a research assistant, a competitive analysis tool, or a document review system. The code is plumbing. The prompt is the blueprint.

The orchestrator uses a "main" model (GPT-4o, Claude Sonnet) for decomposition and aggregation. Individual research agents use a "fast" model (GPT-4o-mini, Claude Haiku) to keep per-agent cost low.

## License

MIT
