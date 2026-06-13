import { DurableObject } from "cloudflare:workers";

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });
}

function send(ws, message) {
  ws.send(JSON.stringify(message));
}

function parseMessage(message) {
  if (typeof message !== "string") return null;

  try {
    return JSON.parse(message);
  } catch {
    return null;
  }
}

function getPeer(ws) {
  return ws.deserializeAttachment();
}

function getPeers(ctx) {
  return ctx.getWebSockets().map((ws) => getPeer(ws)).filter((peer) => peer && !peer.replaced);
}

function replaceExistingPeerSockets(ctx, peerId) {
  ctx.getWebSockets()
    .filter((ws) => {
      const peer = getPeer(ws);
      return peer && !peer.replaced && peer.peerId === peerId;
    })
    .forEach((ws) => {
      const peer = getPeer(ws);
      ws.serializeAttachment({ ...peer, replaced: true });
      ws.close(1000, "Peer reconnected");
    });
}

function getHostPeer(ctx, exceptPeerId) {
  return getPeers(ctx)
    .filter((peer) => peer.peerId !== exceptPeerId)
    .find((peer) => peer.role === "host" && peer.canHost);
}

function electHostPeer(ctx, exceptPeerId) {
  return getPeers(ctx)
    .filter((peer) => peer.peerId !== exceptPeerId && peer.canHost)
    .sort((a, b) => {
      if (a.joinedAt !== b.joinedAt) {
        return a.joinedAt - b.joinedAt;
      }

      return a.peerId.localeCompare(b.peerId);
    })[0] || null;
}

function updatePeerRole(ctx, peerId, role) {
  const socket = ctx
    .getWebSockets()
    .find((ws) => {
      const peer = getPeer(ws);
      return peer && !peer.replaced && peer.peerId === peerId;
    });

  if (!socket) return null;

  const peer = getPeer(socket);
  const updatedPeer = { ...peer, role };
  socket.serializeAttachment(updatedPeer);
  return updatedPeer;
}

export class Room extends DurableObject {
  async fetch(request) {
    if (request.headers.get("upgrade") !== "websocket") {
      return json({ error: "Expected WebSocket upgrade" }, { status: 426 });
    }

    const url = new URL(request.url);
    const peerId = url.searchParams.get("peerId") || crypto.randomUUID();
    const name = url.searchParams.get("name") || "Player";
    const requestedRole = url.searchParams.get("role") || "player";
    const canHost =
      url.searchParams.get("canHost") === "true" ||
      (!url.searchParams.has("canHost") && requestedRole === "host");
    replaceExistingPeerSockets(this.ctx, peerId);
    const currentHost = getHostPeer(this.ctx);
    const role = !currentHost && canHost ? "host" : "player";

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const joinedAt = Date.now();

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ peerId, name, role, joinedAt, canHost });

    send(server, {
      type: "room:welcome",
      peerId,
      hostPeerId: currentHost?.peerId || (role === "host" ? peerId : ""),
      peers: getPeers(this.ctx).filter((peer) => peer.peerId !== peerId),
    });

    this.broadcast(
      {
        type: "peer:joined",
        peer: { peerId, name, role, joinedAt, canHost },
      },
      peerId
    );

    if (!currentHost && role === "host") {
      this.broadcast({
        type: "host:changed",
        hostPeerId: peerId,
        reason: "first-host",
      });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, rawMessage) {
    const sender = getPeer(ws);
    const message = parseMessage(rawMessage);

    if (!sender || !message?.type) {
      return;
    }

    if (message.type === "room:ping") {
      send(ws, { type: "room:pong", at: Date.now() });
      return;
    }

    if (message.type === "signal") {
      this.relaySignal(sender, message);
      return;
    }

    if (message.type.startsWith("session:")) {
      this.broadcast(
        {
          ...message,
          from: sender.peerId,
        },
        sender.peerId
      );
    }
  }

  async webSocketClose(ws, code, reason) {
    const peer = getPeer(ws);

    if (peer?.replaced) {
      ws.close(code, reason);
      return;
    }

    if (peer) {
      this.broadcast({
        type: "peer:left",
        peerId: peer.peerId,
      });

      if (peer.role === "host") {
        const nextHost = electHostPeer(this.ctx, peer.peerId);

        if (nextHost) {
          updatePeerRole(this.ctx, nextHost.peerId, "host");
          this.broadcast({
            type: "host:changed",
            hostPeerId: nextHost.peerId,
            reason: "host-left",
          }, peer.peerId);
        } else {
          this.broadcast({
            type: "host:changed",
            hostPeerId: "",
            reason: "host-left-no-eligible-host",
          }, peer.peerId);
        }
      }
    }

    ws.close(code, reason);
  }

  relaySignal(sender, message) {
    const target = this.ctx
      .getWebSockets()
      .find((ws) => {
        const peer = getPeer(ws);
        return peer && !peer.replaced && peer.peerId === message.to;
      });

    if (!target) {
      const senderSocket = this.ctx
        .getWebSockets()
        .find((ws) => {
          const peer = getPeer(ws);
          return peer && !peer.replaced && peer.peerId === sender.peerId;
        });

      if (senderSocket) {
        send(senderSocket, {
          type: "signal:error",
          to: message.to,
          error: "Peer is not connected",
        });
      }
      return;
    }

    send(target, {
      type: "signal",
      from: sender.peerId,
      payload: message.payload,
    });
  }

  broadcast(message, exceptPeerId) {
    for (const ws of this.ctx.getWebSockets()) {
      const peer = getPeer(ws);

      if (!peer || peer.replaced || peer.peerId === exceptPeerId) {
        continue;
      }

      send(ws, message);
    }
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({ ok: true });
    }

    const roomMatch = url.pathname.match(/^\/room\/([^/]+)$/);

    if (!roomMatch) {
      return json({ error: "Not found" }, { status: 404 });
    }

    const roomId = decodeURIComponent(roomMatch[1]);
    const durableObjectId = env.ROOMS.idFromName(roomId);
    const room = env.ROOMS.get(durableObjectId);

    return room.fetch(request);
  },
};
