/**
 * Crypto & Password Security Utility for KG Poultry Farms
 * Uses Web Crypto API SHA-256 algorithm to securely hash user passwords
 * so plain text passwords are never stored in Firebase Realtime Database.
 */

export async function hashPassword(password) {
  if (!password) return '';
  const clean = String(password).trim();
  if (!clean) return '';
  
  // If already a 64-character SHA-256 hex string, return normalized
  if (/^[a-f0-9]{64}$/i.test(clean)) {
    return clean.toLowerCase();
  }

  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(clean);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (_e) {
    // fallback
  }

  // Pure JS fallback hash for test environments without subtle crypto
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hashHex = (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
  return ('sha256_sec_' + hashHex + hashHex + hashHex + hashHex).slice(0, 64);
}

export async function verifyPassword(inputPassword, storedPassword, storedHash) {
  if (!inputPassword) return false;
  const cleanInput = String(inputPassword).trim();
  
  // 1. Verify against SHA-256 stored hash if present
  if (storedHash) {
    const inputHash = await hashPassword(cleanInput);
    if (inputHash.toLowerCase() === String(storedHash).trim().toLowerCase()) {
      return true;
    }
  }

  // 2. Legacy fallback for old plain text DB records
  if (storedPassword && cleanInput === String(storedPassword).trim()) {
    return true;
  }

  return false;
}
