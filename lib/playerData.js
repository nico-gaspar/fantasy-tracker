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

// teamId → publicly accessible crest URL (Wikimedia Commons)
export const TEAM_CRESTS = {
  "2":   "https://upload.wikimedia.org/wikipedia/commons/f/f4/Atletico_Madrid_2017_logo.svg",
  "3":   "https://upload.wikimedia.org/wikipedia/commons/9/98/Club_Athletic_Bilbao_logo.svg",
  "4":   "https://upload.wikimedia.org/wikipedia/commons/4/47/FC_Barcelona_%28crest%29.svg",
  "5":   "https://upload.wikimedia.org/wikipedia/commons/4/4b/Real_Betis_Balompi%C3%A9_logo.svg",
  "6":   "https://upload.wikimedia.org/wikipedia/commons/1/12/RC_Celta_de_Vigo_logo.svg",
  "7":   "https://upload.wikimedia.org/wikipedia/commons/4/45/Escudo_del_Elche_C.F.svg",
  "8":   "https://upload.wikimedia.org/wikipedia/commons/7/76/RCD_Espanyol_logo.svg",
  "9":   "https://upload.wikimedia.org/wikipedia/commons/8/8e/Getafe_CF.svg",
  "11":  "https://upload.wikimedia.org/wikipedia/commons/8/8a/UD_Las_Palmas_logo.svg",
  "13":  "https://upload.wikimedia.org/wikipedia/commons/0/00/Club_Atletico_Osasuna.svg",
  "14":  "https://upload.wikimedia.org/wikipedia/commons/4/4d/Rayo_Vallecano_logo.svg",
  "15":  "https://upload.wikimedia.org/wikipedia/commons/5/56/Real_Madrid_CF.svg",
  "16":  "https://upload.wikimedia.org/wikipedia/commons/f/f1/Real_Sociedad_logo.svg",
  "17":  "https://upload.wikimedia.org/wikipedia/commons/3/3b/Sevilla_FC_logo.svg",
  "18":  "https://upload.wikimedia.org/wikipedia/commons/c/ce/Valenciacf.svg",
  "20":  "https://upload.wikimedia.org/wikipedia/commons/b/b9/Villarreal_CF_Logo.svg",
  "21":  "https://upload.wikimedia.org/wikipedia/commons/e/ea/Deportivo_Alav%C3%A9s_logo.svg",
  "28":  "https://upload.wikimedia.org/wikipedia/commons/6/6e/Girona_FC_crest.svg",
  "33":  "https://upload.wikimedia.org/wikipedia/commons/d/d9/RCD_Mallorca_logo.svg",
  "157": "https://upload.wikimedia.org/wikipedia/commons/3/3d/Real_Valladolid_logo.svg",
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

  const filtered = v6.filter(p => String(p.positionId) !== '5');
  console.log(`[playerData] raw v6: ${v6.length}, after coach filter: ${filtered.length}`);

  const rawPlayers = filtered
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
        teamId:           String(p.teamId),
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

// ─── Scores — position-aware ──────────────────────────────────────────────────

function computeValueScores(players) {
  const qualified = players.filter(p => (p.gamesPlayed ?? 0) >= 5);
  const maxVol    = Math.max(...qualified.map(p => p.totalSeasonPoints ?? 0), 1);

  const maxPPGByPos = {};
  for (const pos of ["GK", "DEF", "MID", "FWD"]) {
    const group = qualified.filter(p => p.position === pos);
    maxPPGByPos[pos] = Math.max(...group.map(p => p.pointsPerGame ?? 0), 1);
  }

  return players.map(({ _rawPPG, ...p }) => {
    const gamesPlayed = p.gamesPlayed ?? 0;
    const pos         = p.position;

    // ── Efficiency (unchanged) ───────────────────────────────────────────────
    let efficiency;
    if (gamesPlayed < 5) {
      efficiency = 40;
    } else {
      const ppgScore    = ((p.pointsPerGame ?? 0) / (maxPPGByPos[pos] ?? 1)) * 100;
      const volumeScore = ((p.totalSeasonPoints ?? 0) / maxVol) * 100;
      efficiency = Math.round(ppgScore * 0.7 + volumeScore * 0.3);
    }

    // ── Streak score — recent form vs season average ─────────────────────────
    const seasonPPG  = p.pointsPerGame ?? 0;
    const formVals   = (p.form ?? []).filter(v => v != null);
    let streakScore  = 0;
    if (gamesPlayed >= 3 && seasonPPG > 0 && formVals.length > 0) {
      const last5Avg = formVals.reduce((a, b) => a + b, 0) / formVals.length;
      streakScore    = Math.min(100, Math.round((last5Avg / seasonPPG) * 50));
    }

    // ── Preliminary gem score (growthScore = 0 until enrichment runs) ────────
    const gemScore = calcGemScore(p.reliability ?? 0, efficiency, streakScore, 0, p.price ?? 0);

    return { ...p, efficiency, streakScore, gemScore };
  });
}

// ─── Gem score helpers ────────────────────────────────────────────────────────

function calcGemScore(reliability, efficiency, streakScore, growthScore, price) {
  const base             = (reliability * 0.30) + (efficiency * 0.25) + (growthScore * 0.25) + (streakScore * 0.20);
  const budgetMultiplier = price > 0 && price < 30 ? 1.15 : 1.0;
  return Math.min(100, Math.round(base * budgetMultiplier));
}

// ─── Recompute gem scores after growth data is available ──────────────────────

export function recomputeGemScores(players) {
  // Normalise growthPct within each position group (floor at 0)
  const maxGrowthByPos = {};
  for (const pos of ["GK", "DEF", "MID", "FWD"]) {
    const vals = players
      .filter(p => p.position === pos && (p.growthPct ?? 0) > 0)
      .map(p => p.growthPct);
    maxGrowthByPos[pos] = vals.length > 0 ? Math.max(...vals) : 1;
  }

  return players.map(p => {
    const rawGrowth  = p.growthPct ?? 0;
    const growthScore = rawGrowth <= 0
      ? 0
      : Math.min(100, Math.round((rawGrowth / (maxGrowthByPos[p.position] ?? 1)) * 100));

    const gemScore = calcGemScore(
      p.reliability  ?? 0,
      p.efficiency   ?? 0,
      p.streakScore  ?? 0,
      growthScore,
      p.price        ?? 0,
    );

    return { ...p, growthScore, gemScore };
  });
}
