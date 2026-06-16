import {
  getArenaLeaderboardRows,
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

export function initProgressionUi(): { refresh: () => void } {
  const rankNameEl = document.getElementById("progress-rank-name")!;
  const rankMetaEl = document.getElementById("progress-rank-meta")!;
  const rankBarEl = document.getElementById("progress-rank-bar") as HTMLElement;
  const seasonEl = document.getElementById("progress-season-meta")!;
  const leaderboardEl = document.getElementById("arena-leaderboard")!;

  function render(): void {
    const state = getProgressionState();
    const rankProgress = getRankProgress(state.totalWins);
    const season = getSeasonProgress();

    rankNameEl.textContent = rankProgress.current.name.toUpperCase();
    if (rankProgress.next) {
      const winsNeeded = rankProgress.next.minWins - state.totalWins;
      rankMetaEl.textContent = `${state.totalWins} wins · ${winsNeeded} to ${rankProgress.next.name}`;
    } else {
      rankMetaEl.textContent = `${state.totalWins} wins · max rank`;
    }
    rankBarEl.style.width = `${Math.round(rankProgress.progress * 100)}%`;

    seasonEl.textContent =
      season.wins > 0
        ? `${season.label} season · ${season.wins} win${season.wins === 1 ? "" : "s"}`
        : `${season.label} season · no wins yet`;

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
