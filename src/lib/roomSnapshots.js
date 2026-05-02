const SNAPSHOT_TTL_MS = 60 * 60 * 1000;
const SNAPSHOT_PREFIX = "songle-room:";

function snapshotKey(roomId) {
  return `${SNAPSHOT_PREFIX}${roomId}`;
}

function pruneRoomSnapshots() {
  const now = Date.now();
  const snapshots = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(SNAPSHOT_PREFIX)) continue;

    try {
      const snapshot = JSON.parse(localStorage.getItem(key));
      if (!snapshot?.expiresAt || snapshot.expiresAt <= now) {
        localStorage.removeItem(key);
        continue;
      }

      snapshots.push({
        key,
        savedAt: snapshot.savedAt || 0,
      });
    } catch {
      localStorage.removeItem(key);
    }
  }

  snapshots
    .sort((a, b) => a.savedAt - b.savedAt)
    .slice(0, Math.max(0, snapshots.length - 3))
    .forEach((snapshot) => localStorage.removeItem(snapshot.key));
}

export function saveRoomSnapshot(roomId, snapshot) {
  if (!roomId || typeof localStorage === "undefined") return;

  const savedAt = Date.now();
  const serializedSnapshot = JSON.stringify({
    ...snapshot,
    roomId,
    savedAt,
    expiresAt: savedAt + SNAPSHOT_TTL_MS,
  });

  try {
    localStorage.setItem(snapshotKey(roomId), serializedSnapshot);
  } catch (error) {
    pruneRoomSnapshots();

    try {
      localStorage.setItem(snapshotKey(roomId), serializedSnapshot);
    } catch (retryError) {
      console.warn("Could not save room snapshot.", retryError || error);
    }
  }
}

export function loadRoomSnapshot(roomId) {
  if (!roomId || typeof localStorage === "undefined") return null;

  const rawSnapshot = localStorage.getItem(snapshotKey(roomId));
  if (!rawSnapshot) return null;

  try {
    const snapshot = JSON.parse(rawSnapshot);

    if (!snapshot.expiresAt || snapshot.expiresAt <= Date.now()) {
      localStorage.removeItem(snapshotKey(roomId));
      return null;
    }

    return snapshot;
  } catch {
    localStorage.removeItem(snapshotKey(roomId));
    return null;
  }
}

export function clearRoomSnapshot(roomId) {
  if (!roomId || typeof localStorage === "undefined") return;
  localStorage.removeItem(snapshotKey(roomId));
}

export function createSnapshot({ roomId, peerId, revision, session, catalog, localPlayer, phase }) {
  const nextRevision = revision || (session?.revision || 0) + 1;
  const sentAtEpoch = Date.now();

  return {
    roomId,
    peerId,
    sentAtEpoch,
    localPlayer,
    revision: nextRevision,
    phase,
    session: {
      ...session,
      revision: nextRevision,
      phase,
    },
    catalog,
  };
}

export function chooseNewestSnapshot(snapshots) {
  return snapshots
    .filter(Boolean)
    .sort((a, b) => {
      if ((b.revision || 0) !== (a.revision || 0)) {
        return (b.revision || 0) - (a.revision || 0);
      }

      if ((b.savedAt || 0) !== (a.savedAt || 0)) {
        return (b.savedAt || 0) - (a.savedAt || 0);
      }

      return String(a.peerId || "").localeCompare(String(b.peerId || ""));
    })[0] || null;
}
