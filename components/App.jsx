"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAllPlayers, enrichWithTrends, TEAM_CRESTS } from "@/lib/playerData";

// ─── Mock fallback data ───────────────────────────────────────────────────────

const rawMockPlayers = [
  { name: "Lamine Yamal",   club: "Barcelona",      position: "MID", price: 9.2,  pointsPer90: 8.4,  efficiency: 87, reliability: 91, form: [6,8,12,7,14],  highlight: "8 assists this season",    chancesCreated: 3.2 },
  { name: "Kylian Mbappé",  club: "Real Madrid",    position: "FWD", price: 14.1, pointsPer90: 11.2, efficiency: 95, reliability: 78, form: [14,4,18,11,9], highlight: "23 goals this season",     chancesCreated: 1.4 },
  { name: "Pau Cubarsí",    club: "Barcelona",      position: "DEF", price: 5.4,  pointsPer90: 6.1,  efficiency: 79, reliability: 88, form: [8,6,10,8,7],   highlight: "Top defensive actions",    chancesCreated: 0.8 },
  { name: "Thibaut Courtois",club:"Real Madrid",    position: "GK",  price: 6.8,  pointsPer90: 7.3,  efficiency: 83, reliability: 85, form: [10,6,7,12,8],  highlight: "11 clean sheets",          chancesCreated: 0   },
  { name: "Vinícius Jr.",   club: "Real Madrid",    position: "FWD", price: 12.4, pointsPer90: 9.8,  efficiency: 91, reliability: 72, form: [12,0,15,8,11], highlight: "18 goals this season",     chancesCreated: 2.1 },
  { name: "Pedri",          club: "Barcelona",      position: "MID", price: 8.1,  pointsPer90: 7.6,  efficiency: 82, reliability: 89, form: [9,7,8,11,7],   highlight: "Key pass leader",          chancesCreated: 2.8 },
  { name: "Dani Vivian",    club: "Athletic Bilbao",position: "DEF", price: 4.2,  pointsPer90: 5.8,  efficiency: 74, reliability: 93, form: [7,8,6,8,9],    highlight: "Most reliable starter",    chancesCreated: 0.4 },
  { name: "Luis Milla",     club: "Getafe",         position: "MID", price: 5.1,  pointsPer90: 6.4,  efficiency: 76, reliability: 86, form: [6,8,7,9,8],    highlight: "8 assists this season",    chancesCreated: 2.2 },
  { name: "Marco Asensio",  club: "Aston Villa",    position: "MID", price: 6.2,  pointsPer90: 6.1,  efficiency: 72, reliability: 80, form: [5,7,6,8,7],    highlight: "Consistent performer",     chancesCreated: 1.8 },
  { name: "David Raya",     club: "Arsenal",        position: "GK",  price: 5.9,  pointsPer90: 6.8,  efficiency: 79, reliability: 83, form: [8,5,9,7,6],    highlight: "9 clean sheets",           chancesCreated: 0   },
  { name: "Iñaki Williams", club: "Athletic Bilbao",position: "FWD", price: 7.4,  pointsPer90: 7.1,  efficiency: 77, reliability: 84, form: [9,6,8,10,7],   highlight: "12 goals this season",     chancesCreated: 1.1 },
  { name: "Joselu",         club: "Real Madrid",    position: "FWD", price: 4.8,  pointsPer90: 5.9,  efficiency: 68, reliability: 79, form: [6,4,7,5,8],    highlight: "Super sub specialist",     chancesCreated: 0.6 },
  { name: "Aymeric Laporte",club: "Al-Nassr",       position: "DEF", price: 3.9,  pointsPer90: 5.4,  efficiency: 70, reliability: 77, form: [7,5,6,7,5],    highlight: "Experienced defender",     chancesCreated: 0.3 },
  { name: "Ander Herrera",  club: "Athletic Bilbao",position: "MID", price: 3.5,  pointsPer90: 5.1,  efficiency: 65, reliability: 82, form: [5,6,5,7,6],    highlight: "Experienced midfielder",   chancesCreated: 1.2 },
  { name: "Kepa",           club: "Chelsea",        position: "GK",  price: 4.1,  pointsPer90: 5.8,  efficiency: 71, reliability: 76, form: [6,4,7,5,6],    highlight: "Solid shot-stopper",       chancesCreated: 0   },
];

const maxRawMockValue = Math.max(...rawMockPlayers.map(p => p.pointsPer90 / p.price));
const mockPlayers = rawMockPlayers.map(p => ({
  ...p, status: "available", priceTrend: 0, image: null,
  valueScore: Math.round((p.pointsPer90 / p.price) / maxRawMockValue * 100),
  totalSeasonPoints: Math.round(p.pointsPer90 * 22),
  gamesPlayed: 22,
}));

// ─── Shared constants ─────────────────────────────────────────────────────────

const SORT_MODES = [
  { label: "🔥 Rising",  key: "growthPct",         accent: true  },
  { label: "Value",       key: "valueScore",        accent: false },
  { label: "Season Pts",  key: "totalSeasonPoints", accent: false },
];

const TRANSLATIONS = {
  en: {
    title: "Player Tracker",
    players: "Players",
    seasonPts: "Season Pts",
    ptsP90: "Pts / 90",
    efficiency: "Efficiency",
    reliability: "Reliability",
    value: "Value",
    last5: "Last 5",
    price: "Price",
    search: "Search players or clubs...",
    buildMy11: "Best 11",
    myLineups: "My Lineups",
    posAll: "ALL",
    valueTooltipTitle: "Value Score",
    valueTooltipBody: "Points per game ÷ price, normalised within position so a budget DEF can compete with elite FWDs.",
  },
  es: {
    title: "Rastreador de Jugadores",
    players: "Jugadores",
    seasonPts: "Pts Temporada",
    ptsP90: "Pts / 90",
    efficiency: "Eficiencia",
    reliability: "Fiabilidad",
    value: "Valor",
    last5: "Últimos 5",
    price: "Precio",
    search: "Buscar jugadores o equipos...",
    buildMy11: "Mejor 11",
    myLineups: "Mis Alineaciones",
    posAll: "TODO",
    valueTooltipTitle: "Puntuación de Valor",
    valueTooltipBody: "Puntos por partido ÷ precio, normalizado por posición para que un DEF económico pueda competir con los mejores delanteros.",
  },
};

const POINTS_BRACKETS = [
  { label: "All",      min: 0,   max: Infinity },
  { label: "150+",     min: 150, max: Infinity },
  { label: "100–150",  min: 100, max: 150 },
  { label: "50–100",   min: 50,  max: 100 },
  { label: "Under 50", min: 0,   max: 50 },
];

const positionColors = {
  FWD: { bg: "rgba(255,77,77,0.15)",  text: "#FF7A7A", border: "rgba(255,77,77,0.3)" },
  MID: { bg: "rgba(77,255,145,0.12)", text: "#4DFF91", border: "rgba(77,255,145,0.3)" },
  DEF: { bg: "rgba(77,158,255,0.15)", text: "#7AB8FF", border: "rgba(77,158,255,0.3)" },
  GK:  { bg: "rgba(255,210,77,0.12)", text: "#FFD24D", border: "rgba(255,210,77,0.3)" },
};

const statusColors = {
  available: "#4DFF91", doubtful: "#FFD24D", injured: "#FF7A7A", suspended: "#FF7A7A",
};

// ─── Lineup builder helpers ───────────────────────────────────────────────────

const FORMATIONS = ["5-4-1", "5-3-2", "4-5-1", "4-4-2", "4-3-3", "3-5-2", "3-4-3"];

