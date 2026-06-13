const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

function createEmitter() {
  const listeners = new Map();

  return {
    emit(type, payload) {
      const typeListeners = listeners.get(type) || [];
      const allListeners = listeners.get("*") || [];
      [...typeListeners, ...allListeners].forEach((listener) => listener(payload));
    },
    on(type, listener) {
      const typeListeners = listeners.get(type) || [];
      listeners.set(type, [...typeListeners, listener]);

      return () => {
        listeners.set(
          type,
          (listeners.get(type) || []).filter((current) => current !== listener)
        );
      };
    },
    clear() {
      listeners.clear();
    },
  };
}

function sendJson(channel, message) {
  if (channel?.readyState !== "open") return false;
  channel.send(JSON.stringify(message));
  return true;
}

export function createWebRtcRoom({ peerId, signal, iceServers = DEFAULT_ICE_SERVERS }) {
  const emitter = createEmitter();
  const peers = new Map();

  function ensurePeer(remotePeerId, { polite = false, createChannel = false } = {}) {
    const existingPeer = peers.get(remotePeerId);
    if (existingPeer) return existingPeer;

    const connection = new RTCPeerConnection({ iceServers });
    const peer = {
      peerId: remotePeerId,
      connection,
      channel: null,
      polite,
      ignoreOffer: false,
      makingOffer: false,
    };

    connection.addEventListener("icecandidate", (event) => {
      if (!event.candidate) return;
      signal(remotePeerId, {
        kind: "ice-candidate",
        candidate: event.candidate,
      });
    });

    connection.addEventListener("connectionstatechange", () => {
      emitter.emit("peer:connection-state", {
        peerId: remotePeerId,
        state: connection.connectionState,
      });
    });

    connection.addEventListener("datachannel", (event) => {
      attachChannel(peer, event.channel);
    });

    if (createChannel) {
      attachChannel(peer, connection.createDataChannel("songle-session", {
        ordered: true,
      }));
    }

    peers.set(remotePeerId, peer);
    return peer;
  }

  function attachChannel(peer, channel) {
    peer.channel = channel;

    channel.addEventListener("open", () => {
      emitter.emit("peer:open", { peerId: peer.peerId });
    });

    channel.addEventListener("close", () => {
      emitter.emit("peer:close", { peerId: peer.peerId });
    });

    channel.addEventListener("message", (event) => {
      try {
        emitter.emit("message", {
          peerId: peer.peerId,
          message: JSON.parse(event.data),
        });
      } catch {
        emitter.emit("message:error", { peerId: peer.peerId });
      }
    });
  }

  async function callPeer(remotePeerId) {
    const peer = ensurePeer(remotePeerId, { createChannel: true });

    if (peer.connection.signalingState !== "stable") return;

    try {
      peer.makingOffer = true;
      const offer = await peer.connection.createOffer();
      await peer.connection.setLocalDescription(offer);
      signal(remotePeerId, {
        kind: "offer",
        description: peer.connection.localDescription,
      });
    } finally {
      peer.makingOffer = false;
    }
  }

  async function handleSignal(remotePeerId, payload) {
    const peer = ensurePeer(remotePeerId, { polite: peerId > remotePeerId });

    if (payload.kind === "offer") {
      const offerCollision =
        peer.makingOffer || peer.connection.signalingState !== "stable";

      peer.ignoreOffer = !peer.polite && offerCollision;
      if (peer.ignoreOffer) return;

      if (offerCollision) {
        await peer.connection.setLocalDescription({ type: "rollback" });
      }

      await peer.connection.setRemoteDescription(payload.description);
      const answer = await peer.connection.createAnswer();
      await peer.connection.setLocalDescription(answer);
      signal(remotePeerId, {
        kind: "answer",
        description: peer.connection.localDescription,
      });
      return;
    }

    if (payload.kind === "answer") {
      if (peer.connection.signalingState !== "have-local-offer") return;

      await peer.connection.setRemoteDescription(payload.description);
      return;
    }

    if (payload.kind === "ice-candidate" && payload.candidate) {
      try {
        await peer.connection.addIceCandidate(payload.candidate);
      } catch (error) {
        if (!peer.ignoreOffer) throw error;
      }
    }
  }

  function sendTo(remotePeerId, message) {
    return sendJson(peers.get(remotePeerId)?.channel, message);
  }

  function broadcast(message) {
    let sent = 0;

    for (const peer of peers.values()) {
      if (sendJson(peer.channel, message)) {
        sent += 1;
      }
    }

    return sent;
  }

  function removePeer(remotePeerId) {
    const peer = peers.get(remotePeerId);
    if (!peer) return;

    peer.channel?.close();
    peer.connection.close();
    peers.delete(remotePeerId);
  }

  function close() {
    for (const remotePeerId of peers.keys()) {
      removePeer(remotePeerId);
    }
    emitter.clear();
  }

  return {
    callPeer,
    handleSignal,
    sendTo,
    broadcast,
    removePeer,
    close,
    on: emitter.on,
    getConnectedPeerIds() {
      return Array.from(peers.values())
        .filter((peer) => peer.channel?.readyState === "open")
        .map((peer) => peer.peerId);
    },
  };
}
