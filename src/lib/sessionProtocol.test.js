import assert from "node:assert/strict";
import test from "node:test";
import {
  allPlayersReady,
  createPlayer,
  createSession,
  getRoundReadyPlayers,
  markPlayerLeft,
  setPlayerReady,
} from "./sessionProtocol.js";

function createTestSession(players) {
  return {
    ...createSession({
      playlistId: "test",
      catalog: { snapshotId: "catalog:test" },
      hostName: "Host",
    }),
    players,
  };
}

test("REQ-DISC-003: leave handling removes a player from active session state", () => {
  const alice = createPlayer({ id: "alice", name: "Alice" });
  const bob = createPlayer({ id: "bob", name: "Bob" });
  const session = {
    ...createTestSession([alice, bob]),
    scores: { alice: 100, bob: 75 },
  };

  const nextSession = markPlayerLeft(session, "bob");
  const leftPlayer = nextSession.players.find((player) => player.id === "bob");

  assert.equal(leftPlayer, undefined);
  assert.equal(nextSession.players.length, 1);
  assert.equal(nextSession.scores.bob, 75);
});

test("REQ-DISC-003: disconnected players are excluded from ready checks", () => {
  const alice = { ...createPlayer({ id: "alice", name: "Alice" }), ready: true };
  const bob = { ...createPlayer({ id: "bob", name: "Bob" }), ready: true };
  const session = markPlayerLeft(createTestSession([alice, bob]), "bob");

  assert.deepEqual(
    getRoundReadyPlayers(session).map((player) => player.id),
    ["alice"]
  );
  assert.equal(allPlayersReady(session), true);
});

test("REQ-SYNC-002: ready state updates are deterministic pure session changes", () => {
  const alice = createPlayer({ id: "alice", name: "Alice" });
  const session = createTestSession([alice]);

  const readySession = setPlayerReady(session, "alice", true);

  assert.equal(readySession.players[0].ready, true);
  assert.equal(session.players[0].ready, false);
});
