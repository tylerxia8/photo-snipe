import { getPracticeBotProfile, type PracticeBotDifficulty } from "@photo-snipe/core";
import { getPracticeDifficultyRows } from "../progression/stats.js";

const STORAGE_KEY = "photo-snipe-practice-difficulty";

export function getPracticeDifficulty(): PracticeBotDifficulty {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "easy" || raw === "medium" || raw === "hard") {
    return raw;
  }
  return "hard";
}

export function setPracticeDifficulty(difficulty: PracticeBotDifficulty): void {
  localStorage.setItem(STORAGE_KEY, difficulty);
}

function renderPracticeDifficultyStats(): void {
  const statsEl = document.getElementById("practice-difficulty-stats");
  if (!statsEl) {
    return;
  }

  const selected = getPracticeDifficulty();
  const profile = getPracticeBotProfile(selected);
  const rows = getPracticeDifficultyRows();
  const selectedRow = rows.find((row) => row.id === selected);
  const selectedRecord = selectedRow?.recordLabel ?? "no matches";

  statsEl.textContent =
    `${profile.label} target ~${Math.round(profile.targetPlayerWinRate * 100)}% win rate · ` +
    `Your ${profile.label.toLowerCase()} record: ${selectedRecord} · ` +
    rows.map((row) => `${row.label} ${row.recordLabel}`).join(" · ");
}

export function initPracticeDifficultyUi(): { refresh: () => void } {
  const buttons = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-practice-difficulty]"),
  );

  function syncSelection(): void {
    const selected = getPracticeDifficulty();
    for (const button of buttons) {
      const difficulty = button.dataset.practiceDifficulty as PracticeBotDifficulty;
      button.classList.toggle("active", difficulty === selected);
      button.setAttribute("aria-pressed", String(difficulty === selected));
    }
    renderPracticeDifficultyStats();
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const difficulty = button.dataset.practiceDifficulty as PracticeBotDifficulty;
      setPracticeDifficulty(difficulty);
      syncSelection();
    });
  }

  syncSelection();

  return { refresh: syncSelection };
}
