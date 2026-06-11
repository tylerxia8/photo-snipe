import { getSkin, PLAYER_SKINS, type PlayerSkinId } from "@photo-snipe/core";
import { getSkinId, onSkinChange, setSkinId } from "./appearance.js";

function hexColor(value: number): string {
  return `#${value.toString(16).padStart(6, "0")}`;
}

function previewFigureStyle(shirtColor: number, pantsColor: number): string {
  const shirt = hexColor(shirtColor);
  const pants = hexColor(pantsColor);
  return [
    "linear-gradient(#3b2a1a 0 10%, transparent 10%)",
    "linear-gradient(#c6946a 10% 28%, transparent 28%)",
    `linear-gradient(${shirt} 28% 52%, transparent 52%)`,
    `linear-gradient(${pants} 52% 100%, transparent 100%)`,
  ].join(", ");
}

export function updateOperatorPreview(skinId = getSkinId()): void {
  const figure = document.querySelector(".kr-preview-figure") as HTMLElement | null;
  if (!figure) {
    return;
  }
  const skin = getSkin(skinId);
  figure.style.background = previewFigureStyle(skin.shirtColor, skin.pantsColor);
}

export function initAppearanceSettings(): void {
  const grid = document.getElementById("skin-grid")!;
  const statusEl = document.getElementById("skin-status")!;
  let selected = getSkinId();

  function setStatus(text: string): void {
    statusEl.textContent = text;
  }

  function refreshSelection(): void {
    selected = getSkinId();
    for (const button of grid.querySelectorAll<HTMLButtonElement>("[data-skin-id]")) {
      button.classList.toggle("selected", button.dataset.skinId === selected);
    }
    updateOperatorPreview(selected);
    setStatus(`Equipped: ${getSkin(selected).name}`);
  }

  grid.replaceChildren();
  for (const skin of PLAYER_SKINS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "skin-option";
    button.dataset.skinId = skin.id;
    button.title = skin.name;

    const swatch = document.createElement("span");
    swatch.className = "skin-swatch";
    swatch.style.background = previewFigureStyle(skin.shirtColor, skin.pantsColor);

    const label = document.createElement("span");
    label.className = "skin-name";
    label.textContent = skin.name;

    button.append(swatch, label);
    button.addEventListener("click", () => {
      setSkinId(skin.id as PlayerSkinId);
      refreshSelection();
    });
    grid.append(button);
  }

  refreshSelection();
  onSkinChange(refreshSelection);
}
