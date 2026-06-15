export function getActivePeers(peers) {
  return peers.filter((peer) => peer && !peer.replaced);
}

export function normalizePlayerName(name) {
  return String(name || "").trim();
}

export function findActivePeerByName(peers, name, exceptPeerId) {
  const normalizedName = normalizePlayerName(name).toLocaleLowerCase();

  if (!normalizedName) return null;

  return getActivePeers(peers).find((peer) => {
    return (
      peer.peerId !== exceptPeerId &&
      normalizePlayerName(peer.name).toLocaleLowerCase() === normalizedName
    );
  }) || null;
}

export function validateJoinName(peers, { peerId, name }) {
  const normalizedName = normalizePlayerName(name);

  if (!normalizedName) {
    return {
      ok: false,
      reason: "missing-name",
      message: "Please select a name before joining.",
    };
  }

  if (findActivePeerByName(peers, normalizedName, peerId)) {
    return {
      ok: false,
      reason: "duplicate-name",
      message: "Name is already in use, please select another one.",
    };
  }

  return {
    ok: true,
    name: normalizedName,
  };
}

export function getHostPeer(peers, exceptPeerId) {
  return getActivePeers(peers)
    .filter((peer) => peer.peerId !== exceptPeerId)
    .find((peer) => peer.role === "host" && peer.canHost) || null;
}

export function electHostPeer(peers, exceptPeerId) {
  return getActivePeers(peers)
    .filter((peer) => peer.peerId !== exceptPeerId && peer.canHost)
    .sort((a, b) => {
      if (a.joinedAt !== b.joinedAt) {
        return a.joinedAt - b.joinedAt;
      }

      return a.peerId.localeCompare(b.peerId);
    })[0] || null;
}
