// ── Vault Store ─────────────────────────────────────────────────────

import { writable, derived } from "svelte/store";
import { v4 as uuid } from "uuid";
import { saveVault, loadVault, vaultExists } from "../services/encryption";
import type { VaultSecret } from "../types";

export const vaultUnlocked = writable(false);
export const vaultSecrets = writable<VaultSecret[]>([]);
export const vaultSearchQuery = writable("");

let masterPassword = "";
let lockTimer: ReturnType<typeof setTimeout> | null = null;
const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const filteredSecrets = derived(
  [vaultSecrets, vaultSearchQuery],
  ([$secrets, $q]) => {
    if (!$q) return $secrets;
    const lower = $q.toLowerCase();
    return $secrets.filter(
      (s) =>
        s.name.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower) ||
        s.notes.toLowerCase().includes(lower),
    );
  },
);

function resetLockTimer() {
  if (lockTimer) clearTimeout(lockTimer);
  lockTimer = setTimeout(() => lockVault(), LOCK_TIMEOUT);
}

export function hasVault(): boolean {
  return vaultExists();
}

export async function unlockVault(password: string): Promise<boolean> {
  try {
    const secrets = await loadVault(password);
    vaultSecrets.set(secrets);
    vaultUnlocked.set(true);
    masterPassword = password;
    resetLockTimer();
    return true;
  } catch {
    return false;
  }
}

export async function createVault(password: string) {
  masterPassword = password;
  await saveVault([], password);
  vaultSecrets.set([]);
  vaultUnlocked.set(true);
  resetLockTimer();
}

export function lockVault() {
  vaultUnlocked.set(false);
  vaultSecrets.set([]);
  masterPassword = "";
  if (lockTimer) clearTimeout(lockTimer);
}

export async function addSecret(
  secret: Omit<VaultSecret, "id" | "created_at" | "updated_at">,
) {
  resetLockTimer();
  const newSecret: VaultSecret = {
    ...secret,
    id: uuid(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  vaultSecrets.update((s) => {
    const updated = [...s, newSecret];
    saveVault(updated, masterPassword);
    return updated;
  });
}

export async function updateSecret(id: string, updates: Partial<VaultSecret>) {
  resetLockTimer();
  vaultSecrets.update((s) => {
    const updated = s.map((sec) =>
      sec.id === id
        ? { ...sec, ...updates, updated_at: new Date().toISOString() }
        : sec,
    );
    saveVault(updated, masterPassword);
    return updated;
  });
}

export async function removeSecret(id: string) {
  resetLockTimer();
  vaultSecrets.update((s) => {
    const updated = s.filter((sec) => sec.id !== id);
    saveVault(updated, masterPassword);
    return updated;
  });
}
