import {
  fetchSquad, fetchPlayer,
  getStat, pickSeasonStats, mapPosition,
  calcPointsPer90, calcEfficiency, calcReliability, calcForm,
  batchFetch, TEAM_IDS, TEAM_NAMES,
} from "./sportmonks.js";

// ─── Constants ────────────────────────────────────────────────────────────────

const FANTASY_BASE = "/api/fantasy";
const CACHE_TTL = 60 * 60 * 1000;

const POSITION_MAP = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

// teamId → club name (verified via v3 API for 2025/26 season)
const FANTASY_TEAM_NAMES = {
  "2":   "Atletico Madrid",
  "3":   "Athletic Club",
  "4":   "Barcelona",
  "5":   "Betis",
  "6":   "Celta Vigo",
  "7":   "Elche",
  "8":   "Espanyol",
  "9":   "Getafe",
  "11":  "Las Palmas",
  "13":  "Osasuna",
  "14":  "Rayo Vallecano",
  "15":  "Real Madrid",
  "16":  "Real Sociedad",
  "17":  "Sevilla",
  "18":  "Valencia",
  "20":  "Villarreal",
  "21":  "Alaves",
  "28":  "Girona",
  "33":  "Mallorca",
  "157": "Valladolid",
};

const STATUS_MAP = {
  ok:            "available",
  doubtful:      "doubtful",
  injured:       "injured",
  suspended:     "suspended",
  out_of_league: null,
};

