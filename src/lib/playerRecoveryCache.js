const RECOVERY_TTL_MS = 60 * 60 * 1000;
const RECOVERY_PREFIX = "songle-player-recovery:";

function recoveryKey(roomId) {
  return `${RECOVERY_PREFIX}${roomId}`;
}

function isStorageAvailable() {
  return typeof localStorage !== "undefined";
}

function isFreshEntry(entry, now = Date.now()) {
  return Boolean(entry?.expiresAt && entry.expiresAt > now);
}

export function createPlayerRecoveryLedger(session, now = Date.now()) {
  const players = {};

  for (const player of session?.players || []) {
    if (!player?.id || !player.name) continue;

    players[player.id] = {
      id: player.id,
      name: player.name,
      score: session.scores?.[player.id] || 0,
      savedAt: now,
      expiresAt: now + RECOVERY_TTL_MS,
    };
  }

  return { players };
}

export function mergePlayerRecoveryLedgers(...ledgers) {
  const now = Date.now();
  const players = {};

  for (const ledger of ledgers.filter(Boolean)) {
    for (const [playerId, entry] of Object.entries(ledger.players || {})) {
      if (!isFreshEntry(entry, now)) continue;

      const currentEntry = players[playerId];
      if (!currentEntry || (entry.savedAt || 0) >= (currentEntry.savedAt || 0)) {
        players[playerId] = {
          id: playerId,
          name: entry.name,
          score: Number.isFinite(entry.score) ? entry.score : 0,
          savedAt: entry.savedAt || now,
          expiresAt: entry.expiresAt,
        };
      }
    }
  }

  return { players };
}

export function loadPlayerRecoveryLedger(roomId) {
  if (!roomId || !isStorageAvailable()) return null;

  const rawLedger = localStorage.getItem(recoveryKey(roomId));
  if (!rawLedger) return null;

  try {
    const ledger = mergePlayerRecoveryLedgers(JSON.parse(rawLedger));
    if (!Object.keys(ledger.players).length) {
      localStorage.removeItem(recoveryKey(roomId));
      return null;
    }

    return ledger;
  } catch {
    localStorage.removeItem(recoveryKey(roomId));
    return null;
  }
}

export function savePlayerRecoveryLedger(roomId, ledger) {
  // REQ-REC-002: Store only one-hour player name/score metadata, never full room state.
  if (!roomId || !isStorageAvailable()) return null;

  const mergedLedger = mergePlayerRecoveryLedgers(loadPlayerRecoveryLedger(roomId), ledger);
  if (!Object.keys(mergedLedger.players).length) return null;

  try {
    localStorage.setItem(recoveryKey(roomId), JSON.stringify(mergedLedger));
    return mergedLedger;
  } catch (error) {
    console.warn("Could not save player recovery ledger.", error);
    return null;
  }
}

export function saveSessionRecoveryLedger(roomId, session) {
  return savePlayerRecoveryLedger(roomId, createPlayerRecoveryLedger(session));
}

export function applyPlayerRecoveryLedger(session, ledger) {
  if (!session || !ledger?.players) return session;

  const scores = { ...(session.scores || {}) };
  let changed = false;

  for (const player of session.players || []) {
    const entry = ledger.players[player.id];
    if (!entry || entry.name !== player.name || scores[player.id] !== undefined) continue;

    scores[player.id] = Number.isFinite(entry.score) ? entry.score : 0;
    changed = true;
  }

  return changed ? { ...session, scores } : session;
}
