// Abstraction over window.storage (Tauri) with localStorage fallback for web.
declare global {
  interface Window {
    storage?: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    if (window.storage) {
      const r = await window.storage.get(key);
      return r ? (JSON.parse(r.value) as T) : null;
    }
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<void> {
  try {
    if (window.storage) {
      await window.storage.set(key, JSON.stringify(value));
      return;
    }
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // silently fail — storage unavailable
  }
}