// ─── Cache ────────────────────────────────────────────────────────────────────

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(`lf_${key}`);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(`lf_${key}`); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(`lf_${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

async function fantasyFetch(path, cacheKey) {
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const res = await fetch(`${FANTASY_BASE}${path}`);
  if (!res.ok) throw new Error(`Fantasy API ${res.status}: ${path}`);
  const json = await res.json();
  const data = Array.isArray(json) ? json : (json.data ?? json);
  cacheSet(cacheKey, data);
  return data;
}

// ─── Fantasy player list ──────────────────────────────────────────────────────

async function fetchFantasyPlayers() {
  // v6 endpoint — weekPoints[] is back, publicly accessible
  const v6 = await fantasyFetch("/players?x-lang=es", "players_v6");

  if (!Array.isArray(v6)) throw new Error("Fantasy API v6 returned unexpected shape");

  console.log("raw v6 sample:", v6[0]);

  const rawPlayers = v6
    .filter(p => ['1','2','3','4'].includes(String(p.positionId)))
    .filter(p => p.playerStatus !== "out_of_league")
    .filter(p => p.marketValue != null && Number(p.marketValue) > 0)
    .map(p => {
      const weekPoints        = Array.isArray(p.weekPoints) ? p.weekPoints : [];
      const totalSeasonPoints = p.points ?? 0;
      const avgPts            = p.averagePoints ?? 0;
      const gamesPlayed       = avgPts > 0
        ? Math.round(totalSeasonPoints / avgPts)
        : weekPoints.filter(w => (w.points ?? 0) > 0).length;
      const pointsPerGame     = Math.round(avgPts * 10) / 10;

      // Last 5 gameweeks, most recent first → reversed to chronological for display
      const form = weekPoints.length > 0
        ? [...weekPoints]
            .sort((a, b) => b.weekNumber - a.weekNumber)
            .slice(0, 5)
            .reverse()
            .map(w => w.points ?? null)
        : [];

      // Restored reliability from weekPoints
      const injuryWeeks       = inferInjuryWeeks(weekPoints);
      const totalWeeks        = weekPoints.length || 1;
      const participationRate = weekPoints.filter(w => (w.points ?? 0) > 0).length / totalWeeks;
      const consistencyRate   = weekPoints.length >= 3
        ? longestScoringStreak(weekPoints) / totalWeeks
        : 0;
      const injuryPenalty     = Math.min(1, injuryWeeks / totalWeeks);
      const statusPenalty     = STATUS_PENALTY[p.playerStatus] ?? 1.0;
      const rawReliability    = (
        participationRate * 0.45 +
        consistencyRate   * 0.30 +
        (1 - injuryPenalty) * 0.15 +
        statusPenalty     * 0.10
      );

      return {
        fantasyId:        p.id,
        name:             p.nickname ?? "Unknown",
        club:             FANTASY_TEAM_NAMES[p.teamId] ?? `Team ${p.teamId}`,
        position:         POSITION_MAP[p.positionId] ?? "MID",
        price:            Number(p.marketValue) / 1_000_000,
        status:           STATUS_MAP[p.playerStatus] ?? "available",
        image:            p.image ?? null,
        priceTrend:       0,
        pointsPer90:      pointsPerGame,
        totalSeasonPoints,
        gamesPlayed,
        pointsPerGame,
        form,
        rawEfficiency:    pointsPerGame,
        rawReliability,
      };
    });

  const maxRawReliability = Math.max(...rawPlayers.map(p => p.rawReliability), 1e-6);

  const players = rawPlayers.map(({ rawEfficiency, rawReliability, ...p }) => {
    const reliability = Math.round((rawReliability / maxRawReliability) * 100);
    return { ...p, _rawPPG: p.pointsPerGame ?? 0, reliability };
  });

  console.log(`Loaded ${players.length} players (v6). Sample:`, players[0]);
  return players;
}

// ─── Market value trend ───────────────────────────────────────────────────────

async function fetchMarketHistory(fantasyId) {
  const data = await fantasyFetch(
    `/player/${fantasyId}/market-value`,
    `mv_${fantasyId}`
  );
  const history = Array.isArray(data) ? data : (data?.data ?? []);
  if (history.length < 2) return { priceTrend: 0, growthPct: 0, seasonGrowthPct: 0 };

  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const latest = sorted[sorted.length - 1]?.marketValue ?? 0;

  const prev = sorted[sorted.length - 2]?.marketValue ?? latest;
  const priceTrend = latest - prev;

  const recent   = sorted.slice(-4);
  const earliest = recent[0]?.marketValue ?? latest;
  const growthPct = earliest > 0
    ? Math.round(((latest - earliest) / earliest) * 1000) / 10
    : 0;

  const seasonStart    = sorted[0]?.marketValue ?? latest;
  const seasonGrowthPct = seasonStart > 0
    ? Math.round(((latest - seasonStart) / seasonStart) * 1000) / 10
    : 0;

  return { priceTrend, growthPct, seasonGrowthPct };
}

// ─── Injury inference ────────────────────────────────────────────────────────

function inferInjuryWeeks(weekPoints) {
  const sorted = [...weekPoints].sort((a, b) => a.weekNumber - b.weekNumber);
  let injuryWeeks = 0;
  let streak = 0;
  for (const w of sorted) {
    if (w.points === 0) {
      streak++;
      if (streak >= 2) injuryWeeks++;
    } else {
      streak = 0;
    }
  }
  return injuryWeeks;
}

const STATUS_PENALTY = {
  ok:        1.0,
  doubtful:  0.85,
  injured:   0.60,
  suspended: 0.75,
};

// ─── Scoring helpers ─────────────────────────────────────────────────────────

function longestScoringStreak(weekPts) {
  const sorted = [...weekPts].sort((a, b) => a.weekNumber - b.weekNumber);
  let max = 0, cur = 0;
  for (const w of sorted) {
    if (w.points > 0) { cur++; max = Math.max(max, cur); }
    else cur = 0;
  }
  return max;
}

// ─── Fuzzy name matching ──────────────────────────────────────────────────────

function normalizeName(str) {
  return (str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameSimilarity(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const tokA = na.split(" ").filter(t => t.length >= 3);
  const tokB = nb.split(" ").filter(t => t.length >= 3);
  if (!tokA.length || !tokB.length) return 0;
  let hits = 0;
  for (const t of tokA) {
    if (tokB.some(u => u.startsWith(t) || t.startsWith(u))) hits++;
  }
  return hits / Math.max(tokA.length, tokB.length);
}

function bestMatch(fantasyPlayer, sportmonksPool) {
  let best = null;
  let bestScore = 0.4;
  for (const sp of sportmonksPool) {
    let score = nameSimilarity(fantasyPlayer.name, sp.name);
    if (
      normalizeName(fantasyPlayer.club).includes(normalizeName(sp.club)) ||
      normalizeName(sp.club).includes(normalizeName(fantasyPlayer.club))
    ) {
      score = Math.min(1, score + 0.15);
    }
    if (score > bestScore) { bestScore = score; best = sp; }
  }
  return best;
}

// ─── Sportmonks player pool ───────────────────────────────────────────────────

async function fetchSportmonksPool() {
  const TOKEN = process.env.NEXT_PUBLIC_SPORTMONKS_TOKEN ?? "";
  if (!TOKEN || TOKEN === "your_token_here" || TOKEN === "your_actual_token") {
    console.log("6. Sportmonks skipped — token not configured");
    return [];
  }

  console.log("6. Fetching Sportmonks squads...");

  const squadResults = await Promise.allSettled(
    TEAM_IDS.map(id => fetchSquad(id).then(ids => ({ teamId: id, playerIds: ids })))
  );

  const queue = [];
  for (const r of squadResults) {
    if (r.status === "fulfilled") {
      for (const pid of r.value.playerIds) {
        queue.push({ teamId: r.value.teamId, playerId: pid });
      }
    }
  }

  console.log("7. Sportmonks player queue length:", queue.length);
  if (queue.length === 0) return [];

  const results = await batchFetch(
    queue,
    ({ teamId, playerId }) =>
      fetchPlayer(playerId).then(raw => {
        const posId   = raw.detailed_position_id ?? raw.detailedPosition?.id;
        const pos     = mapPosition(posId);
        const stats   = pickSeasonStats(raw);
        const details = stats?.details ?? [];
        return {
          name:        raw.display_name ?? raw.name ?? "",
          club:        TEAM_NAMES[teamId],
          pos,
          pointsPer90: calcPointsPer90(details, pos),
          efficiency:  calcEfficiency(details, pos),
          reliability: calcReliability(details),
          form:        calcForm(raw.latest ?? [], pos),
          highlight:   `${getStat(details, "goals")}G ${getStat(details, "assists")}A this season`,
        };
      }),
    10,
    300
  );

  const pool = results.filter(r => r.status === "fulfilled").map(r => r.value);
  console.log("8. Sportmonks pool size:", pool.length);
  return pool;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchAllPlayers() {
  let fantasyPlayers;
  try {
    fantasyPlayers = await fetchFantasyPlayers();
  } catch (err) {
    console.error("FALLBACK triggered — Fantasy API failed:", err.message, err);
    throw err;
  }

  let sportmonksPool = [];
  try {
    sportmonksPool = await fetchSportmonksPool();
  } catch (err) {
    console.warn("Sportmonks failed (non-fatal):", err.message);
  }

  const merged = fantasyPlayers.map(fp => {
    const sp = bestMatch(fp, sportmonksPool);
    return {
      ...fp,
      pointsPer90:    sp?.pointsPer90  ?? fp.pointsPer90,
      efficiency:     sp?.efficiency   ?? fp.efficiency,
      reliability:    sp?.reliability  ?? fp.reliability,
      form:           sp?.form         ?? fp.form,
      highlight:      sp?.highlight    ?? null,
      chancesCreated: 0,
      teamContext:    "La Liga",
    };
  });

  console.log("9. Merged players:", merged.length, "| Sample:", merged[0]);
  return computeValueScores(merged);
}

// ─── Background trend enrichment ─────────────────────────────────────────────

export async function enrichWithTrends(players) {
  const top150 = [...players]
    .filter(p => p.fantasyId)
    .sort((a, b) => (b.totalSeasonPoints ?? 0) - (a.totalSeasonPoints ?? 0))
    .slice(0, 150);

  const results = await batchFetch(
    top150,
    async p => {
      const history = await fetchMarketHistory(p.fantasyId);
      return { fantasyId: p.fantasyId, ...history };
    },
    15,
    200
  );

  const trendMap = {};
  for (const r of results) {
    if (r.status === "fulfilled") {
      trendMap[r.value.fantasyId] = r.value;
    }
  }

  return players.map(p => ({
    ...p,
    priceTrend:      trendMap[p.fantasyId]?.priceTrend      ?? p.priceTrend,
    growthPct:       trendMap[p.fantasyId]?.growthPct        ?? 0,
    seasonGrowthPct: trendMap[p.fantasyId]?.seasonGrowthPct  ?? 0,
  }));
}

// ─── Value score — position-aware ─────────────────────────────────────────────

function computeValueScores(players) {
  const qualified = players.filter(p => (p.gamesPlayed ?? 0) >= 5);
  const maxVol = Math.max(...qualified.map(p => p.totalSeasonPoints ?? 0), 1);

  const maxPPGByPos    = {};
  const maxPPMByPos    = {};
  const maxAdjPPMByPos = {};
  const maxValPPGByPos = {};
  for (const pos of ["GK", "DEF", "MID", "FWD"]) {
    const group = qualified.filter(p => p.position === pos);
    maxPPGByPos[pos]    = Math.max(...group.map(p => p.pointsPerGame ?? 0), 1);
    const ppmGroup      = group.filter(p => p.price > 0 && p.totalSeasonPoints > 0);
    maxPPMByPos[pos]    = ppmGroup.length > 0
      ? Math.max(...ppmGroup.map(p => p.totalSeasonPoints / p.price))
      : 1;
    const adjGroup      = group.filter(p => p.price > 0 && (p.pointsPerGame ?? 0) > 0);
    maxAdjPPMByPos[pos] = adjGroup.length > 0
      ? Math.max(...adjGroup.map(p => ((p.pointsPerGame ?? 0) * ((p.reliability ?? 0) / 100)) / p.price))
      : 1;
    maxValPPGByPos[pos] = Math.max(...group.map(p => p.pointsPerGame ?? 0), 1);
  }

  return players.map(({ _rawPPG, ...p }) => {
    const gamesPlayed = p.gamesPlayed ?? 0;
    const pos         = p.position;

    let efficiency;
    if (gamesPlayed < 5) {
      efficiency = 40;
    } else {
      const ppgScore    = ((p.pointsPerGame ?? 0) / (maxPPGByPos[pos] ?? 1)) * 100;
      const volumeScore = ((p.totalSeasonPoints ?? 0) / maxVol) * 100;
      efficiency = Math.round(ppgScore * 0.7 + volumeScore * 0.3);
    }

    let valueScore;
    if (gamesPlayed < 5) {
      valueScore = 20;
    } else {
      const price             = p.price ?? 1;
      const totalSeasonPoints = p.totalSeasonPoints ?? 0;
      const reliabilityFactor = (p.reliability ?? 0) / 100;
      const adjustedPPM       = ((p.pointsPerGame ?? 0) * reliabilityFactor) / price;
      const ppmScore          = (adjustedPPM / (maxAdjPPMByPos[pos] ?? 1)) * 100;
      const ppgScore          = ((p.pointsPerGame ?? 0) / (maxValPPGByPos[pos] ?? 1)) * 100;
      const rawValue          = ppmScore * 0.70 + ppgScore * 0.30;
      const budgetBonus       = (price < 6 && totalSeasonPoints >= 80) ? 1.05 : 1.0;
      valueScore = Math.min(Math.round(rawValue * budgetBonus), 100);
    }

    const gemScore = (efficiency != null && p.reliability != null && valueScore != null)
      ? Math.round(efficiency * 0.25 + p.reliability * 0.40 + valueScore * 0.35)
      : null;

    return { ...p, efficiency, valueScore, gemScore };
  });
}