const getGemScore = (p) => {
  if (p?.gemScore != null) return p.gemScore;
  const eff = p?.efficiency;
  const rel = p?.reliability;
  const val = p?.valueScore;
  if (eff != null && rel != null && val != null)
    return Math.round(eff * 0.25 + rel * 0.40 + val * 0.35);
  const scores = [eff, rel, val].filter(v => v != null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
};

const getBestN = (pool, n) =>
  [...pool].sort((a, b) => (getGemScore(b) ?? 0) - (getGemScore(a) ?? 0)).slice(0, n);

const buildBest11 = (players, formation) => {
  const [def, mid, fwd] = formation.split("-").map(Number);
  return {
    GK:  getBestN(players.filter(p => p.position === "GK"),  1),
    DEF: getBestN(players.filter(p => p.position === "DEF"), def),
    MID: getBestN(players.filter(p => p.position === "MID"), mid),
    FWD: getBestN(players.filter(p => p.position === "FWD"), fwd),
  };
};

const buildBench = (players, lineup) => {
  const inLineup = new Set(
    [...(lineup.GK ?? []), ...(lineup.DEF ?? []), ...(lineup.MID ?? []), ...(lineup.FWD ?? [])]
      .map(p => p.fantasyId ?? p.name)
  );
  const pool = players.filter(p => !inLineup.has(p.fantasyId ?? p.name));
  const benchGK  = getBestN(pool.filter(p => p.position === "GK"), 1);
  const gkIds    = new Set(benchGK.map(p => p.fantasyId ?? p.name));
  const benchOut = getBestN(pool.filter(p => p.position !== "GK" && !gkIds.has(p.fantasyId ?? p.name)), 3);
  return [...benchGK, ...benchOut];
};

// Returns all formations sorted by avg gem score descending
const compareFormations = (players) =>
  FORMATIONS.map(f => {
    const lineup = buildBest11(players, f);
    const all = [...lineup.GK, ...lineup.DEF, ...lineup.MID, ...lineup.FWD];
    const avgGem   = all.length ? Math.round(all.reduce((s, p) => s + (getGemScore(p) ?? 0), 0) / all.length) : 0;
    const totalPts = all.reduce((s, p) => s + (p.totalSeasonPoints ?? 0), 0);
    return { formation: f, avgGem, totalPts, lineup };
  }).sort((a, b) => b.avgGem - a.avgGem);

const findBestFormation = (players) => compareFormations(players)[0]?.formation ?? "4-3-3";

// localStorage helpers
const lsSave = (name, lineup, bench, formation) => {
  const saved = JSON.parse(localStorage.getItem("savedLineups") || "[]");
  saved.push({ id: Date.now(), name, formation, createdAt: new Date().toISOString(), players: { ...lineup, bench } });
  localStorage.setItem("savedLineups", JSON.stringify(saved));
};
const lsLoad   = ()       => JSON.parse(localStorage.getItem("savedLineups") || "[]");
const lsDelete = (id)     => localStorage.setItem("savedLineups", JSON.stringify(lsLoad().filter(l => l.id !== id)));
const lsRename = (id, nm) => localStorage.setItem("savedLineups", JSON.stringify(lsLoad().map(l => l.id === id ? { ...l, name: nm } : l)));

// ─── Small UI components ──────────────────────────────────────────────────────

const ScoreBar = ({ value, color }) => {
  if (value == null) return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", fontWeight: 500, minWidth: 26, textAlign: "right" }}>—</span>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 2, background: color, transition: "width 0.6s ease" }} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 500, color: "#fff", fontFamily: "'DM Mono', monospace", minWidth: 26, textAlign: "right" }}>{value}</span>
    </div>
  );
};

const FormDots = ({ values }) => {
  if (!values?.length) return null;
  const last5 = values.slice(-5);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {last5.map((v, i) => {
        const didPlay = v != null && v > 0;
        return (
          <div key={i} title={v != null ? `${v} pts` : "DNP"} style={{
            width: 8, height: 8, borderRadius: 4, flexShrink: 0,
            background: didPlay ? "#C8FF57" : "rgba(255,255,255,0.12)",
          }} />
        );
      })}
    </div>
  );
};

const ScoreRing = ({ value, color, size = 72 }) => {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill="#fff" fontSize={size < 56 ? 12 : 16} fontFamily="'DM Mono', monospace" fontWeight="700"
        style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}>
        {value}
      </text>
    </svg>
  );
};

const SortIcon = ({ col, sortCol, sortDir }) => (
  <span style={{ marginLeft: 4, opacity: sortCol === col ? 1 : 0.25, fontSize: 10 }}>
    {sortCol === col && sortDir === "desc" ? "↓" : "↑"}
  </span>
);

const PlayerAvatar = ({ player }) => {
  const [failed, setFailed] = useState(false);
  const initials = (player.name ?? "").split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
  const showInjury = player.status && player.status !== "available";
  const inner = (!player.image || failed)
    ? (
      <div style={{
        width: 36, height: 36, borderRadius: 18, flexShrink: 0,
        background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))",
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace",
      }}>{initials}</div>
    )
    : <img src={player.image} alt={player.name} onError={() => setFailed(true)}
        style={{ width: 36, height: 36, borderRadius: 18, objectFit: "cover", flexShrink: 0, display: "block" }} />;

  if (!showInjury) return inner;
  return (
    <div style={{ position: "relative", flexShrink: 0, width: 36, height: 36 }}>
      {inner}
      <div title={player.status} style={{
        position: "absolute", top: -1, left: 27,
        width: 8, height: 8, borderRadius: 7.5,
        background: "#bd1e1e",
        boxShadow: "0 0 4px rgba(189,30,30,0.6)",
      }} />
    </div>
  );
};

const TeamCrest = ({ teamId, size = 16 }) => {
  const [failed, setFailed] = useState(false);
  const src = TEAM_CRESTS[teamId];
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0, display: "block" }}
    />
  );
};

const StatusDot = ({ status }) => {
  if (!status || status === "available") return null;
  return <div title={status} style={{
    width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
    background: statusColors[status] ?? "transparent",
    boxShadow: `0 0 4px ${statusColors[status] ?? "transparent"}`,
  }} />;
};

const TrendArrow = ({ trend }) => {
  if (!trend) return null;
  return <span style={{ fontSize: 10, marginLeft: 4, fontFamily: "'DM Mono', monospace", color: trend > 0 ? "#4DFF91" : "#FF7A7A" }}>
    {trend > 0 ? "▲" : "▼"}
  </span>;
};

const Shimmer = ({ style }) => (
  <div style={{
    background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%)",
    backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: 4, ...style,
  }} />
);

