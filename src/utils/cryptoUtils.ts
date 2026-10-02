/**
 * Offline 4-digit PIN Security Utility
 * Uses Web Crypto API (SHA-256) with unique salt to securely store the PIN.
 */

const PIN_HASH_KEY = 'rent_app_pin_hash';
const PIN_SALT_KEY = 'rent_app_pin_salt';
const PIN_ENABLED_KEY = 'rent_app_pin_enabled';

async function sha256(str: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isPinProtectionEnabled(): boolean {
  return localStorage.getItem(PIN_ENABLED_KEY) === 'true' && Boolean(localStorage.getItem(PIN_HASH_KEY));
}

export async function setupAppPin(pin: string): Promise<void> {
  const salt = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const hash = await sha256(pin + salt);
  localStorage.setItem(PIN_HASH_KEY, hash);
  localStorage.setItem(PIN_SALT_KEY, salt);
  localStorage.setItem(PIN_ENABLED_KEY, 'true');
}

export async function verifyAppPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_HASH_KEY);
  const salt = localStorage.getItem(PIN_SALT_KEY);
  if (!storedHash || !salt) return true; // No PIN set
  const enteredHash = await sha256(pin + salt);
  return enteredHash === storedHash;
}

export function removeAppPin(): void {
  localStorage.removeItem(PIN_HASH_KEY);
  localStorage.removeItem(PIN_SALT_KEY);
  localStorage.setItem(PIN_ENABLED_KEY, 'false');
}
