# Songle Signaling Worker

Tiny Cloudflare Worker + Durable Object service for browser-only room setup.

The worker is only a signaling relay:

- Create/join rooms by URL.
- Track connected peers in one Durable Object per room.
- Elect one live host peer per room.
- Relay WebRTC `offer`, `answer`, and `ice-candidate` messages.
- Do not store quiz answers, scores, Spotify tokens, or audio.

The browser app still owns the quiz session. Once peers have a WebRTC
`RTCDataChannel`, quiz messages can move peer-to-peer.

## Host Migration And Resume

The room elects the first connected peer as host. If that peer disconnects, the
remaining peer with the earliest `joinedAt` timestamp becomes host.

The worker does not persist room state after everyone leaves. Instead, browsers
cache the latest `session:snapshot` in `localStorage` for one hour. If all peers
leave and one of the previous players later opens the same room link, that
browser can restore the cached snapshot and broadcast it to newly connected
players.

## Endpoints

```txt
GET /health
GET /room/:roomId
```

`/room/:roomId` must be opened as a WebSocket:

```txt
wss://signal.example.com/room/abc123?peerId=...&name=Alfred&role=host
```

## Message Shape

Client to worker:

```json
{
  "type": "signal",
  "to": "target-peer-id",
  "payload": {
    "kind": "offer",
    "description": {}
  }
}
```

Worker to client:

```json
{
  "type": "signal",
  "from": "source-peer-id",
  "payload": {
    "kind": "answer",
    "description": {}
  }
}
```

## Deploy Later

Install Wrangler locally, then from this folder:

```powershell
npm install
npx wrangler deploy
```

For your Cloudflare-owned domain, attach a Custom Domain such as
`signal.yourdomain.com` to this Worker. Cloudflare will manage DNS and TLS for
that hostname when configured as a Worker Custom Domain.
