import { getSkin, type PlayerSkinId } from "@photo-snipe/core";
import { getArenaLayout } from "@photo-snipe/core";
import { isArenaUnlocked } from "../settings/arena-settings.js";
import { setSkinId, getSkinId, onSkinChange } from "../settings/appearance.js";
import { skinPreviewStyle, updateOperatorPreview } from "../settings/appearance-settings.js";
import { SHOP_ARENA_PASSES, SHOP_SKINS, type ShopItem } from "./catalog.js";
import {
  getCredits,
  isArenaPassOwned,
  isSkinOwned,
  purchaseArenaPass,
  purchaseSkin,
  subscribeShop,
} from "./inventory.js";

export interface ShopSettingsHandle {
  refresh: () => void;
  setStatus: (text: string) => void;
}

export function initShopSettings(): ShopSettingsHandle {
  const creditsEl = document.getElementById("shop-credits")!;
  const skinGridEl = document.getElementById("shop-skin-grid")!;
  const passGridEl = document.getElementById("shop-pass-grid")!;
  const statusEl = document.getElementById("shop-status")!;

  function setStatus(text: string): void {
    statusEl.textContent = text;
  }

  function renderSkinCard(item: ShopItem): HTMLElement {
    const skinId = item.skinId!;
    const skin = getSkin(skinId);
    const owned = isSkinOwned(skinId);
    const equipped = getSkinId() === skinId;

    const card = document.createElement("div");
    card.className = "shop-card";

    const preview = document.createElement("span");
    preview.className = "shop-card-preview skin-swatch";
    preview.style.background = skinPreviewStyle(skin.shirtColor, skin.pantsColor);

    const meta = document.createElement("div");
    meta.className = "shop-card-meta";

    const title = document.createElement("span");
    title.className = "shop-card-title";
    title.textContent = item.name;

    const desc = document.createElement("span");
    desc.className = "shop-card-desc";
    desc.textContent = item.description;

    const price = document.createElement("span");
    price.className = "shop-card-price";
    price.textContent = item.price === 0 ? "FREE" : `${item.price} CR`;

    meta.append(title, desc, price);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "btn btn-secondary shop-card-action";

    if (equipped) {
      action.textContent = "EQUIPPED";
      action.disabled = true;
    } else if (owned) {
      action.textContent = "EQUIP";
      action.classList.add("btn-primary");
      action.addEventListener("click", () => {
        setSkinId(skinId);
        setStatus(`Equipped ${item.name}.`);
        refresh();
      });
    } else if (item.price === 0) {
      action.textContent = "OWNED";
      action.disabled = true;
    } else {
      action.textContent = "BUY";
      action.classList.add("btn-primary");
      action.disabled = getCredits() < item.price;
      action.addEventListener("click", () => {
        const result = purchaseSkin(skinId, item.price);
        if (result.ok === false) {
          setStatus(result.reason);
          return;
        }
        setSkinId(skinId);
        setStatus(`Purchased and equipped ${item.name}.`);
        refresh();
      });
    }

    card.append(preview, meta, action);
    return card;
  }

  function renderPassCard(item: ShopItem): HTMLElement {
    const arenaId = item.arenaId!;
    const arenaName = getArenaLayout(arenaId).name;
    const owned =
      isArenaPassOwned(arenaId) || isArenaUnlocked(arenaId);

    const card = document.createElement("div");
    card.className = "shop-card";

    const preview = document.createElement("span");
    preview.className = "shop-card-preview shop-pass-preview";
    preview.textContent = arenaName
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();

    const meta = document.createElement("div");
    meta.className = "shop-card-meta";

    const title = document.createElement("span");
    title.className = "shop-card-title";
    title.textContent = item.name;

    const desc = document.createElement("span");
    desc.className = "shop-card-desc";
    desc.textContent = item.description;

    const price = document.createElement("span");
    price.className = "shop-card-price";
    price.textContent = `${item.price} CR`;

    meta.append(title, desc, price);

    const action = document.createElement("button");
    action.type = "button";
    action.className = "btn btn-secondary shop-card-action";

    if (owned) {
      action.textContent = isArenaPassOwned(arenaId) ? "OWNED" : "UNLOCKED";
      action.disabled = true;
    } else {
      action.textContent = "BUY PASS";
      action.classList.add("btn-primary");
      action.disabled = getCredits() < item.price;
      action.addEventListener("click", () => {
        const result = purchaseArenaPass(arenaId, item.price);
        if (result.ok === false) {
          setStatus(result.reason);
          return;
        }
        setStatus(`${arenaName} pass purchased. You can host there now.`);
        refresh();
      });
    }

    card.append(preview, meta, action);
    return card;
  }

  function refresh(): void {
    creditsEl.textContent = String(getCredits());

    skinGridEl.replaceChildren();
    for (const item of SHOP_SKINS) {
      skinGridEl.append(renderSkinCard(item));
    }

    passGridEl.replaceChildren();
    for (const item of SHOP_ARENA_PASSES) {
      passGridEl.append(renderPassCard(item));
    }

    updateOperatorPreview();
  }

  subscribeShop(refresh);
  onSkinChange(refresh);
  refresh();

  return { refresh, setStatus };
}
