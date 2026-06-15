import {
  addFriend,
  getFriends,
  removeFriend,
  subscribeFriends,
} from "./friends.js";

export interface SocialSettingsOptions {
  getRoomCode: () => string;
  onGoToPlay: () => void;
}

export interface SocialSettingsHandle {
  refreshInviteCode: () => void;
}

export function initSocialSettings(options: SocialSettingsOptions): SocialSettingsHandle {
  const listEl = document.getElementById("friend-list")!;
  const emptyEl = document.getElementById("friend-list-empty")!;
  const statusEl = document.getElementById("social-status")!;
  const addInput = document.getElementById("friend-add-input") as HTMLInputElement;
  const addBtn = document.getElementById("friend-add-btn") as HTMLButtonElement;
  const copyInviteBtn = document.getElementById("copy-invite-btn") as HTMLButtonElement;
  const hostInviteBtn = document.getElementById("host-invite-btn") as HTMLButtonElement;
  const inviteCodeEl = document.getElementById("invite-room-code")!;

  function setStatus(text: string): void {
    statusEl.textContent = text;
  }

  function refreshInviteCode(): void {
    const code = options.getRoomCode().trim().toUpperCase();
    inviteCodeEl.textContent = code || "—";
    copyInviteBtn.disabled = code.length !== 4;
  }

  function renderFriends(): void {
    const friends = getFriends();
    listEl.replaceChildren();
    emptyEl.classList.toggle("hidden", friends.length > 0);

    for (const friend of friends) {
      const row = document.createElement("div");
      row.className = "friend-row";

      const meta = document.createElement("div");
      meta.className = "friend-meta";

      const name = document.createElement("span");
      name.className = "friend-name";
      name.textContent = friend.name;

      const presence = document.createElement("span");
      presence.className = "friend-presence offline";
      presence.textContent = "Offline";

      meta.append(name, presence);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-secondary friend-remove";
      removeBtn.textContent = "REMOVE";
      removeBtn.addEventListener("click", () => {
        removeFriend(friend.id);
        setStatus(`Removed ${friend.name}.`);
      });

      row.append(meta, removeBtn);
      listEl.append(row);
    }
  }

  function submitAddFriend(): void {
    const result = addFriend(addInput.value);
    if (!result.ok) {
      setStatus(result.reason);
      return;
    }
    addInput.value = "";
    setStatus("Operator added to your friends list.");
  }

  addBtn.addEventListener("click", submitAddFriend);
  addInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAddFriend();
    }
  });

  copyInviteBtn.addEventListener("click", async () => {
    const code = options.getRoomCode().trim().toUpperCase();
    if (code.length !== 4) {
      setStatus("Host a match on Play to get a room code.");
      return;
    }

    const message = `Join my PhotoSnipe match — room code: ${code}`;
    try {
      await navigator.clipboard.writeText(message);
      setStatus("Invite copied to clipboard.");
    } catch {
      setStatus(`Room code: ${code}`);
    }
  });

  hostInviteBtn.addEventListener("click", () => {
    options.onGoToPlay();
    setStatus("Host a match, then share your room code.");
  });

  subscribeFriends(renderFriends);
  renderFriends();
  refreshInviteCode();

  return {
    refreshInviteCode,
  };
}
