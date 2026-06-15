import {
  addFriend,
  getFriends,
  removeFriend,
  subscribeFriends,
} from "./friends.js";
import {
  getFriendPresence,
  presenceLabel,
  subscribePresence,
} from "./presence.js";

export interface SocialSettingsOptions {
  getRoomCode: () => string;
  canSendInvite: () => boolean;
  onGoToPlay: () => void;
  onInviteFriend: (name: string) => void;
  refreshPresence: () => void;
}

export interface SocialSettingsHandle {
  refreshInviteCode: () => void;
  refreshFriends: () => void;
  setStatus: (text: string) => void;
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
    const canInvite = options.canSendInvite();
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
      const online = getFriendPresence(friend.name);
      if (online) {
        presence.className = `friend-presence ${online.status}`;
        presence.textContent = presenceLabel(online.status);
      } else {
        presence.className = "friend-presence offline";
        presence.textContent = "Offline";
      }

      meta.append(name, presence);

      const actions = document.createElement("div");
      actions.className = "friend-actions";

      if (online && canInvite) {
        const inviteBtn = document.createElement("button");
        inviteBtn.type = "button";
        inviteBtn.className = "btn btn-primary friend-invite";
        inviteBtn.textContent = "INVITE";
        inviteBtn.addEventListener("click", () => {
          options.onInviteFriend(friend.name);
        });
        actions.append(inviteBtn);
      }

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "btn btn-secondary friend-remove";
      removeBtn.textContent = "REMOVE";
      removeBtn.addEventListener("click", () => {
        removeFriend(friend.id);
        setStatus(`Removed ${friend.name}.`);
        options.refreshPresence();
      });

      actions.append(removeBtn);
      row.append(meta, actions);
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
    options.refreshPresence();
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

  subscribeFriends(() => {
    renderFriends();
    options.refreshPresence();
  });
  subscribePresence(renderFriends);
  renderFriends();
  refreshInviteCode();

  return {
    refreshInviteCode,
    refreshFriends: renderFriends,
    setStatus,
  };
}
