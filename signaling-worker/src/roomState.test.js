import assert from "node:assert/strict";
import test from "node:test";
import {
  electHostPeer,
  findActivePeerByName,
  getActivePeers,
  getHostPeer,
  validateJoinName,
} from "./roomState.js";

test("REQ-DISC-001: active peer list excludes replaced reconnect sockets", () => {
  const peers = [
    { peerId: "old", replaced: true },
    { peerId: "current", replaced: false },
  ];

  assert.deepEqual(getActivePeers(peers), [{ peerId: "current", replaced: false }]);
});

test("REQ-HOST-002: current host lookup ignores non-eligible host roles", () => {
  const peers = [
    { peerId: "guest-host", role: "host", canHost: false },
    { peerId: "real-host", role: "host", canHost: true },
  ];

  assert.equal(getHostPeer(peers)?.peerId, "real-host");
});

test("REQ-HOST-002: host election selects oldest host-eligible peer", () => {
  const peers = [
    { peerId: "guest", canHost: false, joinedAt: 1 },
    { peerId: "later-host", canHost: true, joinedAt: 3 },
    { peerId: "first-host", canHost: true, joinedAt: 2 },
  ];

  assert.equal(electHostPeer(peers)?.peerId, "first-host");
});

test("REQ-HOST-003: host election returns null when no eligible peer remains", () => {
  const peers = [
    { peerId: "guest-a", canHost: false, joinedAt: 1 },
    { peerId: "guest-b", canHost: false, joinedAt: 2 },
  ];

  assert.equal(electHostPeer(peers), null);
});

test("REQ-JOIN-002: duplicate active names are rejected before room:welcome", () => {
  const peers = [
    { peerId: "alice-1", name: "Alice", replaced: false },
    { peerId: "old-bob", name: "Bob", replaced: true },
  ];

  assert.equal(findActivePeerByName(peers, " alice ", "guest-2")?.peerId, "alice-1");
  assert.equal(findActivePeerByName(peers, "bob", "guest-2"), null);
  assert.deepEqual(validateJoinName(peers, { peerId: "guest-2", name: "Alice" }), {
    ok: false,
    reason: "duplicate-name",
    message: "Name is already in use, please select another one.",
  });
});

test("REQ-JOIN-002: reconnecting with the same peer id may reclaim its own name", () => {
  const peers = [{ peerId: "alice-1", name: "Alice", replaced: false }];

  assert.deepEqual(validateJoinName(peers, { peerId: "alice-1", name: " Alice " }), {
    ok: true,
    name: "Alice",
  });
});

test("REQ-JOIN-001: missing names are rejected by the room join rules", () => {
  assert.deepEqual(validateJoinName([], { peerId: "guest-1", name: "" }), {
    ok: false,
    reason: "missing-name",
    message: "Please select a name before joining.",
  });
});
