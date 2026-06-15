import assert from "node:assert/strict";
import test from "node:test";

class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.sentMessages = [];
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, [...listeners, listener]);
  }

  send(message) {
    this.sentMessages.push(message);
  }

  close() {
    this.closed = true;
  }

  emit(type, event) {
    (this.listeners.get(type) || []).forEach((listener) => listener(event));
  }
}

globalThis.WebSocket = FakeWebSocket;

const { createSignalingClient } = await import("./signalingClient.js");

test("REQ-HOST-001: signaling join URL includes host eligibility", () => {
  FakeWebSocket.instances = [];

  createSignalingClient({
    baseUrl: "https://signal.example",
    roomId: "room 1",
    peerId: "peer-a",
    name: "Alice",
    role: "host",
    canHost: true,
  });

  const url = new URL(FakeWebSocket.instances[0].url);
  assert.equal(url.protocol, "wss:");
  assert.equal(url.pathname, "/room/room%201");
  assert.equal(url.searchParams.get("peerId"), "peer-a");
  assert.equal(url.searchParams.get("name"), "Alice");
  assert.equal(url.searchParams.get("role"), "host");
  assert.equal(url.searchParams.get("canHost"), "true");
});

test("REQ-HOST-001: canHost defaults to false", () => {
  FakeWebSocket.instances = [];

  createSignalingClient({
    baseUrl: "http://localhost:8787",
    roomId: "room-2",
    peerId: "peer-b",
    name: "Bob",
    role: "player",
  });

  const url = new URL(FakeWebSocket.instances[0].url);
  assert.equal(url.protocol, "ws:");
  assert.equal(url.searchParams.get("canHost"), "false");
});

test("signaling client dispatches typed message listeners", () => {
  FakeWebSocket.instances = [];
  const client = createSignalingClient({
    baseUrl: "https://signal.example",
    roomId: "room-3",
    peerId: "peer-c",
    name: "Chris",
    role: "player",
  });
  const received = [];
  client.on("room:welcome", (message) => received.push(message));

  FakeWebSocket.instances[0].emit("message", {
    data: JSON.stringify({ type: "room:welcome", hostPeerId: "peer-c" }),
  });

  assert.deepEqual(received, [{ type: "room:welcome", hostPeerId: "peer-c" }]);
});
