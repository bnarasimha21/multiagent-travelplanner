"""
Usage logging via Supabase REST API.
Logs each trip planning request for analytics.
"""

import os
import httpx

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
TABLE = "travel_planner_logs"


def _parse_user_agent(ua: str) -> dict:
    """Simple browser/OS/device parser."""
    if not ua:
        return {"browser": "Unknown", "os": "Unknown", "device_type": "unknown"}

    browser = "Other"
    if "Firefox/" in ua:
        browser = "Firefox"
    elif "Edg/" in ua:
        browser = "Edge"
    elif "Chrome/" in ua:
        browser = "Chrome"
    elif "Safari/" in ua:
        browser = "Safari"

    os_name = "Other"
    if "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS" in ua:
        os_name = "macOS"
    elif "Linux" in ua:
        os_name = "Linux"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"

    device_type = "desktop"
    if "Mobile" in ua or "Android" in ua or "iPhone" in ua:
        device_type = "mobile"
    elif "iPad" in ua or "Tablet" in ua:
        device_type = "tablet"

    return {"browser": browser, "os": os_name, "device_type": device_type}


async def log_usage(
    request,
    *,
    endpoint: str,
    query: str = None,
    destination: str = None,
    provider: str = "openai",
    is_byok: bool = False,
    success: bool = True,
    response_time_ms: int = None,
    agents_count: int = None,
):
    """Log a usage event to Supabase. Fails silently."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return

    try:
        ua = request.headers.get("user-agent", "")
        parsed = _parse_user_agent(ua)

        row = {
            "endpoint": endpoint,
            "query": (query or "")[:500],
            "destination": destination,
            "provider": provider,
            "is_byok": is_byok,
            "success": success,
            "response_time_ms": response_time_ms,
            "agents_count": agents_count,
            "ip_address": request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host if request.client else None,
            "user_agent": ua[:500],
            "referer": request.headers.get("referer"),
            "language": (request.headers.get("accept-language") or "").split(",")[0] or None,
            "browser": parsed["browser"],
            "os": parsed["os"],
            "device_type": parsed["device_type"],
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(
                f"{SUPABASE_URL}/rest/v1/{TABLE}",
                headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json=row,
            )
    except Exception as e:
        print(f"[USAGE] Log failed: {e}")
