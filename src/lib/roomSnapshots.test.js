import assert from "node:assert/strict";
import test from "node:test";
import {
  createSnapshot,
  loadRoomSnapshot,
  saveRoomSnapshot,
} from "./roomSnapshots.js";
import {
  applyPlayerRecoveryLedger,
  createPlayerRecoveryLedger,
  loadPlayerRecoveryLedger,
  savePlayerRecoveryLedger,
} from "./playerRecoveryCache.js";

class MemoryStorage {
  constructor() {
    this.items = new Map();
  }

  get length() {
    return this.items.size;
  }

  key(index) {
    return [...this.items.keys()][index] || null;
  }

  getItem(key) {
    return this.items.get(key) || null;
  }

  setItem(key, value) {
    this.items.set(key, String(value));
  }

  removeItem(key) {
    this.items.delete(key);
  }

  clear() {
    this.items.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

test("REQ-REC-002: current room snapshot cache stores full room state", () => {
  localStorage.clear();
  const snapshot = createSnapshot({
    roomId: "room-a",
    peerId: "peer-a",
    revision: 7,
    phase: "lobby",
    localPlayer: { id: "peer-a", name: "Alice" },
    catalog: { snapshotId: "catalog-a", tracks: [{ id: "track-a" }] },
    session: {
      id: "room-a",
      players: [{ id: "peer-a", name: "Alice" }],
      scores: { "peer-a": 100 },
      rounds: [{ id: "round-a" }],
    },
  });

  saveRoomSnapshot("room-a", snapshot);
  const restored = loadRoomSnapshot("room-a");

  assert.equal(restored.roomId, "room-a");
  assert.deepEqual(restored.session.rounds, [{ id: "round-a" }]);
  assert.deepEqual(restored.catalog.tracks, [{ id: "track-a" }]);
  assert.deepEqual(restored.localPlayer, { id: "peer-a", name: "Alice" });
});

test("REQ-REC-002: target cache stores only one-hour player name and score metadata", () => {
  localStorage.clear();
  const now = Date.now();
  const session = {
    players: [{ id: "peer-a", name: "Alice", connected: true, ready: true }],
    scores: { "peer-a": 125 },
    rounds: [{ id: "round-a" }],
    currentRound: { id: "round-b" },
  };

  savePlayerRecoveryLedger("room-a", createPlayerRecoveryLedger(session, now));
  const restored = loadPlayerRecoveryLedger("room-a");

  assert.deepEqual(restored.players["peer-a"], {
    id: "peer-a",
    name: "Alice",
    score: 125,
    savedAt: now,
    expiresAt: now + 60 * 60 * 1000,
  });
  assert.equal(restored.rounds, undefined);
  assert.equal(restored.currentRound, undefined);
});

test("REQ-REC-002: expired player recovery metadata is discarded", () => {
  localStorage.clear();
  savePlayerRecoveryLedger("room-a", {
    players: {
      "peer-a": {
        id: "peer-a",
        name: "Alice",
        score: 125,
        savedAt: 1,
        expiresAt: 1,
      },
    },
  });

  assert.equal(loadPlayerRecoveryLedger("room-a"), null);
});

test("REQ-REC-003: recovery ledger restores score for matching rejoining player", () => {
  const session = {
    players: [{ id: "peer-a", name: "Alice" }],
    scores: {},
  };
  const ledger = {
    players: {
      "peer-a": {
        id: "peer-a",
        name: "Alice",
        score: 125,
        savedAt: Date.now(),
        expiresAt: Date.now() + 1000,
      },
    },
  };

  assert.deepEqual(applyPlayerRecoveryLedger(session, ledger).scores, {
    "peer-a": 125,
  });
});