const SkeletonRows = () => (
  <>
    {Array(8).fill(null).map((_, i) => (
      <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <td style={{ padding: "8px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Shimmer style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0 }} />
            <Shimmer style={{ width: 36, height: 36, borderRadius: 18, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <Shimmer style={{ width: 90 + (i % 3) * 20, height: 13 }} />
              <Shimmer style={{ width: 60, height: 10 }} />
            </div>
            <Shimmer style={{ width: 38, height: 20, borderRadius: 4, flexShrink: 0, marginLeft: "auto" }} />
          </div>
        </td>
        {[14,14,14,14,14,14,14].map((p, j) => (
          <td key={j} style={{ padding: `${p}px`, textAlign: "center" }}>
            <Shimmer style={{ width: j < 2 ? 28 : j < 5 ? undefined : 40, height: j < 2 ? 15 : j < 5 ? 4 : 8, margin: "0 auto" }} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// ─── Detail panel ─────────────────────────────────────────────────────────────

const DetailPanel = ({ player, onClose }) => {
  const pos     = positionColors[player.position];
  const formVals = player.form?.filter(v => v != null) ?? [];
  const formMax  = Math.max(...formVals, 1);
  const last5    = (player.form ?? []).slice(-5);

  const statBars = [
    { label: "Value",       value: player.valueScore ?? 0,   color: "#FF9F57" },
    { label: "Efficiency",  value: player.efficiency ?? 0,   color: "#C8FF57" },
    { label: "Reliability", value: player.reliability ?? 0,  color: "#57C8FF" },
  ];

  const thisSeasonRows = [
    { label: "Average Minutes", value: player.averageMinutes != null ? player.averageMinutes : "—" },
    { label: "Points per 90",   value: player.pointsPer90   != null ? player.pointsPer90   : "—" },
    { label: "Games Played",    value: player.gamesPlayed   != null ? player.gamesPlayed   : "—" },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 100, pointerEvents: "none",
    }}>
      <div style={{
        width: "min(420px, calc(100vw - 32px))", maxHeight: "90vh", overflowY: "auto",
        background: "#141414", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
        padding: 24, display: "flex", flexDirection: "column", gap: 32,
        animation: "slideIn 0.2s ease", pointerEvents: "all",
      }}>

        {/* Header: × + Compare */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)",
            width: 38, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16,
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif",
            transition: "background 0.15s, color 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >×</button>
          <button style={{
            background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.4)",
            padding: "0 16px", height: 32, borderRadius: 8, cursor: "pointer", fontSize: 12,
            fontFamily: "'DM Mono', monospace",
          }}>Compare</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>

          {/* Player identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <PlayerAvatar player={player} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif", marginBottom: 2 }}>{player.name}</h2>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}>{player.club}</div>
            </div>
            <div style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 10, letterSpacing: "0.1em",
              background: pos.bg, border: `1px solid ${pos.border}`, color: pos.text,
              fontFamily: "'DM Mono', monospace", flexShrink: 0,
            }}>{player.position}</div>
          </div>

          {/* Stats row: bars + right column */}
          <div style={{ display: "flex", gap: 60, alignItems: "flex-start" }}>

            {/* Bar stats */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
              {statBars.map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", fontFamily: "'DM Mono', monospace" }}>{label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", minWidth: 0 }}>
                      <div style={{ width: `${value}%`, height: 4, borderRadius: 2, background: color }} />
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "#fff", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{value || "—"}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Right column: Season PTS + Price */}
            <div style={{ width: 108, display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-end", flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>Season PTS</span>
                <span style={{ fontSize: 24, color: "#fff", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.15 }}>
                  {player.totalSeasonPoints ?? "—"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>Price</span>
                <span style={{ fontSize: 24, color: "#fff", fontFamily: "'DM Mono', monospace", fontWeight: 300, lineHeight: 1.15, letterSpacing: "0.05em" }}>
                  {player.price != null ? `€${Number(player.price).toFixed(3)}m` : "—"}
                </span>
                {player.priceTrend != null && player.priceTrend !== 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 8, color: player.priceTrend > 0 ? "#C8FF57" : "#FF7A7A" }}>
                      {player.priceTrend > 0 ? "▲" : "▼"}
                    </span>
                    <span style={{ fontSize: 10, color: player.priceTrend > 0 ? "#C8FF57" : "#FF7A7A", fontFamily: "'DM Mono', monospace" }}>
                      {Math.abs(player.priceTrend)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Game performance panel */}
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 20,
          }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>
              Game performance
            </span>

            {/* Last 5 GW cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>Last 5</span>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {last5.length > 0 ? last5.map((pts, i) => {
                  const didPlay = pts != null;
                  const ratio   = didPlay ? pts / formMax : 0;
                  const bgAlpha = didPlay ? 0.05 + ratio * 0.10 : 0.02;
                  const bdAlpha = didPlay ? 0.2  + ratio * 0.40 : 0.08;
                  return (
                    <div key={i} style={{
                      flex: 1, maxWidth: 52, display: "flex", flexDirection: "column", alignItems: "center",
                      gap: 6, paddingTop: 9, paddingBottom: 5,
                      background: didPlay ? `rgba(200,255,87,${bgAlpha})` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${didPlay ? `rgba(200,255,87,${bdAlpha})` : "rgba(255,255,255,0.08)"}`,
                      borderRadius: 6,
                    }}>
                      <span style={{ fontSize: 9, color: didPlay ? "#C8FF57" : "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>
                        GW{(player.form?.length ?? 5) - last5.length + i + 1}
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 500, color: didPlay ? "#C8FF57" : "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>
                        {didPlay ? pts : "—"}
                      </span>
                    </div>
                  );
                }) : (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace" }}>No data</span>
                )}
              </div>
            </div>

            {/* This season rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.75)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", textTransform: "uppercase" }}>This season</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                {thisSeasonRows.map(({ label, value }, i) => (
                  <div key={label}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{label}</span>
                      <span style={{ fontSize: 16, color: "#fff", fontFamily: "'DM Mono', monospace" }}>{value}</span>
                    </div>
                    {i < thisSeasonRows.length - 1 && (
                      <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginTop: 13 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

// ─── Lineup builder components ────────────────────────────────────────────────

const MiniFormBoxes = ({ values }) => {
  if (!values?.length) return null;
  const last5 = values.slice(-5);
  const max = Math.max(...last5.filter(v => v != null), 1);
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {last5.map((v, i) => (
        <div key={i} title={v != null ? `${v} pts` : "DNP"} style={{
          width: 9, height: 14, borderRadius: 2,
          background: v == null ? "rgba(255,255,255,0.05)" : `rgba(200,255,87,${0.15 + (v / max) * 0.7})`,
        }} />
      ))}
    </div>
  );
};

const LineupPlayerCard = ({ player, onSwap, dim = false }) => {
  const gem = getGemScore(player) ?? 0;
  const pos = positionColors[player.position] ?? {};
  const lastName = (player.name ?? "").split(/\s+/).slice(-1)[0];
  return (
    <div style={{
      width: 112,
      background: dim ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.5)",
      backdropFilter: "blur(8px)",
      border: `1px solid ${dim ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.12)"}`,
      borderRadius: 12,
      padding: "10px 8px 8px",
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      opacity: dim ? 0.72 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, letterSpacing: "0.08em", background: pos.bg, border: `1px solid ${pos.border}`, color: pos.text, fontFamily: "'DM Mono', monospace" }}>
          {player.position}
        </div>
        <StatusDot status={player.status} />
      </div>
      <PlayerAvatar player={player} />
      <ScoreRing value={gem} color={dim ? "rgba(200,255,87,0.5)" : "#C8FF57"} size={52} />
      <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif", textAlign: "center", lineHeight: 1.2, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {lastName}
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
        {player.club}
      </div>
      <div style={{ display: "flex", gap: 5, fontSize: 9, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono', monospace" }}>
        <span>{player.totalSeasonPoints ?? "—"} pts</span>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
        <span>€{player.price != null ? Number(player.price).toFixed(3) : "—"}m</span>
      </div>
      <MiniFormBoxes values={player.form} />
      <button onClick={() => onSwap(player)} style={{
        marginTop: 2, width: "100%", padding: "4px 0",
        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 6, color: "rgba(255,255,255,0.4)", fontSize: 9,
        fontFamily: "'DM Mono', monospace", cursor: "pointer", letterSpacing: "0.06em", transition: "all 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#fff"; }}
        onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
      >
        ⇄ SWAP
      </button>
    </div>
  );
};

const PitchMarkings = () => (
  <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 800 560" preserveAspectRatio="none">
    <rect x="24" y="16" width="752" height="528" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2" rx="4" />
    <line x1="24" y1="280" x2="776" y2="280" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
    <circle cx="400" cy="280" r="66" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
    <circle cx="400" cy="280" r="3.5" fill="rgba(255,255,255,0.12)" />
    <rect x="222" y="16" width="356" height="96" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
    <rect x="222" y="448" width="356" height="96" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" />
    <rect x="308" y="16" width="184" height="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
    <rect x="308" y="502" width="184" height="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
    <circle cx="400" cy="90" r="3" fill="rgba(255,255,255,0.09)" />
    <circle cx="400" cy="470" r="3" fill="rgba(255,255,255,0.09)" />
  </svg>
);

const Pitch = ({ lineup, onSwap }) => {
  const rows = [
    { key: "FWD", players: lineup.FWD ?? [] },
    { key: "MID", players: lineup.MID ?? [] },
    { key: "DEF", players: lineup.DEF ?? [] },
    { key: "GK",  players: lineup.GK  ?? [] },
  ];
  return (
    <div style={{
      position: "relative", borderRadius: 16, overflow: "hidden",
      background: "linear-gradient(180deg, #091709 0%, #071407 100%)",
      border: "1px solid rgba(255,255,255,0.07)",
      minHeight: 530, display: "flex", flexDirection: "column",
      justifyContent: "space-evenly", padding: "16px 32px",
    }}>
      <PitchMarkings />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(row => (
          <div key={row.key} style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "flex-start" }}>
            {row.players.length === 0
              ? <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", padding: "16px 0" }}>No {row.key} selected</div>
              : row.players.map(p => <LineupPlayerCard key={p.fantasyId ?? p.name} player={p} onSwap={onSwap} />)
            }
          </div>
        ))}
      </div>
    </div>
  );
};

const AddPlayerCard = ({ onClick }) => (
  <div onClick={onClick} style={{
    width: 112, minHeight: 210,
    border: "2px dashed rgba(255,255,255,0.1)", borderRadius: 12,
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 8, cursor: "pointer", transition: "all 0.15s",
    color: "rgba(255,255,255,0.2)",
  }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(200,255,87,0.35)"; e.currentTarget.style.color = "rgba(200,255,87,0.6)"; e.currentTarget.style.background = "rgba(200,255,87,0.03)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.2)"; e.currentTarget.style.background = "transparent"; }}
  >
    <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 300 }}>+</div>
    <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em" }}>ADD PLAYER</div>
  </div>
);

const AddPlayerModal = ({ allPlayers, usedIds, onSelect, onClose }) => {
  const [search, setSearch]       = useState("");
  const [posFilter, setPosFilter] = useState("ALL");

  const available = [...allPlayers]
    .filter(p => !usedIds.has(p.fantasyId ?? p.name))
    .filter(p => posFilter === "ALL" || p.position === posFilter)
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.club.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (getGemScore(b) ?? 0) - (getGemScore(a) ?? 0));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: "min(420px, calc(100vw - 32px))", maxHeight: "76vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 4 }}>ADD TO SQUAD</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif", marginBottom: 12 }}>Add Player</div>

          {/* Position filter */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {["ALL", "GK", "DEF", "MID", "FWD"].map(pos => {
              const col = pos !== "ALL" ? positionColors[pos] : null;
              const active = posFilter === pos;
              return (
                <button key={pos} onClick={() => setPosFilter(pos)} style={{
                  padding: "4px 10px", borderRadius: 6, fontSize: 10,
                  fontFamily: "'DM Mono', monospace", cursor: "pointer", letterSpacing: "0.06em",
                  background: active ? (col ? col.bg : "rgba(200,255,87,0.08)") : "transparent",
                  border: `1px solid ${active ? (col ? col.border : "rgba(200,255,87,0.4)") : "rgba(255,255,255,0.08)"}`,
                  color: active ? (col ? col.text : "#C8FF57") : "rgba(255,255,255,0.35)",
                }}>
                  {pos}
                </button>
              );
            })}
          </div>

          <input autoFocus placeholder="Search by name or club…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }} />
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
          {available.length === 0
            ? <div style={{ padding: "28px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>No available players</div>
            : available.map(p => {
                const gem = getGemScore(p);
                const pos = positionColors[p.position] ?? {};
                return (
                  <div key={p.fantasyId ?? p.name} onClick={() => onSelect(p)} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                    cursor: "pointer", transition: "background 0.1s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <PlayerAvatar player={p} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{p.name}</span>
                        <StatusDot status={p.status} />
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>
                        {p.club} · {p.totalSeasonPoints ?? "—"} pts · €{p.price != null ? Number(p.price).toFixed(3) : "—"}m
                      </div>
                    </div>
                    <div style={{ padding: "2px 7px", borderRadius: 4, background: pos.bg, border: `1px solid ${pos.border}`, color: pos.text, fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
                      {p.position}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#C8FF57", fontFamily: "'DM Mono', monospace", minWidth: 30, textAlign: "right" }}>
                      {gem ?? "—"}
                    </div>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
};

// Module-level normalise — used by SwapModal and App() search
function normaliseStr(str) {
  return (str ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}

// SwapModal: fixed 500×480, fuzzy search with debounce, richer result rows
const SwapModal = ({ player, allPlayers, usedIds, onSelect, onClose }) => {
  const [search, setSearch]             = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const targetId = player.fantasyId ?? player.name;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const candidates = [...allPlayers]
    .filter(p => p.position === player.position)
    .filter(p =>
      !debouncedSearch ||
      normaliseStr(p.name).includes(normaliseStr(debouncedSearch)) ||
      normaliseStr(p.club).includes(normaliseStr(debouncedSearch))
    )
    .sort((a, b) => (getGemScore(b) ?? 0) - (getGemScore(a) ?? 0));

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, width: 500, height: 480, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Fixed header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 3 }}>
            REPLACE PLAYER · {player.position}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif", marginBottom: 10 }}>{player.name}</div>
          <input autoFocus placeholder="Search by name or club…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }} />
        </div>

        {/* Scrollable list — never expands container */}
        <div style={{ overflowY: "auto", flex: 1, padding: "4px 0" }}>
          {candidates.map(p => {
            const gem       = getGemScore(p);
            const pos       = positionColors[p.position] ?? {};
            const isCurrent = (p.fantasyId ?? p.name) === targetId;
            const inSquad   = !isCurrent && usedIds.has(p.fantasyId ?? p.name);
            return (
              <div key={p.fantasyId ?? p.name} onClick={() => !inSquad && onSelect(p)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "9px 18px",
                cursor: inSquad ? "not-allowed" : "pointer", opacity: inSquad ? 0.3 : 1,
                background: isCurrent ? "rgba(200,255,87,0.05)" : "transparent",
                borderLeft: isCurrent ? "2px solid rgba(200,255,87,0.4)" : "2px solid transparent",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => { if (!inSquad) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = isCurrent ? "rgba(200,255,87,0.05)" : "transparent"; }}
              >
                <PlayerAvatar player={p} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                    <StatusDot status={p.status} />
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>
                    {p.club} · {p.totalSeasonPoints ?? "—"} pts
                  </div>
                </div>
                <div style={{ padding: "2px 7px", borderRadius: 4, background: pos.bg, border: `1px solid ${pos.border}`, color: pos.text, fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", flexShrink: 0 }}>
                  {p.position}
                </div>
                {inSquad
                  ? <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", minWidth: 48, textAlign: "right" }}>IN SQUAD</div>
                  : <div style={{ fontSize: 15, fontWeight: 800, color: "#C8FF57", fontFamily: "'DM Mono', monospace", minWidth: 30, textAlign: "right" }}>{gem ?? "—"}</div>
                }
              </div>
            );
          })}
          {candidates.length === 0 && (
            <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>No players found</div>
          )}
        </div>
      </div>
    </div>
  );
};

const SaveLineupModal = ({ onSave, onClose }) => {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const [name, setName] = useState(`My Best 11 · ${today}`);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 400 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 28, width: 360 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 6 }}>SAVE LINEUP</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif", marginBottom: 20 }}>Name your lineup</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && name.trim() && onSave(name.trim())}
          style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#fff", fontSize: 14, fontFamily: "'DM Mono', monospace", outline: "none", marginBottom: 20 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => name.trim() && onSave(name.trim())} style={{ flex: 2, padding: "10px 0", borderRadius: 10, background: "rgba(200,255,87,0.12)", border: "1px solid rgba(200,255,87,0.35)", color: "#C8FF57", fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: "pointer", fontWeight: 700 }}>Save Lineup</button>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, bottomOffset = 28 }) => (
  <div style={{
    position: "fixed", bottom: bottomOffset, left: "50%", transform: "translateX(-50%)",
    background: "rgba(200,255,87,0.12)", border: "1px solid rgba(200,255,87,0.4)",
    borderRadius: 10, padding: "12px 24px", zIndex: 9999,
    color: "#C8FF57", fontFamily: "'DM Mono', monospace", fontSize: 12,
    letterSpacing: "0.06em", whiteSpace: "nowrap", pointerEvents: "none",
  }}>✓ {message}</div>
);

const MySavedLineupsDrawer = ({ onLoad, onClose }) => {
  const [lineups, setLineups] = useState(lsLoad);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName]   = useState("");

  const handleDelete = (id) => { lsDelete(id); setLineups(lsLoad()); };
  const startEdit    = (l)  => { setEditingId(l.id); setEditName(l.name); };
  const commitEdit   = (id) => { lsRename(id, editName.trim() || editName); setLineups(lsLoad()); setEditingId(null); };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />
      <div style={{ position: "fixed", top: 0, right: 0, width: "min(340px, 100vw)", height: "100vh", background: "#141414", borderLeft: "1px solid rgba(255,255,255,0.08)", padding: "28px 0", overflowY: "auto", zIndex: 100, animation: "slideIn 0.25s ease" }}>
        <div style={{ padding: "0 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >×</button>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 4 }}>SAVED LINEUPS</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif" }}>My Lineups</div>
        </div>

        <div style={{ padding: "12px 0" }}>
          {lineups.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", fontSize: 12, lineHeight: 1.8 }}>
              No saved lineups yet.<br />Build your first 11 to save it here.
            </div>
          ) : lineups.map(l => {
            const starters = [...(l.players.GK ?? []), ...(l.players.DEF ?? []), ...(l.players.MID ?? []), ...(l.players.FWD ?? [])];
            const bench    = l.players.bench ?? [];
            const all      = [...starters, ...bench];
            const avgGem    = starters.length ? Math.round(starters.reduce((s, p) => s + (getGemScore(p) ?? 0), 0) / starters.length) : "—";
            const totalPts  = starters.reduce((s, p) => s + (p.totalSeasonPoints ?? 0), 0);
            const totalPrice = all.reduce((s, p) => s + (p.price ?? 0), 0).toFixed(1);
            const date = new Date(l.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });

            return (
              <div key={l.id} style={{ margin: "0 12px 10px", padding: "14px 16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12 }}>
                {editingId === l.id
                  ? <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                      onBlur={() => commitEdit(l.id)}
                      onKeyDown={e => { if (e.key === "Enter") commitEdit(l.id); if (e.key === "Escape") setEditingId(null); }}
                      style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: 700, outline: "none", marginBottom: 10 }} />
                  : <div onDoubleClick={() => startEdit(l)} style={{ fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif", marginBottom: 8, cursor: "text" }} title="Double-click to rename">
                      {l.name}
                    </div>
                }
                <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                  {[
                    { label: "Formation", value: l.formation },
                    { label: "Saved",     value: date },
                    { label: "Avg Gem",   value: avgGem },
                    { label: "Total Pts", value: totalPts },
                    { label: "Price",     value: `€${totalPrice}m` },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>{label.toUpperCase()}</div>
                      <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, fontFamily: "'DM Mono', monospace" }}>{value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onLoad(l)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, background: "rgba(200,255,87,0.1)", border: "1px solid rgba(200,255,87,0.3)", color: "#C8FF57", fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer", fontWeight: 700 }}>Load</button>
                  <button onClick={() => handleDelete(l.id)} style={{ padding: "7px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,77,77,0.25)", color: "rgba(255,77,77,0.6)", fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// ─── Lineup builder modal ─────────────────────────────────────────────────────

const LineupBuilderModal = ({ players, preloaded, onClose, onSaved, inline = false }) => {
  // Compute formation scores once (sorted best→worst)
  const [formScores] = useState(() => compareFormations(players));

  const initFormation = preloaded?.formation ?? formScores[0]?.formation ?? "4-3-3";
  const [formation, setFormation] = useState(initFormation);
  const [lineup, setLineup] = useState(() =>
    preloaded ? { GK: preloaded.players.GK, DEF: preloaded.players.DEF, MID: preloaded.players.MID, FWD: preloaded.players.FWD }
              : buildBest11(players, initFormation)
  );
  const [bench, setBench] = useState(() =>
    preloaded?.players?.bench ?? buildBench(players, preloaded
      ? { GK: preloaded.players.GK, DEF: preloaded.players.DEF, MID: preloaded.players.MID, FWD: preloaded.players.FWD }
      : buildBest11(players, initFormation))
  );

  // swapTarget: { player, source: "lineup" | "bench" } | null
  const [swapTarget, setSwapTarget]   = useState(null);
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showSave, setShowSave]       = useState(false);

  const handleFormation = (f) => {
    const newLineup = buildBest11(players, f);
    setFormation(f);
    setLineup(newLineup);
    setBench(buildBench(players, newLineup));
  };

  const handleReset = () => {
    const newLineup = buildBest11(players, formation);
    setLineup(newLineup);
    setBench(buildBench(players, newLineup));
  };

  const handleSwap      = (player, source = "lineup") => setSwapTarget({ player, source });
  const handleBenchSwap = (player) => setSwapTarget({ player, source: "bench" });

  const handleSelectSwap = (newPlayer) => {
    const { player, source } = swapTarget;
    if (source === "lineup") {
      const sec = player.position;
      const newLineup = { ...lineup, [sec]: (lineup[sec] ?? []).map(p => (p.fantasyId ?? p.name) === (player.fantasyId ?? player.name) ? newPlayer : p) };
      setLineup(newLineup);
      setBench(buildBench(players, newLineup));
    } else {
      setBench(prev => prev.map(p => (p.fantasyId ?? p.name) === (player.fantasyId ?? player.name) ? newPlayer : p));
    }
    setSwapTarget(null);
  };

  // Build the set of IDs unavailable for swap (all squad minus the target)
  const squadUsedIds = (() => {
    const all = [...(lineup.GK ?? []), ...(lineup.DEF ?? []), ...(lineup.MID ?? []), ...(lineup.FWD ?? []), ...bench];
    const targetId = swapTarget?.player ? (swapTarget.player.fantasyId ?? swapTarget.player.name) : null;
    return new Set(all.filter(p => (p.fantasyId ?? p.name) !== targetId).map(p => p.fantasyId ?? p.name));
  })();

  const handleAddPlayer = (player) => {
    setBench(prev => [...prev, player]);
    setShowAddPlayer(false);
  };

  // All squad IDs (for AddPlayerModal — no exclusion needed)
  const allSquadIds = new Set(
    [...(lineup.GK ?? []), ...(lineup.DEF ?? []), ...(lineup.MID ?? []), ...(lineup.FWD ?? []), ...bench]
      .map(p => p.fantasyId ?? p.name)
  );

  const handleSave = (name) => {
    lsSave(name, lineup, bench, formation);
    setShowSave(false);
    onSaved(name);
  };

  const starters   = [...(lineup.GK ?? []), ...(lineup.DEF ?? []), ...(lineup.MID ?? []), ...(lineup.FWD ?? [])];
  const avgGem     = starters.length ? Math.round(starters.reduce((s, p) => s + (getGemScore(p) ?? 0), 0) / starters.length) : 0;
  const totalPts   = starters.reduce((s, p) => s + (p.totalSeasonPoints ?? 0), 0);
  const totalPrice = [...starters, ...bench].reduce((s, p) => s + (p.price ?? 0), 0).toFixed(1);

  const bestFormation = formScores[0]?.formation;

  return (
    <div style={{ ...(inline ? {} : { position: "fixed", inset: 0, zIndex: 200, overflow: "hidden" }), background: "#0b0b0b", display: "flex", flexDirection: "column", ...(inline ? { minHeight: "80vh" } : {}) }}>

      {/* ── Header ── */}
      <div style={{ flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)" }}>

        {/* Row 1: title + stats + save */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {!inline && <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
            >×</button>}
            <div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.12em" }}>LINEUP BUILDER</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif" }}>Best Starting 11</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {[
              { label: "AVG GEM",    value: avgGem,           color: "#C8FF57" },
              { label: "STARTER PTS",value: totalPts,         color: "#fff" },
              { label: "SQUAD PRICE",value: `€${totalPrice}m`,color: "#fff" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>{label}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "'DM Mono', monospace" }}>{value}</div>
              </div>
            ))}
            <button onClick={() => setShowSave(true)} style={{ padding: "10px 20px", borderRadius: 10, background: "rgba(200,255,87,0.12)", border: "1px solid rgba(200,255,87,0.4)", color: "#C8FF57", fontSize: 12, fontFamily: "'DM Mono', monospace", cursor: "pointer", fontWeight: 700, letterSpacing: "0.06em", transition: "background 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,255,87,0.2)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(200,255,87,0.12)"; }}
            >Save Lineup</button>
          </div>
        </div>

        {/* Row 2: Formation pills + controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 28px 14px", overflowX: "auto" }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", flexShrink: 0 }}>FORMATION</div>

          {/* Formation pills */}
          <div style={{ display: "flex", gap: 8 }}>
            {formScores.map((fs, i) => {
              const isActive = formation === fs.formation;
              const isBest   = i === 0;
              return (
                <button key={fs.formation} onClick={() => handleFormation(fs.formation)} style={{
                  padding: "6px 14px", borderRadius: 20, cursor: "pointer", transition: "all 0.15s",
                  flexShrink: 0, display: "flex", alignItems: "center", gap: 5, fontSize: 12,
                  fontFamily: "'DM Mono', monospace", fontWeight: isActive ? 700 : 400,
                  background: isActive ? "#C8FF57" : "rgba(255,255,255,0.06)",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                  color: isActive ? "#0e0e0e" : "rgba(255,255,255,0.6)",
                }}>
                  {fs.formation}
                  {isBest && (
                    <span style={{ fontSize: 7, background: isActive ? "rgba(0,0,0,0.2)" : "rgba(200,255,87,0.2)", color: isActive ? "#0e0e0e" : "#C8FF57", padding: "1px 5px", borderRadius: 3, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em" }}>
                      BEST
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ width: 1, height: 28, background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

          {/* Use Best button */}
          <button onClick={() => handleFormation(bestFormation)} style={{
            padding: "6px 14px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
            background: formation === bestFormation ? "rgba(200,255,87,0.15)" : "rgba(200,255,87,0.06)",
            border: "1px solid rgba(200,255,87,0.3)",
            color: "#C8FF57", fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(200,255,87,0.18)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = formation === bestFormation ? "rgba(200,255,87,0.15)" : "rgba(200,255,87,0.06)"; }}
          >
            ✦ Use Best
          </button>

          <button onClick={handleReset} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", flexShrink: 0, background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'DM Mono', monospace" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* ── Pitch + Bench ── */}
      <div style={{ flex: 1, overflow: "auto", padding: "20px 28px 28px" }}>
        <Pitch lineup={lineup} onSwap={(p) => handleSwap(p, "lineup")} />

        {/* Bench */}
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.14em" }}>
              BENCH · {bench.length} PLAYERS
            </div>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            {bench.map(p => <LineupPlayerCard key={p.fantasyId ?? p.name} player={p} onSwap={handleBenchSwap} dim />)}
            <AddPlayerCard onClick={() => setShowAddPlayer(true)} />
          </div>
        </div>
      </div>

      {swapTarget && (
        <SwapModal
          player={swapTarget.player}
          allPlayers={players}
          usedIds={squadUsedIds}
          onSelect={handleSelectSwap}
          onClose={() => setSwapTarget(null)}
        />
      )}
      {showAddPlayer && (
        <AddPlayerModal
          allPlayers={players}
          usedIds={allSquadIds}
          onSelect={handleAddPlayer}
          onClose={() => setShowAddPlayer(false)}
        />
      )}
      {showSave && <SaveLineupModal onSave={handleSave} onClose={() => setShowSave(false)} />}
    </div>
  );
};

// ─── Compare components ───────────────────────────────────────────────────────

const CompareBar = ({ compareIds, players, onToggle, onClear, onCompare }) => {
  const selected = players.filter(p => compareIds.has(p.fantasyId ?? p.name));
  if (compareIds.size === 0) return null;
  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 56,
      background: "#181818", borderTop: "1px solid rgba(200,255,87,0.2)",
      display: "flex", alignItems: "center", padding: "0 24px", gap: 16, zIndex: 200,
    }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
        {compareIds.size} selected
      </span>
      <div style={{ display: "flex", gap: 8, flex: 1, overflow: "hidden" }}>
        {selected.map(p => (
          <div key={p.fantasyId ?? p.name} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 20,
            background: "rgba(200,255,87,0.1)", border: "1px solid rgba(200,255,87,0.25)",
            fontSize: 11, color: "#C8FF57", fontFamily: "'Syne', sans-serif", flexShrink: 0,
          }}>
            {p.name.split(/\s+/).slice(-1)[0]}
            <span onClick={() => onToggle(p)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 13, lineHeight: 1 }}>✕</span>
          </div>
        ))}
      </div>
      {compareIds.size === 1
        ? <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>Pick another to compare</span>
        : <button onClick={onCompare} style={{ padding: "8px 18px", borderRadius: 8, background: "rgba(200,255,87,0.12)", border: "1px solid rgba(200,255,87,0.35)", color: "#C8FF57", fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer", fontWeight: 700, flexShrink: 0 }}>Compare</button>
      }
      <button onClick={onClear} style={{ padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer", flexShrink: 0 }}>Clear</button>
    </div>
  );
};

const CompareModal = ({ players, onClose }) => {
  const statKeys = [
    { label: "Season Pts", key: "totalSeasonPoints", better: "higher" },
    { label: "Pts / Game", key: "pointsPer90",        better: "higher" },
    { label: "Price",      key: "price",               better: "lower"  },
    { label: "Growth %",   key: "growthPct",           better: "higher" },
  ];

  const isWinner = (stat, player) => {
    const vals = players.map(p => p[stat.key] ?? null).filter(v => v != null);
    if (vals.length < 2) return false;
    const val = player[stat.key];
    if (val == null) return false;
    const best = stat.better === "higher" ? Math.max(...vals) : Math.min(...vals);
    return vals.filter(v => v === best).length === 1 && val === best;
  };

  const cols = players.length;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 350 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#181818", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: `min(${180 + cols * 170}px, 92vw)`, maxHeight: "88vh", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#181818", zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 3 }}>COMPARE</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{players.length} Players</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.5)", width: 32, height: 32, borderRadius: 8, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s, color 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >×</button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {/* Player header row */}
          <div style={{ display: "grid", gridTemplateColumns: `110px repeat(${cols}, 1fr)`, gap: 12, marginBottom: 20, alignItems: "center" }}>
            <div />
            {players.map(p => {
              const pos = positionColors[p.position] ?? {};
              return (
                <div key={p.fantasyId ?? p.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <PlayerAvatar player={p} />
                  <div style={{ textAlign: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 2 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{p.name.split(/\s+/).slice(-1)[0]}</span>
                      <StatusDot status={p.status} />
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'DM Mono', monospace" }}>{p.club}</div>
                  </div>
                  <div style={{ padding: "2px 8px", borderRadius: 5, background: pos.bg, border: `1px solid ${pos.border}`, fontSize: 9, color: pos.text, fontFamily: "'DM Mono', monospace" }}>{p.position}</div>
                </div>
              );
            })}
          </div>

          {/* Score rings row */}
          <div style={{ display: "grid", gridTemplateColumns: `110px repeat(${cols}, 1fr)`, gap: 12, marginBottom: 4, alignItems: "center" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>SCORES</div>
            {players.map(p => {
              const gem = getGemScore(p);
              return (
                <div key={p.fantasyId ?? p.name} style={{ display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap" }}>
                  {[
                    { val: gem,               color: "#C8FF57" },
                    { val: p.efficiency,      color: "#C8FF57" },
                    { val: p.reliability,     color: "#57C8FF" },
                    { val: p.valueScore ?? 0, color: "#FF9F57" },
                  ].map(({ val, color }, ri) => (
                    val != null ? <ScoreRing key={ri} value={val} color={color} size={48} /> : null
                  ))}
                </div>
              );
            })}
          </div>
          {/* Score ring labels */}
          <div style={{ display: "grid", gridTemplateColumns: `110px repeat(${cols}, 1fr)`, gap: 12, marginBottom: 20 }}>
            <div />
            {players.map(p => (
              <div key={p.fantasyId ?? p.name} style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                {["GEM", "EFF", "REL", "VAL"].map(label => (
                  <div key={label} style={{ width: 48, textAlign: "center", fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "'DM Mono', monospace" }}>{label}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Stat grid */}
          {statKeys.map(stat => (
            <div key={stat.key} style={{ display: "grid", gridTemplateColumns: `110px repeat(${cols}, 1fr)`, gap: 12, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>{stat.label}</div>
              {players.map(p => {
                const win = isWinner(stat, p);
                const val = p[stat.key];
                const display = stat.key === "price"     ? (val != null ? `€${Number(val).toFixed(3)}m` : "—")
                              : stat.key === "growthPct"  ? (val != null ? `${val > 0 ? "+" : ""}${val}%` : "—")
                              : val ?? "—";
                return (
                  <div key={p.fantasyId ?? p.name} style={{ textAlign: "center", fontSize: 15, fontWeight: win ? 700 : 400, color: win ? "#C8FF57" : "#fff", fontFamily: "'DM Mono', monospace" }}>
                    {display}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Form row */}
          <div style={{ display: "grid", gridTemplateColumns: `110px repeat(${cols}, 1fr)`, gap: 12, padding: "10px 0", borderTop: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>Form</div>
            {players.map(p => (
              <div key={p.fantasyId ?? p.name} style={{ display: "flex", justifyContent: "center" }}>
                <FormDots values={p.form?.length ? p.form : null} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [players, setPlayers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dataSource, setDataSource] = useState(null);
  const [sortCol, setSortCol]       = useState("valueScore");
  const [sortDir, setSortDir]       = useState("desc");
  const [sortMode, setSortMode]     = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [posFilter, setPosFilter]           = useState("ALL");
  const [pointsBracket, setPointsBracket]   = useState(POINTS_BRACKETS[0]);
  const [valueTooltip, setValueTooltip]     = useState(false);
  const [activeView, setActiveView]         = useState("table"); // "table" | "lineup"
  const [showLineupsDrawer, setShowLineupsDrawer] = useState(false);
  const [compareIds, setCompareIds]         = useState(new Set());
  const [showCompare, setShowCompare]       = useState(false);
  const [preloadedLineup, setPreloadedLineup]     = useState(null);
  const [toast, setToast]                         = useState(null);
  const [searchQuery, setSearchQuery]             = useState("");
  const [showSuggestions, setShowSuggestions]     = useState(false);
  const [highlightedId, setHighlightedId]         = useState(null);
  const [lang, setLang]                           = useState(() => { try { return localStorage.getItem("lang") || "en"; } catch { return "en"; } });

  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.en;
  const toggleLang = () => { const next = lang === "en" ? "es" : "en"; setLang(next); try { localStorage.setItem("lang", next); } catch {} };
  const [session, setSession]                     = useState(null); // null=loading, obj once resolved
  const rowRefs = useRef({});

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const handleLoadSavedLineup = (saved) => { setPreloadedLineup(saved); setShowLineupsDrawer(false); setActiveView("lineup"); };

  const toggleCompare = (player) => {
    const id = player.fantasyId ?? player.name;
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  useEffect(() => {
    let cancelled = false;
    fetchAllPlayers()
      .then(data => {
        if (cancelled) return;
        setPlayers(data); setDataSource("live"); setLoading(false);
        enrichWithTrends(data).then(enriched => { if (!cancelled) setPlayers(enriched); }).catch(() => {});
      })
      .catch(() => {
        if (cancelled) return;
        setPlayers(mockPlayers); setDataSource("mock"); setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then(r => r.json())
      .then(setSession)
      .catch(() => setSession({ authenticated: false }));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession({ authenticated: false });
  };

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(col); setSortDir("desc"); setSortMode(null); }
  };
  const handleSortMode = (mode) => { setSortMode(mode); setSortCol(mode.key); setSortDir("desc"); };

  const normalise = (str) => (str ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

  const matchScore = (player, query) => {
    const q = normalise(query);
    const name = normalise(player.name);
    const club = normalise(player.club);
    if (name.startsWith(q)) return 100;
    if (name.includes(q)) return 80;
    if (club.includes(q)) return 60;
    const queryTokens = q.split("");
    const matches = queryTokens.filter(c => name.includes(c)).length;
    return Math.round((matches / queryTokens.length) * 50);
  };

  const suggestions = searchQuery.length >= 2
    ? players
        .map(p => ({ ...p, score: matchScore(p, searchQuery) }))
        .filter(p => p.score > 30)
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
    : [];

  const handleSelectSuggestion = (player) => {
    setSearchQuery(player.name);
    setSelectedPlayerId(player.fantasyId);
    setShowSuggestions(false);
    setHighlightedId(player.fantasyId);
    setTimeout(() => setHighlightedId(null), 1200);
    setTimeout(() => {
      const el = rowRefs.current[player.fantasyId];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const activeKey = sortMode?.key ?? sortCol;
  const filtered = players
    .filter(p => posFilter === "ALL" || p.position === posFilter)
    .filter(p => selectedPlayerId
      ? p.fantasyId === selectedPlayerId
      : !searchQuery || matchScore(p, searchQuery) > 30)
    .filter(p => (p.totalSeasonPoints ?? 0) >= pointsBracket.min && (p.totalSeasonPoints ?? 0) < pointsBracket.max)
    .sort((a, b) => sortDir === "desc" ? (b[activeKey] ?? 0) - (a[activeKey] ?? 0) : (a[activeKey] ?? 0) - (b[activeKey] ?? 0));

  const colWidths = {
    name:               "22%",
    totalSeasonPoints:  "10%",
    pointsPer90:        "10%",
    efficiency:         "12%",
    reliability:        "12%",
    valueScore:         "10%",
    form:               "12%",
    price:              "12%",
  };

  const cols = [
    { key: "name",              label: t.players,    sortable: false },
    { key: "totalSeasonPoints", label: t.seasonPts,  sortable: true },
    { key: "pointsPer90",       label: t.ptsP90,     sortable: true },
    { key: "efficiency",        label: t.efficiency, sortable: true },
    { key: "reliability",       label: t.reliability, sortable: true },
    { key: "valueScore",        label: t.value,      sortable: true },
    { key: "form",              label: t.last5,      sortable: false },
    { key: "price",             label: t.price,      sortable: true },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0e0e0e", padding: "clamp(20px, 5vw, 40px) clamp(12px, 3vw, 24px)", fontFamily: "'Syne', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        tr:hover td { background: rgba(255,255,255,0.03) !important; }
        @keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }
        @keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes rowPulse { 0%, 30% { box-shadow: inset 0 0 0 1px rgba(200,255,87,0.5); } 100% { box-shadow: none; } }
        .row-highlighted { animation: rowPulse 1.2s ease-out forwards; }
        @media (max-width: 640px) {
          .col-hide-mobile { display: none !important; }
          .filter-divider { display: none; }
          .player-avatar-wrap { display: none; }
          .player-club { display: none; }
          .page-title { font-size: 22px !important; }
          table { table-layout: auto !important; }
        }
      `}</style>

      <div style={{ width: "100%" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(200,255,87,0.7)", letterSpacing: "0.12em" }}>LA LIGA FANTASY · 2025/26</div>
              {dataSource === "live" && <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 4, background: "rgba(200,255,87,0.1)", border: "1px solid rgba(200,255,87,0.25)", color: "rgba(200,255,87,0.7)" }}>LIVE</div>}
              {dataSource === "mock" && <div style={{ fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>DEMO DATA</div>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={toggleLang} style={{ padding: "7px 12px", borderRadius: 8, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
              >{lang === "en" ? "EN" : "ES"}</button>
              <button onClick={() => setShowLineupsDrawer(true)} style={{ padding: "7px 16px", borderRadius: 8, fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.color = "#fff"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
              >{t.myLineups}</button>
            </div>
            {session?.authenticated && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "rgba(255,255,255,0.4)" }}>
                  Connected as <span style={{ color: "#C8FF57" }}>{session.nickname}</span>
                </span>
                <button
                  onClick={handleLogout}
                  style={{ padding: "5px 12px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'DM Mono', monospace", cursor: "pointer", letterSpacing: "0.06em" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,77,77,0.4)"; e.currentTarget.style.color = "#FF7A7A"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.35)"; }}
                >Logout</button>
              </div>
            )}
            {/* Login coming soon */}
          </div>

          <h1 className="page-title" style={{ fontSize: 32, fontWeight: 800, color: "#fff", marginBottom: 20 }}>{t.title}</h1>

          {/* Filter bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {["ALL", "FWD", "MID", "DEF", "GK"].map(pos => {
              const col = pos !== "ALL" ? positionColors[pos] : null;
              const active = posFilter === pos;
              const label = pos === "ALL" ? t.posAll : pos;
              return (
                <button key={pos} onClick={() => setPosFilter(pos)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid", borderColor: active ? (col ? col.border : "rgba(200,255,87,0.4)") : "rgba(255,255,255,0.08)", background: active ? (col ? col.bg : "rgba(200,255,87,0.08)") : "transparent", color: active ? (col ? col.text : "#C8FF57") : "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s" }}>
                  {label}
                </button>
              );
            })}

            <div className="filter-divider" style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

            {POINTS_BRACKETS.map(bracket => {
              const active = pointsBracket.label === bracket.label;
              return (
                <button key={bracket.label} onClick={() => setPointsBracket(bracket)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid", borderColor: active ? "rgba(200,255,87,0.4)" : "rgba(255,255,255,0.08)", background: active ? "rgba(200,255,87,0.08)" : "transparent", color: active ? "#C8FF57" : "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.15s" }}>
                  {bracket.label}
                </button>
              );
            })}

            <div className="filter-divider" style={{ width: 1, height: 20, background: "rgba(255,255,255,0.1)", margin: "0 4px" }} />

            {SORT_MODES.map(mode => {
              const active = sortMode?.key === mode.key;
              const orange = mode.accent;
              return (
                <button key={mode.key} onClick={() => handleSortMode(mode)} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid", borderColor: active ? (orange ? "rgba(255,159,87,0.5)" : "rgba(200,255,87,0.4)") : "rgba(255,255,255,0.08)", background: active ? (orange ? "rgba(255,159,87,0.1)" : "rgba(200,255,87,0.08)") : "transparent", color: active ? (orange ? "#FF9F57" : "#C8FF57") : "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", cursor: "pointer", transition: "all 0.15s" }}>
                  {mode.label}
                </button>
              );
            })}

            <div style={{ flexGrow: 1 }} />

            <div style={{ position: "relative", width: 260 }}>
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedPlayerId(null); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder={t.search}
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 32px 8px 36px", color: "#fff", fontFamily: "'DM Mono', monospace", fontSize: 12, outline: "none" }}
              />
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4, fontSize: 16, pointerEvents: "none" }}>⌕</span>
              {(searchQuery || selectedPlayerId) && (
                <span onClick={() => { setSearchQuery(""); setSelectedPlayerId(null); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", cursor: "pointer", opacity: 0.4, fontSize: 16, lineHeight: 1 }}>×</span>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 300, background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, overflow: "hidden" }}>
                  {suggestions.map((p, i) => (
                    <div key={p.fantasyId} onMouseDown={() => handleSelectSuggestion(p)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: i < suggestions.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {p.image
                        ? <img src={p.image} style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
                        : <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                      }
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#fff", fontFamily: "'Syne', sans-serif", fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontFamily: "'DM Mono', monospace" }}>{p.club} · {p.position}</div>
                      </div>
                      <div style={{ marginLeft: "auto", fontSize: 11, color: "#C8FF57", fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{p.totalSeasonPoints} pts</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {[{ label: t.players, key: "table" }, { label: t.buildMy11, key: "lineup" }].map(tab => {
            const active = activeView === tab.key;
            return (
              <button key={tab.key} onClick={() => { setActiveView(tab.key); if (tab.key === "lineup") setPreloadedLineup(null); }} style={{
                padding: "10px 22px", background: active ? "rgba(200,255,87,0.06)" : "transparent",
                border: "none", borderBottom: active ? "2px solid #C8FF57" : "2px solid transparent",
                color: active ? "#C8FF57" : "rgba(255,255,255,0.4)",
                fontSize: 13, fontFamily: "'Syne', sans-serif", fontWeight: active ? 800 : 400,
                cursor: "pointer", letterSpacing: "0.04em", transition: "all 0.15s",
              }}>
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeView === "lineup" && (
          <LineupBuilderModal
            inline
            players={players}
            preloaded={preloadedLineup}
            onClose={() => { setActiveView("table"); setPreloadedLineup(null); }}
            onSaved={(name) => showToast(`"${name}" saved!`)}
          />
        )}

        {activeView === "table" && <>

        {/* Table */}
        <div style={{ border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>{cols.map(col => <col key={col.key} style={{ width: colWidths[col.key] }} />)}</colgroup>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {cols.map(col => (
                  <th key={col.key} className={["pointsPer90","efficiency","reliability","valueScore"].includes(col.key) ? "col-hide-mobile" : ""} onClick={() => col.sortable && handleSort(col.key)}
                    onMouseEnter={() => col.key === "valueScore" && setValueTooltip(true)}
                    onMouseLeave={() => col.key === "valueScore" && setValueTooltip(false)}
                    style={{ padding: col.key === "name" ? "12px 14px" : col.key === "form" ? "12px 8px" : "12px 14px", textAlign: col.key === "name" ? "left" : "center", fontSize: 10, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", color: sortCol === col.key ? (col.key === "valueScore" ? "#FF9F57" : "#C8FF57") : "rgba(255,255,255,0.35)", cursor: col.sortable ? "pointer" : "default", userSelect: "none", whiteSpace: "nowrap", transition: "color 0.15s", position: "relative" }}>
                    {col.label.toUpperCase()}
                    {col.key === "valueScore" && <span style={{ marginLeft: 4, fontSize: 9, color: "rgba(255,159,87,0.5)", border: "1px solid rgba(255,159,87,0.3)", borderRadius: "50%", width: 13, height: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", verticalAlign: "middle", cursor: "help" }}>?</span>}
                    {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                    {col.key === "valueScore" && valueTooltip && (
                      <div style={{ position: "absolute", top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "#1e1e1e", border: "1px solid rgba(255,159,87,0.25)", borderRadius: 10, padding: "10px 14px", width: 220, textAlign: "left", pointerEvents: "none", whiteSpace: "normal" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#FF9F57", fontFamily: "'Syne', sans-serif", marginBottom: 6 }}>{t.valueTooltipTitle}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>{t.valueTooltipBody}</div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <SkeletonRows /> : filtered.map((player, i) => {
                const pos = positionColors[player.position];
                const isSelected = selectedPlayer?.name === player.name;
                const inCompare = compareIds.has(player.fantasyId ?? player.name);
                return (
                  <tr key={player.fantasyId ?? player.name}
                    ref={el => { if (player.fantasyId) rowRefs.current[player.fantasyId] = el; }}
                    className={highlightedId === player.fantasyId ? "row-highlighted" : ""}
                    onClick={() => setSelectedPlayer(isSelected ? null : player)}
                    style={{ cursor: "pointer", borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", background: highlightedId === player.fantasyId ? "rgba(200,255,87,0.12)" : isSelected ? "rgba(200,255,87,0.04)" : "transparent", outline: inCompare ? "1px solid rgba(200,255,87,0.35)" : "none", outlineOffset: -1 }}>

                    {/* ── Name cell ── */}
                    <td style={{ padding: "8px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={e => { e.stopPropagation(); toggleCompare(player); }} style={{
                          flexShrink: 0, width: 22, height: 22, borderRadius: 5,
                          background: inCompare ? "rgba(200,255,87,0.15)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${inCompare ? "rgba(200,255,87,0.4)" : "rgba(255,255,255,0.1)"}`,
                          color: inCompare ? "#C8FF57" : "rgba(255,255,255,0.3)",
                          fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s", padding: 0,
                        }}>
                          {inCompare ? "✓" : "+"}
                        </button>
                        <span className="player-avatar-wrap"><PlayerAvatar player={player} /></span>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: "19.5px" }}>{player.name}</div>
                            <div className="player-club" style={{ display: "flex", alignItems: "center", gap: 5, lineHeight: "16.5px" }}>
                              <TeamCrest teamId={player.teamId} size={13} />
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.club}</span>
                            </div>
                          </div>
                          <div style={{ flexShrink: 0, width: 38, boxSizing: "border-box", padding: "2px 8px", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", background: pos.bg, border: `1px solid ${pos.border}`, fontSize: 12, color: pos.text, fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em", lineHeight: 1.5 }}>{player.position}</div>
                        </div>
                      </div>
                    </td>

                    {/* ── Season pts ── */}
                    <td style={{ padding: 14, textAlign: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: "#fff", fontFamily: "'DM Mono', monospace" }}>{player.totalSeasonPoints ?? "—"}</span>
                    </td>

                    {/* ── Pts / 90 ── */}
                    <td className="col-hide-mobile" style={{ padding: 14, textAlign: "center" }}>
                      <span style={{ fontSize: 15, fontWeight: 500, color: "#fff", fontFamily: "'DM Mono', monospace" }}>{player.pointsPer90}</span>
                    </td>

                    {/* ── Score bars ── */}
                    <td className="col-hide-mobile" style={{ padding: 14 }}><ScoreBar value={player.efficiency}       color="#C8FF57" /></td>
                    <td className="col-hide-mobile" style={{ padding: 14 }}><ScoreBar value={player.reliability}      color="#57C8FF" /></td>
                    <td className="col-hide-mobile" style={{ padding: 14 }}><ScoreBar value={player.valueScore ?? 0}  color="#FF9F57" /></td>

                    {/* ── Last 5 dots ── */}
                    <td style={{ padding: "14px 8px" }}>
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <FormDots values={player.form} />
                      </div>
                    </td>

                    {/* ── Price + growth ── */}
                    <td style={{ padding: "8px 14px", textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "#fff", fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>
                        {player.price != null ? `€ ${Number(player.price).toFixed(3)}m` : "—"}
                      </div>
                      {player.growthPct != null && player.growthPct !== 0 && (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 3, marginTop: 1 }}>
                          <span style={{ fontSize: 9, color: player.growthPct > 0 ? "#C8FF57" : "#FF5757", lineHeight: 1 }}>{player.growthPct > 0 ? "▲" : "▼"}</span>
                          <span style={{ fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 500, color: player.growthPct > 0 ? "#C8FF57" : "#FF5757", lineHeight: 1.5 }}>{Math.abs(player.growthPct)}%</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.2)", fontFamily: "'DM Mono', monospace", display: "flex", justifyContent: "space-between" }}>
          <span>Click any row to see the full player breakdown</span>
          {!loading && <span>Showing {filtered.length} player{filtered.length !== 1 ? "s" : ""}{pointsBracket.label !== "All" ? ` · ${pointsBracket.label} pts` : ""}{sortMode ? ` · sorted by ${sortMode.label.replace(/[^\w\s]/g, "").trim()}` : ""}</span>}
        </div>

        </>}
      </div>

      {selectedPlayer && activeView === "table" && (
        <>
          <div onClick={() => setSelectedPlayer(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />
          <DetailPanel player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
        </>
      )}

      {showLineupsDrawer && (
        <MySavedLineupsDrawer onLoad={handleLoadSavedLineup} onClose={() => setShowLineupsDrawer(false)} />
      )}

      <CompareBar
        compareIds={compareIds}
        players={players}
        onToggle={toggleCompare}
        onClear={() => setCompareIds(new Set())}
        onCompare={() => setShowCompare(true)}
      />

      {showCompare && (
        <CompareModal
          players={players.filter(p => compareIds.has(p.fantasyId ?? p.name))}
          onClose={() => setShowCompare(false)}
        />
      )}

      {toast && <Toast message={toast} bottomOffset={compareIds.size > 0 ? 72 : 28} />}
    </div>
  );
}
