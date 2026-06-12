export type KeybindAction =
  | "moveForward"
  | "moveBack"
  | "moveLeft"
  | "moveRight"
  | "jump"
  | "snap";

export type KeybindMap = Record<KeybindAction, string>;

export const KEYBIND_ACTIONS: KeybindAction[] = [
  "moveForward",
  "moveBack",
  "moveLeft",
  "moveRight",
  "jump",
  "snap",
];

export const KEYBIND_LABELS: Record<KeybindAction, string> = {
  moveForward: "Move forward",
  moveBack: "Move back",
  moveLeft: "Move left",
  moveRight: "Move right",
  jump: "Jump",
  snap: "Snap photo",
};

export const DEFAULT_KEYBINDS: KeybindMap = {
  moveForward: "KeyW",
  moveBack: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  jump: "Space",
  snap: "ShiftLeft",
};

const STORAGE_KEY = "photo-snipe-keybinds";

const listeners = new Set<() => void>();

let cached = loadKeybinds();

function clone(map: KeybindMap): KeybindMap {
  return { ...map };
}

function sanitizeKeybinds(raw: unknown): KeybindMap | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const next = clone(DEFAULT_KEYBINDS);
  const used = new Set<string>();

  for (const action of KEYBIND_ACTIONS) {
    const code = (raw as Record<string, unknown>)[action];
    if (typeof code !== "string" || !code || used.has(code)) {
      return null;
    }
    used.add(code);
    next[action] = code;
  }

  return next;
}

export function loadKeybinds(): KeybindMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return clone(DEFAULT_KEYBINDS);
    }
    const parsed = sanitizeKeybinds(JSON.parse(raw));
    return parsed ?? clone(DEFAULT_KEYBINDS);
  } catch {
    return clone(DEFAULT_KEYBINDS);
  }
}

export function getKeybinds(): KeybindMap {
  return cached;
}

export function saveKeybinds(map: KeybindMap): void {
  cached = clone(map);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  for (const listener of listeners) {
    listener();
  }
}

export function resetKeybinds(): void {
  saveKeybinds(clone(DEFAULT_KEYBINDS));
}

export function onKeybindsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function mouseButtonToCode(button: number): string | null {
  if (button === 0) {
    return "MouseLeft";
  }
  if (button === 2) {
    return "MouseRight";
  }
  return null;
}

export function formatKeyCode(code: string): string {
  const labels: Record<string, string> = {
    MouseLeft: "L CLICK",
    MouseRight: "R CLICK",
    Space: "SPACE",
    ShiftLeft: "L SHIFT",
    ShiftRight: "R SHIFT",
    ControlLeft: "L CTRL",
    ControlRight: "R CTRL",
    AltLeft: "L ALT",
    AltRight: "R ALT",
    ArrowUp: "↑",
    ArrowDown: "↓",
    ArrowLeft: "←",
    ArrowRight: "→",
    Tab: "TAB",
    Enter: "ENTER",
    Backspace: "BACKSPACE",
  };

  if (labels[code]) {
    return labels[code];
  }
  if (code.startsWith("Key")) {
    return code.slice(3);
  }
  if (code.startsWith("Digit")) {
    return code.slice(5);
  }
  return code;
}

export function getControlsHint(): string {
  const binds = getKeybinds();
  const move = [
    binds.moveForward,
    binds.moveLeft,
    binds.moveBack,
    binds.moveRight,
  ]
    .map(formatKeyCode)
    .join("");
  return `${move} move · ${formatKeyCode(binds.jump)} jump · ${formatKeyCode(binds.snap)} snap`;
}

export function setKeybind(action: KeybindAction, code: string): string | null {
  const current = getKeybinds();
  const conflict = KEYBIND_ACTIONS.find(
    (other) => other !== action && current[other] === code,
  );
  if (conflict) {
    return KEYBIND_LABELS[conflict];
  }

  saveKeybinds({ ...current, [action]: code });
  return null;
}

export function isReservedBindingCode(code: string): boolean {
  return code === "Escape" || code === "F5" || code.startsWith("F12");
}
