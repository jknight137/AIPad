// ── Encryption Service ──────────────────────────────────────────────
// AES-256-GCM encryption using Web Crypto API for vault secrets
// (Tauri Stronghold requires additional setup — using Web Crypto as a
//  reliable cross-platform fallback that works immediately)

const SALT_KEY = "aipad_vault_salt";
const VAULT_KEY = "aipad_vault_data";

function getStorage() {
  return localStorage;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 600000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encryptData(
  data: string,
  password: string,
): Promise<string> {
  let saltB64 = getStorage().getItem(SALT_KEY);
  let salt: Uint8Array;

  if (!saltB64) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    getStorage().setItem(SALT_KEY, arrayBufferToBase64(salt));
  } else {
    salt = base64ToArrayBuffer(saltB64);
  }

  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data),
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return arrayBufferToBase64(combined);
}

export async function decryptData(
  encryptedB64: string,
  password: string,
): Promise<string> {
  const saltB64 = getStorage().getItem(SALT_KEY);
  if (!saltB64) throw new Error("No vault found");

  const salt = base64ToArrayBuffer(saltB64);
  const key = await deriveKey(password, salt);

  const combined = base64ToArrayBuffer(encryptedB64);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Invalid password");
  }
}

// ── Vault High-Level API ───────────────────────────────────────────

import type { VaultSecret } from "../types";

export async function saveVault(
  secrets: VaultSecret[],
  password: string,
): Promise<void> {
  const data = JSON.stringify(secrets);
  const encrypted = await encryptData(data, password);
  getStorage().setItem(VAULT_KEY, encrypted);
}

export async function loadVault(password: string): Promise<VaultSecret[]> {
  const encrypted = getStorage().getItem(VAULT_KEY);
  if (!encrypted) return [];
  const data = await decryptData(encrypted, password);
  return JSON.parse(data);
}

export function vaultExists(): boolean {
  return getStorage().getItem(VAULT_KEY) !== null;
}

export function deleteVault(): void {
  getStorage().removeItem(VAULT_KEY);
  getStorage().removeItem(SALT_KEY);
}
