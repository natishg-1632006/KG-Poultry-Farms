import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './cryptoUtils';

describe('cryptoUtils SHA-256 Password Security', () => {
  it('hashes plain text password to 64-char string', async () => {
    const hash = await hashPassword('FarmerPass123!');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBe(64);
  });

  it('produces identical hashes for identical passwords', async () => {
    const hash1 = await hashPassword('SecretPass789');
    const hash2 = await hashPassword('SecretPass789');
    expect(hash1).toBe(hash2);
  });

  it('verifies correct password against SHA-256 hash', async () => {
    const pass = 'MySecurePass2026';
    const hash = await hashPassword(pass);
    const isMatch = await verifyPassword(pass, null, hash);
    expect(isMatch).toBe(true);
  });

  it('rejects incorrect password against SHA-256 hash', async () => {
    const hash = await hashPassword('CorrectPassword');
    const isMatch = await verifyPassword('WrongPassword', null, hash);
    expect(isMatch).toBe(false);
  });

  it('supports legacy plain text password migration', async () => {
    const isMatch = await verifyPassword('LegacyPass123', 'LegacyPass123', null);
    expect(isMatch).toBe(true);
  });
});
