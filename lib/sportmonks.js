const BASE_URL = "https://api.sportmonks.com/v3/football";
const TOKEN = process.env.NEXT_PUBLIC_SPORTMONKS_TOKEN ?? "";
const CACHE_TTL = 60 * 60 * 1000;

export const SEASON_ID = 25659; // La Liga 2024/25

export const TEAM_IDS = [83, 86, 9, 237, 142];
export const TEAM_NAMES = {
  83: "Barcelona",
  86: "Real Madrid",
  9: "Atletico Madrid",
  237: "Athletic Bilbao",
  142: "Villarreal",
};

const POSITION_MAP = {
  24: "GK",
  25: "DEF", 26: "DEF", 27: "DEF", 41: "DEF", 152: "DEF", 153: "DEF",
  28: "MID", 29: "MID", 30: "MID", 31: "MID", 32: "MID",
  148: "MID", 149: "MID", 150: "MID", 151: "MID",
  33: "FWD", 34: "FWD", 35: "FWD", 36: "FWD", 37: "FWD", 38: "FWD",
};

export const GOAL_PTS = { GK: 6, DEF: 6, MID: 5, FWD: 4 };
export const CS_PTS   = { GK: 4, DEF: 4, MID: 1, FWD: 0 };

const LALIGA_LEAGUE_ID = 564;

// ─── Cache ───────────────────────────────────────────────────────────────────

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(`sm_${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`sm_${key}`); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(`sm_${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiFetch(path, cacheKey) {
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE_URL}${path}${sep}api_token=${TOKEN}`);
  if (!res.ok) throw new Error(`Sportmonks ${res.status}: ${path}`);
  const json = await res.json();
  cacheSet(cacheKey, json.data);
  return json.data;
}

export async function fetchSquad(teamId) {
  const data = await apiFetch(
    `/squads/seasons/${SEASON_ID}/teams/${teamId}`,
    `squad_${SEASON_ID}_${teamId}`
  );
  return (Array.isArray(data) ? data : []).map(m => m.player_id).filter(Boolean);
}

const PLAYER_INCLUDES = [
  "statistics.details.type",
  "statistics.season.league",
  "latest.fixture.participants",
  "latest.fixture.scores",
  "latest.details.type",
  "detailedPosition",
].join(";");

export async function fetchPlayer(playerId) {
  return apiFetch(
    `/players/${playerId}?include=${encodeURIComponent(PLAYER_INCLUDES)}`,
    `player_${playerId}`
  );
}

// ─── Stat helpers (exported for playerData.js) ───────────────────────────────

export function getStat(details, code) {
  if (!Array.isArray(details)) return 0;
  const d = details.find(d =>
    d.type?.code === code ||
    d.type?.name?.toLowerCase().replace(/\s+/g, "-") === code
  );
  if (!d) return 0;
  const v = d.value;
  if (typeof v === "number") return v;
  return v?.total ?? v?.goals ?? v?.count ?? v?.average ?? 0;
}

export function mapPosition(detailedPositionId) {
  return POSITION_MAP[detailedPositionId] ?? "MID";
}

export function pickSeasonStats(raw) {
  if (!Array.isArray(raw?.statistics) || raw.statistics.length === 0) return null;
  return (
    raw.statistics.find(s =>
      s.season?.league?.id === LALIGA_LEAGUE_ID || s.season_id === SEASON_ID
    ) ?? raw.statistics[0]
  );
}

export function calcPointsPer90(details, pos) {
  const mins = getStat(details, "minutes-played");
  if (!mins || mins < 1) return 0;
  const goals   = getStat(details, "goals");
  const assists = getStat(details, "assists");
  const yellows = getStat(details, "yellowcards");
  const reds    = getStat(details, "redcards");
  const cs      = getStat(details, "cleansheets");
  const apps    = getStat(details, "appearances") || 1;
  const rawPts  =
    goals   * (GOAL_PTS[pos] ?? 4) +
    assists * 3 +
    cs      * (CS_PTS[pos] ?? 0) -
    yellows * 1 -
    reds    * 3 +
    apps    * 2;
  return Math.round((rawPts / mins) * 90 * 10) / 10;
}

export function calcEfficiency(details, pos) {
  const rating = getStat(details, "rating");
  if (rating > 0) return Math.min(100, Math.round(rating * 10));
  const mins = getStat(details, "minutes-played");
  if (!mins) return 0;
  const contributions = getStat(details, "goals") + getStat(details, "assists");
  return Math.min(100, Math.max(10, Math.round((contributions / mins) * 90 * 100)));
}

export function calcReliability(details) {
  const apps    = getStat(details, "appearances");
  const lineups = getStat(details, "lineups");
  const mins    = getStat(details, "minutes-played");
  if (!apps) return 0;
  const startsPct  = Math.min(1, lineups / apps);
  const full90Pct  = Math.min(1, mins / (lineups * 90 || 1));
  const avgMins    = mins / apps;
  const benchImpact = 0; // requires fixture-level sub data; future enhancement
  const score =
    startsPct   * 0.35 +
    full90Pct   * 0.30 +
    Math.min(1, avgMins / 90) * 0.25 +
    benchImpact * 0.10;
  return Math.min(100, Math.round(score * 100));
}

export function calcForm(latest, pos) {
  if (!Array.isArray(latest) || latest.length === 0) return [0, 0, 0, 0, 0];
  return latest.slice(0, 5).map(fixture => {
    const details = Array.isArray(fixture.details) ? fixture.details : [];
    const goals   = getStat(details, "goals");
    const assists = getStat(details, "assists");
    const mins    = getStat(details, "minutes-played") || 90;
    const yellows = getStat(details, "yellowcards");
    const reds    = getStat(details, "redcards");
    const scores  = fixture.fixture?.scores ?? [];
    const cleanSheet = scores.some(s => s.description === "FT" && s.score?.goals === 0);
    let pts = 0;
    if (mins >= 60) pts += 2; else if (mins > 0) pts += 1;
    pts += goals * (GOAL_PTS[pos] ?? 4);
    pts += assists * 3;
    pts += cleanSheet ? (CS_PTS[pos] ?? 0) : 0;
    pts -= yellows * 1;
    pts -= reds * 3;
    return Math.max(0, pts);
  });
}

// ─── Batch fetch with rate-limit delay ───────────────────────────────────────

export async function batchFetch(items, fetcher, batchSize = 10, delayMs = 300) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fetcher));
    results.push(...settled);
    if (i + batchSize < items.length) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}
