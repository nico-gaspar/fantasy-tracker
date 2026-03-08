import { cookies } from "next/headers";

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
// 30 requests per IP per 60 seconds. Resets per serverless instance,
// but still catches the bulk of abuse/hammering on a single instance.
const WINDOW_MS  = 60_000;
const MAX_REQ    = 30;
const ipHits     = new Map(); // ip → { count, resetAt }

function isRateLimited(ip) {
  const now  = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= MAX_REQ) return true;
  entry.count++;
  return false;
}

export async function GET(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return Response.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get("lliga_token")?.value;

  const headers = {
    Accept: "application/json",
    "User-Agent": "Mozilla/5.0",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(
      "https://api-fantasy.llt-services.com/api/v6/players?x-lang=es",
      { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) {
      return Response.json(
        { error: `Fantasy API responded with ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    const players = Array.isArray(data) ? data.filter(p => String(p.positionId) !== "5") : data;
    if (Array.isArray(data)) console.log(`[Fantasy API] raw: ${data.length}, after coach filter: ${players.length}`);
    return Response.json(players);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
