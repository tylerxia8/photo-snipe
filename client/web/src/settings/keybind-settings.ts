import {
  formatKeyCode,
  getKeybinds,
  isReservedBindingCode,
  KEYBIND_ACTIONS,
  KEYBIND_LABELS,
  resetKeybinds,
  setKeybind,
  type KeybindAction,
} from "./keybinds.js";

export function initKeybindSettings(onChange?: () => void): void {
  const rowsEl = document.getElementById("keybind-rows")!;
  const statusEl = document.getElementById("keybind-status")!;
  const resetBtn = document.getElementById("keybind-reset") as HTMLButtonElement;

  const buttons = new Map<KeybindAction, HTMLButtonElement>();
  let listening: KeybindAction | null = null;

  function setStatus(text: string): void {
    statusEl.textContent = text;
  }

  function refreshButtons(): void {
    const binds = getKeybinds();
    for (const action of KEYBIND_ACTIONS) {
      buttons.get(action)!.textContent = formatKeyCode(binds[action]);
    }
    onChange?.();
  }

  function stopListening(): void {
    if (!listening) {
      return;
    }
    buttons.get(listening)?.classList.remove("listening");
    listening = null;
    setStatus("");
  }

  function startListening(action: KeybindAction): void {
    stopListening();
    listening = action;
    buttons.get(action)?.classList.add("listening");
    setStatus(`Press a key for ${KEYBIND_LABELS[action].toLowerCase()}…`);
  }

  rowsEl.replaceChildren();
  for (const action of KEYBIND_ACTIONS) {
    const row = document.createElement("div");
    row.className = "keybind-row";

    const label = document.createElement("span");
    label.className = "keybind-label";
    label.textContent = KEYBIND_LABELS[action];

    const button = document.createElement("button");
    button.type = "button";
    button.className = "keybind-btn";
    button.dataset.action = action;
    button.addEventListener("click", () => startListening(action));

    row.append(label, button);
    rowsEl.append(row);
    buttons.set(action, button);
  }

  refreshButtons();

  resetBtn.addEventListener("click", () => {
    stopListening();
    resetKeybinds();
    refreshButtons();
    setStatus("Restored default keybinds.");
  });

  window.addEventListener("keydown", (event) => {
    if (!listening) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (event.code === "Escape") {
      stopListening();
      setStatus("Rebind cancelled.");
      return;
    }

    if (isReservedBindingCode(event.code)) {
      setStatus("That key is reserved. Pick another.");
      return;
    }

    const conflict = setKeybind(listening, event.code);
    if (conflict) {
      setStatus(`Already bound to ${conflict.toLowerCase()}.`);
      return;
    }

    const action = listening;
    stopListening();
    refreshButtons();
    setStatus(`Bound ${KEYBIND_LABELS[action].toLowerCase()} to ${formatKeyCode(event.code)}.`);
  });
}
