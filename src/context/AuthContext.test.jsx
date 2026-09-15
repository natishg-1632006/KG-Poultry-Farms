import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

// Dynamic test identifiers generated at runtime
const createDynamicTestUser = () => {
  const stamp = Date.now().toString(36);
  return {
    uid: `uid_${stamp}`,
    name: `User_${stamp}`,
    email: `test_${stamp}@test.local`,
    password: `pass_${stamp}_123`,
    role: 'Farmer',
    active: true,
    assignedBatches: ['KG001']
  };
};

let currentMockUser = createDynamicTestUser();

// Mock firebase auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn().mockImplementation(() => ({})),
  signOut: vi.fn().mockResolvedValue(undefined),
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
  createUserWithEmailAndPassword: vi.fn()
}));

// Mock dbService to return dynamic user records from database query
vi.mock('../services/dbService', () => ({
  dbGetUsers: vi.fn().mockImplementation(async () => [currentMockUser]),
  dbSaveUser: vi.fn().mockResolvedValue({}),
  dbLogAuditEvent: vi.fn().mockResolvedValue({})
}));

// Mock firebase service
vi.mock('../services/firebase', () => ({
  auth: {}
}));

describe('AuthContext Dynamic DB Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    currentMockUser = createDynamicTestUser();
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it('rejects email login if user is not in database', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.login(`unknown_${Date.now()}@test.local`, currentMockUser.password);
      })
    ).rejects.toThrow('Invalid email or password. Please try again.');
  });

  it('rejects email login with incorrect password against DB record', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.login(currentMockUser.email, 'wrong_pass_999');
      })
    ).rejects.toThrow('Invalid email or password. Please try again.');
  });

  it('allows email login with dynamic database credentials', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    let user;
    await act(async () => {
      user = await result.current.login(currentMockUser.email, currentMockUser.password);
    });

    expect(user).toBeDefined();
    expect(user.email).toBe(currentMockUser.email);
  });

  it('rejects Google login if Google account email is not in database', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    signInWithPopup.mockResolvedValueOnce({
      user: { uid: `g_uid_${Date.now()}`, email: `unauth_${Date.now()}@test.local` }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await expect(
      act(async () => {
        await result.current.loginWithGoogle();
      })
    ).rejects.toThrow('Access Denied: Account not authorized in farm database.');
  });

  it('allows Google login for authorized email registered in database', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    signInWithPopup.mockResolvedValueOnce({
      user: { uid: `g_uid_${Date.now()}`, email: currentMockUser.email }
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    let user;
    await act(async () => {
      user = await result.current.loginWithGoogle();
    });

    expect(user).toBeDefined();
    expect(user.email).toBe(currentMockUser.email);
  });
});
