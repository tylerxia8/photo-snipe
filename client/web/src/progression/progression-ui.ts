import { formatOperatorTier, getOperatorLadderRows } from "@photo-snipe/core";
import {
  getArenaLeaderboardRows,
  getOperatorRecord,
  getProgressionState,
  getRankProgress,
  getSeasonProgress,
  subscribeProgression,
} from "./stats.js";

function formatArenaMastery(row: {
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
}): string {
  const streak =
    row.currentStreak > 0 ? ` · streak ${row.currentStreak}` : "";
  return `${row.wins}W · ${row.losses}L${streak} · best ${row.bestStreak}`;
}

function formatWinRate(winRate: number): string {
  if (!Number.isFinite(winRate) || winRate <= 0) {
    return "0%";
  }
  return `${Math.round(winRate * 100)}%`;
}

export function initProgressionUi(): { refresh: () => void } {
  const rankNameEl = document.getElementById("progress-rank-name")!;
  const rankTierEl = document.getElementById("progress-rank-tier")!;
  const rankMetaEl = document.getElementById("progress-rank-meta")!;
  const rankRecordEl = document.getElementById("progress-rank-record")!;
  const rankBarEl = document.getElementById("progress-rank-bar") as HTMLElement;
  const rankTrackEl = document.getElementById("progress-rank-track") as HTMLElement;
  const seasonEl = document.getElementById("progress-season-meta")!;
  const ladderEl = document.getElementById("operator-ladder")!;
  const leaderboardEl = document.getElementById("arena-leaderboard")!;

  function render(): void {
    const state = getProgressionState();
    const rankProgress = getRankProgress(state.rankPoints);
    const record = getOperatorRecord();
    const season = getSeasonProgress();

    rankNameEl.textContent = rankProgress.current.name.toUpperCase();
    rankTierEl.textContent = formatOperatorTier(rankProgress.current.tier);
    rankNameEl.style.color = rankProgress.current.accent;
    rankBarEl.style.background = `linear-gradient(90deg, ${rankProgress.current.accent}, #6dffd2)`;

    if (rankProgress.next) {
      rankMetaEl.textContent = `${rankProgress.rankPoints} RP · ${rankProgress.rankPointsToNext} to ${rankProgress.next.name}`;
    } else {
      rankMetaEl.textContent = `${rankProgress.rankPoints} RP · Legend tier`;
    }

    rankRecordEl.textContent = `${state.totalWins}W · ${record.totalLosses}L · ${formatWinRate(record.winRate)} · ${record.onlineWins} online · ${record.practiceWins} practice`;

    rankBarEl.style.width = `${Math.round(rankProgress.progress * 100)}%`;
    rankTrackEl.setAttribute(
      "aria-valuenow",
      String(Math.round(rankProgress.progress * 100)),
    );

    seasonEl.textContent =
      season.wins > 0
        ? `${season.label} season · ${season.wins} win${season.wins === 1 ? "" : "s"}`
        : `${season.label} season · no wins yet`;

    ladderEl.replaceChildren();
    for (const row of getOperatorLadderRows(state.rankPoints)) {
      const item = document.createElement("div");
      item.className = `operator-ladder-row operator-ladder-row--${row.status}`;
      item.style.setProperty("--rank-accent", row.rank.accent);

      const marker = document.createElement("span");
      marker.className = "operator-ladder-marker";
      marker.textContent = row.status === "completed" ? "✓" : row.status === "current" ? "▶" : "·";

      const body = document.createElement("div");
      body.className = "operator-ladder-body";

      const name = document.createElement("span");
      name.className = "operator-ladder-name";
      name.textContent = row.rank.name;

      const tier = document.createElement("span");
      tier.className = "operator-ladder-tier";
      tier.textContent = formatOperatorTier(row.rank.tier);

      body.append(name, tier);

      const requirement = document.createElement("span");
      requirement.className = "operator-ladder-requirement";
      requirement.textContent = row.requirementLabel;

      item.append(marker, body, requirement);
      ladderEl.append(item);
    }

    leaderboardEl.replaceChildren();
    for (const row of getArenaLeaderboardRows()) {
      const item = document.createElement("div");
      item.className = "arena-leaderboard-row";
      if (!row.unlocked) {
        item.classList.add("locked");
      }

      const name = document.createElement("span");
      name.className = "arena-leaderboard-name";
      name.textContent = row.unlocked
        ? row.name
        : `${row.name} · unlock at ${row.unlockWins} wins`;

      const stats = document.createElement("span");
      stats.className = "arena-leaderboard-stats";
      stats.textContent = row.unlocked
        ? formatArenaMastery(row)
        : "Locked";

      item.append(name, stats);
      leaderboardEl.append(item);
    }
  }

  subscribeProgression(render);
  render();

  return { refresh: render };
}
