# Signaling Requirements Map

This file tracks target signaling/session behavior for Songle multiplayer modes and the current implementation status. Keep code comments in the form `REQ-*` aligned with the IDs below.

Status values are intentionally concrete:

- `Works`: implemented and covered by direct tests or build/runtime checks.
- `Missing`: target behavior is not implemented yet.
- `Untested`: implementation appears to exist, but no direct test currently proves it.

Do not use `Partial`. Split broad behavior into smaller requirements instead.

| ID | Requirement | Current status | Code references | Notes |
| --- | --- | --- | --- | --- |
| REQ-JOIN-001 | A room join must include a non-empty chosen display name. | Works | `signaling-worker/src/roomState.js`, `signaling-worker/src/index.js`, `signaling-worker/src/roomState.test.js` | Worker validation rejects missing names before `room:welcome`. |
| REQ-JOIN-002 | Reject a join when another active player in the same room already uses the requested name. | Works | `signaling-worker/src/roomState.js`, `signaling-worker/src/index.js`, `signaling-worker/src/roomState.test.js`, `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | Duplicate-name validation happens before `room:welcome`; reconnecting with the same peer id may reclaim its own name. |
| REQ-HOST-001 | Clients must advertise whether they are eligible to host the current mode. | Works | `src/lib/signalingClient.js`, `src/lib/signalingClient.test.js`, `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | `canHost` is included in the signaling URL; party mode sends Spotify-token eligibility. |
| REQ-HOST-004 | Shared quiz and online quiz should expose an explicit mode policy for host eligibility instead of deriving it from local session ownership. | Missing | Planned | Current shared `QuizRoom` still uses `Boolean(session)` as host eligibility. |
| REQ-HOST-002 | The signaling worker must elect only host-eligible connected peers as host. | Works | `signaling-worker/src/roomState.js`, `signaling-worker/src/index.js`, `signaling-worker/src/roomState.test.js` | Worker filters election by `canHost`. |
| REQ-HOST-005 | Host recovery and authoritative session selection must be deterministic after a host disconnect/reconnect. | Missing | Planned | Current snapshot and host handoff logic is still mostly client-side. |
| REQ-HOST-003 | If no connected peer is host-eligible, the worker must announce that the room is hostless. | Works | `signaling-worker/src/index.js`, `signaling-worker/src/roomState.test.js` | Worker broadcasts `host:changed` with an empty host id when no eligible peer remains. |
| REQ-HOST-006 | Hostless rooms must render a consistent view-only/no-host state across all multiplayer modes. | Missing | Planned | Party has some no-host copy; shared quiz modes are not fully enforced. |
| REQ-DISC-001 | A reconnect from the same stable browser identity replaces the stale socket without producing a false leave event. | Works | `signaling-worker/src/index.js`, `signaling-worker/src/roomState.test.js` | Current worker marks replaced sockets and ignores their close path. |
| REQ-DISC-002 | When a peer truly disconnects, the worker broadcasts a leave event to the active room. | Works | `signaling-worker/src/index.js` | Clients receive `peer:left` and remove the peer from their active peer lists. |
| REQ-DISC-003 | A disconnected player should be removed from the visible active session, not shown as disconnected. | Works | `src/lib/sessionProtocol.js`, `src/lib/sessionProtocol.test.js`, `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | `markPlayerLeft` removes the player from active session players while preserving score entries for future recovery. |
| REQ-REC-001 | Each browser keeps a stable identity so refresh/rejoin can be recognized as the same player. | Works | `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | Current `songle-peer-id` localStorage identity is the accepted proof model. |
| REQ-REC-002 | Cache one-hour per-room player recovery data: client id, name, score, and minimal metadata. | Works | `src/lib/playerRecoveryCache.js`, `src/lib/roomSnapshots.test.js`, `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | New player recovery ledger stores only name/score metadata. |
| REQ-REC-004 | Remove legacy full room snapshot restore from shared quiz recovery. | Missing | `src/lib/roomSnapshots.js`, `src/components/QuizRoom.js` | Original quiz still stores full room snapshots for room restore. |
| REQ-REC-003 | Connected peers exchange a small recovery ledger so rejoining players can restore score/name metadata. | Works | `src/lib/playerRecoveryCache.js`, `src/lib/roomSnapshots.test.js`, `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | Peers send recovery ledgers with `session:player-join`, and hosts apply matching score entries. |
| REQ-REC-005 | Recovered score/name data must be accepted through an explicit peer approval or consensus rule. | Missing | Planned | Current ledger merge does not yet ask peers to approve recovered entries. |
| REQ-SYNC-001 | The current host broadcasts authoritative session snapshots so peers converge on the same game state. | Works | `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | Hosts broadcast snapshots over WebRTC and signaling fallback. |
| REQ-SYNC-003 | Recovery and hostless handoff must converge deterministically across peers. | Missing | Planned | This needs protocol-level conflict resolution beyond snapshot broadcasting. |
| REQ-SYNC-002 | Gameplay mutations such as start round, accepted claims, round end, and scoring are host-authoritative. | Untested | `src/components/QuizRoom.js`, `src/pages/party-quiz.js` | Main handlers gate on host, but direct protocol tests should be added. |
| REQ-SYNC-004 | Hostless/view-only state must block gameplay mutations from non-host peers. | Missing | Planned | This depends on the hostless UI/protocol enforcement work. |
| REQ-MODE-001 | Party mode host eligibility requires Spotify capability. | Works | `src/pages/party-quiz.js`, `src/lib/signalingClient.test.js` | Party mode advertises `canHost` from Spotify token presence. |
| REQ-MODE-002 | Online/shared quiz host eligibility must be expressed as a clear mode policy. | Missing | Planned | Current shared `QuizRoom` behavior is implicit. |
