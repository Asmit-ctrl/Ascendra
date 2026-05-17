/**
 * Tests for the conversation persistence helpers in socratic-history.ts.
 *
 * Uses an in-memory localStorage shim so tests don't depend on jsdom.
 * Compatible with vitest (globals: true) and jest if either is wired up.
 */

// @ts-ignore - globals provided by the test runner
declare const describe: (name: string, fn: () => void) => void;
// @ts-ignore
declare const it: (name: string, fn: () => void) => void;
// @ts-ignore
declare const expect: any;
// @ts-ignore
declare const beforeEach: (fn: () => void) => void;

import {
  loadHistory,
  saveHistory,
  clearHistory,
  capHistory,
  MAX_TURNS,
  HISTORY_VERSION,
  type StoredChatMessage,
} from "../socratic-history";

class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
}

function installStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  // @ts-ignore - we are intentionally injecting a fake global
  globalThis.window = { localStorage: storage };
  return storage;
}

describe("socratic-history round-trip", () => {
  beforeEach(() => {
    installStorage();
  });

  it("returns [] when no history is stored", () => {
    expect(loadHistory("alice", "Mathematics")).toEqual([]);
  });

  it("persists and reloads messages in order", () => {
    const msgs: StoredChatMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "Karibu!" },
      { role: "user", content: "what is a fraction" },
    ];
    saveHistory("alice", "Mathematics", msgs);
    expect(loadHistory("alice", "Mathematics")).toEqual(msgs);
  });

  it("scopes by studentId + subject independently", () => {
    saveHistory("alice", "Mathematics", [{ role: "user", content: "A" }]);
    saveHistory("bob", "Mathematics", [{ role: "user", content: "B" }]);
    saveHistory("alice", "English", [{ role: "user", content: "C" }]);
    expect(loadHistory("alice", "Mathematics")[0].content).toBe("A");
    expect(loadHistory("bob", "Mathematics")[0].content).toBe("B");
    expect(loadHistory("alice", "English")[0].content).toBe("C");
  });

  it("clearHistory removes only the target conversation", () => {
    saveHistory("alice", "Mathematics", [{ role: "user", content: "A" }]);
    saveHistory("alice", "English", [{ role: "user", content: "C" }]);
    clearHistory("alice", "Mathematics");
    expect(loadHistory("alice", "Mathematics")).toEqual([]);
    expect(loadHistory("alice", "English")).toHaveLength(1);
  });
});

describe("socratic-history defensive behaviour", () => {
  beforeEach(() => {
    installStorage();
  });

  it("truncates oversized message arrays to MAX_TURNS on save", () => {
    const long: StoredChatMessage[] = Array.from({ length: MAX_TURNS + 10 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg-${i}`,
    }));
    const persisted = saveHistory("alice", "Mathematics", long);
    expect(persisted).toHaveLength(MAX_TURNS);
    // We keep the most recent MAX_TURNS; oldest are dropped.
    expect(persisted[0].content).toBe(`msg-${10}`);
    expect(persisted[persisted.length - 1].content).toBe(`msg-${MAX_TURNS + 9}`);
  });

  it("drops messages with invalid roles or empty content", () => {
    const dirty = [
      { role: "user", content: "ok" },
      { role: "system", content: "not allowed" } as any,
      { role: "assistant", content: "" } as any,
      { role: "assistant", content: "fine" },
    ];
    const persisted = saveHistory("alice", "Mathematics", dirty);
    expect(persisted).toHaveLength(2);
    expect(persisted[0].content).toBe("ok");
    expect(persisted[1].content).toBe("fine");
  });

  it("returns [] and clears the slot when the envelope version is stale", () => {
    const storage = installStorage();
    storage.setItem(
      `socraticChat.v1:alice:Mathematics`,
      JSON.stringify({
        version: 0,
        studentId: "alice",
        subject: "Mathematics",
        updatedAt: Date.now(),
        messages: [{ role: "user", content: "old" }],
      })
    );
    expect(loadHistory("alice", "Mathematics")).toEqual([]);
    // Stale data is purged.
    expect(storage.getItem(`socraticChat.v1:alice:Mathematics`)).toBeNull();
  });

  it("returns [] when the stored JSON is corrupt", () => {
    const storage = installStorage();
    storage.setItem(`socraticChat.v1:alice:Mathematics`, "{not json");
    expect(loadHistory("alice", "Mathematics")).toEqual([]);
  });

  it("rejects empty studentId or subject without throwing", () => {
    expect(() => saveHistory("", "Mathematics", [])).not.toThrow();
    expect(loadHistory("", "Mathematics")).toEqual([]);
    expect(() => clearHistory("alice", "")).not.toThrow();
  });

  it("HISTORY_VERSION is exported and equals the on-disk schema version", () => {
    expect(HISTORY_VERSION).toBe(1);
  });
});

describe("capHistory", () => {
  it("is a no-op when under the cap", () => {
    const arr = [1, 2, 3];
    expect(capHistory(arr, 10)).toEqual([1, 2, 3]);
  });

  it("keeps the most recent N when over the cap", () => {
    const arr = [1, 2, 3, 4, 5];
    expect(capHistory(arr, 3)).toEqual([3, 4, 5]);
  });

  it("defaults to MAX_TURNS when no cap argument supplied", () => {
    const arr = Array.from({ length: MAX_TURNS + 5 }, (_, i) => i);
    expect(capHistory(arr)).toHaveLength(MAX_TURNS);
  });
});
