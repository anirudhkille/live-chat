import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { StateStorage } from "zustand/middleware";

/**
 * The auth session contains bearer tokens, so it must never be written to
 * AsyncStorage as plaintext. `live-chat.auth.secure` lives in the platform
 * keystore and `live-chat.auth` is only read once to migrate existing installs.
 */
export const SECURE_AUTH_STORAGE_KEY = "live-chat.auth.secure";
export const LEGACY_AUTH_STORAGE_KEY = "live-chat.auth";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// expo-secure-store has no web implementation. Keep web sessions in memory only
// rather than silently persisting tokens to localStorage.
const memoryStorage = new Map<string, string>();
let legacyCleanupDone = false;
let legacyMigrationPromise: Promise<string | null> | null = null;

function isPersistedSession(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    const state = (parsed as { state?: unknown }).state;
    return Boolean(state && typeof state === "object");
  } catch {
    return false;
  }
}

function isClearedSession(raw: string): boolean {
  try {
    const parsed = JSON.parse(raw) as {
      state?: { token?: unknown; refreshToken?: unknown; user?: unknown };
    };
    const state = parsed?.state;
    return (
      Boolean(state) &&
      (state?.token === null || state?.token === undefined) &&
      (state?.refreshToken === null || state?.refreshToken === undefined) &&
      (state?.user === null || state?.user === undefined)
    );
  } catch {
    return false;
  }
}

async function readSecureItem(name: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return memoryStorage.get(name) ?? null;
  }

  try {
    return await SecureStore.getItemAsync(name, SECURE_STORE_OPTIONS);
  } catch {
    return null;
  }
}

async function writeSecureItem(name: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    memoryStorage.set(name, value);
    return;
  }

  try {
    await SecureStore.setItemAsync(name, value, SECURE_STORE_OPTIONS);
  } catch {
    // A failed write must not crash the app; the user simply has to sign in
    // again after a restart if the keystore is unavailable.
  }
}

async function deleteSecureItem(name: string): Promise<void> {
  if (Platform.OS === "web") {
    memoryStorage.delete(name);
    return;
  }

  try {
    await SecureStore.deleteItemAsync(name, SECURE_STORE_OPTIONS);
  } catch {
    // Nothing to delete or the keystore is unavailable.
  }
}

/**
 * Removes the pre-secure-store key. This intentionally runs even when the
 * secure key already exists so an abandoned plaintext copy cannot linger.
 */
export async function clearLegacyAuthStorage(): Promise<void> {
  if (legacyCleanupDone) return;
  legacyCleanupDone = true;

  try {
    await AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
  } catch {
    // Best effort: a failed cleanup is retried on the next cold start.
    legacyCleanupDone = false;
  }
}

async function migrateLegacyAuthStorage(name: string): Promise<string | null> {
  if (legacyMigrationPromise) return legacyMigrationPromise;

  legacyMigrationPromise = (async () => {
    try {
      const legacy = await AsyncStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
      if (!legacy) return null;

      if (!isPersistedSession(legacy)) {
        await AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
        return null;
      }

      await writeSecureItem(name, legacy);
      await AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      return legacy;
    } catch {
      return null;
    } finally {
      legacyMigrationPromise = null;
    }
  })();

  return legacyMigrationPromise;
}

export const secureAuthStorage: StateStorage = {
  getItem: async (name) => {
    const existing = await readSecureItem(name);
    if (existing) {
      await clearLegacyAuthStorage();
      return existing;
    }

    return migrateLegacyAuthStorage(name);
  },
  setItem: async (name, value) => {
    // Clearing the session should remove the keystore entry instead of
    // rewriting a record that only contains nulls.
    if (isClearedSession(value)) {
      await deleteSecureItem(name);
      return;
    }

    await writeSecureItem(name, value);
  },
  removeItem: async (name) => {
    await deleteSecureItem(name);
  },
};
