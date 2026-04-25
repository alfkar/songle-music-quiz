import React, { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import Login from "@/components/Login";
import Player from "@/components/Player";
import QuizGuessPicker from "@/components/QuizGuessPicker";
import UserDashboard from "@/components/UserDashboard";
import { Button } from "@/components/ui/8bit/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/8bit/card";
import { CheckCircle2, XCircle } from "lucide-react";
import { getPlaylist, getSongsFromPlaylist, playTrackUri } from "@/lib/spotify";
import { buildQuizCatalog, getUniqueArtists } from "@/lib/quizCatalog";
import { verifyArtistGuess, verifySongGuess } from "@/lib/guessVerifier";
import {
  allPlayersReady,
  applyClaim,
  createPlayer,
  createRound,
  createSession,
  isRoundComplete,
  resetPlayerReadiness,
  setPlayerReady,
  upsertPlayer,
} from "@/lib/sessionProtocol";
import { createPeerId, createRoomId, createSignalingClient } from "@/lib/signalingClient";
import { createWebRtcRoom } from "@/lib/webrtcRoom";
import {
  chooseNewestSnapshot,
  createSnapshot,
  loadRoomSnapshot,
  saveRoomSnapshot,
} from "@/lib/roomSnapshots";

const DEFAULT_PLAYLIST_ID = process.env.NEXT_PUBLIC_SONGLE_PLAYLIST_ID || "";
const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL || "";

function formatTime(milliseconds) {
  const safeMilliseconds = Math.max(0, Math.floor(milliseconds || 0));
  const seconds = Math.floor(safeMilliseconds / 1000);
  const tenths = Math.floor((safeMilliseconds % 1000) / 100);
  return `${String(seconds).padStart(2, "0")}:${tenths}`;
}

function getOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function playCountdownTick(value) {
  if (typeof window === "undefined") return;

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;

  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "square";
  oscillator.frequency.value = value === 1 ? 880 : 660;
  gain.gain.setValueAtTime(0.08, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.2);
}

export default function QuizPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [token, setToken] = useState("");
  const [roomId, setRoomId] = useState("");
  const [peerId, setPeerId] = useState("");
  const [peers, setPeers] = useState([]);
  const [hostPeerId, setHostPeerId] = useState("");
  const [isConnectedToSignal, setIsConnectedToSignal] = useState(false);
  const [connectedPeerIds, setConnectedPeerIds] = useState([]);
  const [signalStatus, setSignalStatus] = useState("");
  const [cachedSnapshot, setCachedSnapshot] = useState(null);
  const [playlistId, setPlaylistId] = useState(DEFAULT_PLAYLIST_ID);
  const [playlistName, setPlaylistName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [hostName, setHostName] = useState("Host");
  const [playerInfo, setPlayerInfo] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [session, setSession] = useState(null);
  const [localPlayer, setLocalPlayer] = useState(null);
  const [songGuess, setSongGuess] = useState("");
  const [artistGuess, setArtistGuess] = useState("");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdownValue, setCountdownValue] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stopPlaying, setStopPlaying] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [status, setStatus] = useState("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [hasCopiedInvite, setHasCopiedInvite] = useState(false);
  const [pendingReady, setPendingReady] = useState(null);
  const [pendingReadyRoundNumber, setPendingReadyRoundNumber] = useState(null);
  const autoConnectedRoomRef = useRef("");
  const timerRef = useRef(null);
  const roundStartRef = useRef(null);
  const startedRoundIdRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null);
  const signalingRef = useRef(null);
  const webRtcRef = useRef(null);
  const sessionRef = useRef(null);
  const catalogRef = useRef(null);
  const tokenRef = useRef("");
  const playerInfoRef = useRef(null);
  const localPlayerRef = useRef(null);
  const isHostRef = useRef(false);
  const phaseRef = useRef("setup");
  const pendingReadyRef = useRef(null);
  const pendingReadyRoundNumberRef = useRef(null);
  const latestSnapshotRef = useRef(null);
  const snapshotRevisionRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPeerId = localStorage.getItem("songle-peer-id") || createPeerId();
    localStorage.setItem("songle-peer-id", storedPeerId);
    setPeerId(storedPeerId);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const queryRoomId = typeof router.query.room === "string" ? router.query.room : "";
    if (!queryRoomId) return;

    setRoomId(queryRoomId);
    const snapshot = loadRoomSnapshot(queryRoomId);

    if (!snapshot) {
      setStatus("This room link is open, but this browser has no cached session for it.");
      return;
    }

    setCachedSnapshot(snapshot);
    setStatus(`Cached room found. Revision ${snapshot.revision} can be resumed.`);
  }, [router.isReady, router.query.room]);

  useEffect(() => {
    const accessToken = Cookies.get("spotify_access_token");
    if (!accessToken) return;

    setToken(accessToken);
    setIsLoggedIn(true);
    fetch("/api/user")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setUserData(data);
        setHostName(data.display_name || "Host");
      })
      .catch(() => {
        setUserData(null);
      });
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
      webRtcRef.current?.close();
      signalingRef.current?.close();
    };
  }, []);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    catalogRef.current = catalog;
  }, [catalog]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  useEffect(() => {
    playerInfoRef.current = playerInfo;
  }, [playerInfo]);

  useEffect(() => {
    localPlayerRef.current = localPlayer;
  }, [localPlayer]);

  useEffect(() => {
    if (!peerId || !hostName || hostName === "Host") return;

    setLocalPlayer((currentPlayer) => {
      if (!currentPlayer || currentPlayer.name === hostName) return currentPlayer;

      const renamedPlayer = {
        ...currentPlayer,
        name: hostName,
      };

      setSession((previousSession) =>
        previousSession ? upsertPlayer(previousSession, renamedPlayer) : previousSession
      );

      if (signalingRef.current?.socket?.readyState === WebSocket.OPEN) {
        sendSessionMessage({
          type: "session:player-join",
          player: renamedPlayer,
        });
      }

      return renamedPlayer;
    });
  }, [hostName, peerId]);

  useEffect(() => {
    isHostRef.current = Boolean(peerId && hostPeerId === peerId);
  }, [hostPeerId, peerId]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    pendingReadyRef.current = pendingReady;
  }, [pendingReady]);

  useEffect(() => {
    pendingReadyRoundNumberRef.current = pendingReadyRoundNumber;
  }, [pendingReadyRoundNumber]);

  useEffect(() => {
    if (!roomId || !session || !catalog || !localPlayer || !peerId) return;

    if (isHostRef.current) {
      snapshotRevisionRef.current += 1;
    } else {
      snapshotRevisionRef.current = Math.max(
        snapshotRevisionRef.current,
        session.revision || 0
      );
    }

    const snapshot = createSnapshot({
      roomId,
      peerId,
      revision: snapshotRevisionRef.current,
      session,
      catalog,
      localPlayer,
      phase,
    });

    saveRoomSnapshot(roomId, snapshot);
    latestSnapshotRef.current = snapshot;

    if (!isHostRef.current) return;

    const snapshotMessage = {
      type: "session:snapshot",
      revision: snapshot.revision,
      state: snapshot,
    };

    if (webRtcRef.current?.broadcast(snapshotMessage)) {
      return;
    }

    if (signalingRef.current?.socket?.readyState === WebSocket.OPEN) {
      signalingRef.current.send(snapshotMessage);
    }
  }, [catalog, localPlayer, peerId, phase, roomId, session]);

  const applyIncomingSnapshot = (incomingSnapshot) => {
    if (!incomingSnapshot?.session) return;

    const currentRevision = sessionRef.current?.revision || 0;
    if ((incomingSnapshot.revision || 0) < currentRevision) {
      return;
    }

    const nextLocalPlayer =
      localPlayerRef.current ||
      createPlayer({
        id: peerId || incomingSnapshot.peerId,
        name: hostName,
        isHost: false,
      });
    const playerAlreadyInSnapshot = incomingSnapshot.session.players.some(
      (player) => player.id === nextLocalPlayer.id
    );
    let incomingSession = playerAlreadyInSnapshot
      ? incomingSnapshot.session
      : upsertPlayer(incomingSnapshot.session, nextLocalPlayer);
    const pendingReadyValue = pendingReadyRef.current;
    const pendingRoundNumber = pendingReadyRoundNumberRef.current;
    const incomingReadyRoundNumber = incomingSession.rounds.length + 1;
    const hostEndedRound = incomingSnapshot.phase === "round-ended";

    if (
      hostEndedRound ||
      (pendingRoundNumber && pendingRoundNumber !== incomingReadyRoundNumber)
    ) {
      setPendingReady(null);
      setPendingReadyRoundNumber(null);
    } else if (pendingReadyValue !== null && !isHostRef.current) {
      const confirmedPlayer = incomingSession.players.find(
        (player) => player.id === nextLocalPlayer.id
      );

      if (confirmedPlayer?.ready === pendingReadyValue) {
        setPendingReady(null);
        setPendingReadyRoundNumber(null);
      } else {
        incomingSession = setPlayerReady(
          incomingSession,
          nextLocalPlayer.id,
          pendingReadyValue
        );
      }
    }

    setCachedSnapshot(incomingSnapshot);
    saveRoomSnapshot(incomingSnapshot.roomId, incomingSnapshot);
    snapshotRevisionRef.current = Math.max(snapshotRevisionRef.current, incomingSnapshot.revision || 0);
    setRoomId(incomingSnapshot.roomId);
    setCatalog(incomingSnapshot.catalog);
    setSession(incomingSession);
    setLocalPlayer(nextLocalPlayer);
    setPlaylistId(
      incomingSnapshot.session.playlistId ||
      incomingSnapshot.catalog.playlistId ||
      playlistId
    );
    setPlaylistName(incomingSnapshot.catalog.playlistName || playlistName);
    const nextPhase = incomingSnapshot.phase || "lobby";
    const phaseChanged = phaseRef.current !== nextPhase;
    setPhase(nextPhase);

    if (nextPhase === "round-ended" && phaseChanged) {
      setStatus("Round complete. Ready up for the next song.");
    }
  };

  const sendCurrentSnapshotTo = (targetPeerId) => {
    const snapshot = latestSnapshotRef.current || (roomId ? loadRoomSnapshot(roomId) : null);
    if (!snapshot) return;

    const snapshotMessage = {
        type: "session:snapshot",
        revision: snapshot.revision,
        state: snapshot,
    };

    if (!webRtcRef.current?.sendTo(targetPeerId, snapshotMessage)) {
      signalingRef.current?.send({
        ...snapshotMessage,
        to: targetPeerId,
      });
    }
  };

  const sendSessionMessage = (message) => {
    const sent = webRtcRef.current?.broadcast(message) || 0;

    if (
      (!sent || message.reliable) &&
      signalingRef.current?.socket?.readyState === WebSocket.OPEN
    ) {
      signalingRef.current.send(message);
    }
  };

  const applyHostClaim = (claim) => {
    setSession((previousSession) => {
      if (!previousSession) return previousSession;

      const nextSession = applyClaim(previousSession, claim);
      if (!isRoundComplete(nextSession.currentRound)) return nextSession;

      stopTimer();
      setPendingReady(null);
      setPendingReadyRoundNumber(null);
      setPhase("round-ended");
      setStatus("Round complete. Ready up for the next song.");
      return {
        ...resetPlayerReadiness(nextSession),
        phase: "round-ended",
      };
    });
  };

  const handleSessionMessage = (message, remotePeerId) => {
    if (message.type === "session:snapshot") {
      applyIncomingSnapshot(message.state);
      return;
    }

    if (message.type === "session:player-join") {
      setSession((previousSession) =>
        previousSession ? upsertPlayer(previousSession, message.player) : previousSession
      );
      return;
    }

    if (message.type === "session:player-ready") {
      setSession((previousSession) => {
        if (!previousSession) return previousSession;
        const expectedReadyRoundNumber = previousSession.rounds.length + 1;

        if (
          message.readyRoundNumber &&
          message.readyRoundNumber !== expectedReadyRoundNumber
        ) {
          return previousSession;
        }

        const nextSession = message.player
          ? upsertPlayer(previousSession, message.player)
          : previousSession;

        return setPlayerReady(
          nextSession,
          message.playerId || remotePeerId,
          message.ready
        );
      });
      return;
    }

    if (message.type === "session:claim" && isHostRef.current) {
      applyHostClaim(message.claim);
      return;
    }

    if (message.type === "session:start-request" && isHostRef.current) {
      startRound();
    }
  };

  const currentTrack = useMemo(() => {
    if (!catalog || !session?.currentRound) return null;
    return catalog.tracksById[session.currentRound.trackId];
  }, [catalog, session]);

  const songNames = useMemo(() => {
    if (!catalog) return [];
    return catalog.tracks.map((track) => track.name).sort((a, b) => a.localeCompare(b));
  }, [catalog]);

  const artistNames = useMemo(() => {
    if (!catalog) return [];
    return getUniqueArtists(catalog);
  }, [catalog]);

  const localClaims = useMemo(() => {
    if (!session?.currentRound || !localPlayer) return [];
    return session.currentRound.claims.filter(
      (claim) => claim.playerId === localPlayer.id
    );
  }, [localPlayer, session]);

  const hasSongClaim = localClaims.some((claim) => claim.field === "song");
  const hasArtistClaim = localClaims.some((claim) => claim.field === "artist");
  const isHost = Boolean(peerId && hostPeerId === peerId);
  const readyPlayers = session?.players.filter((player) => player.ready).length || 0;
  const allReady = session ? allPlayersReady(session) : false;
  const localPlayerReady = Boolean(
    localPlayer && session?.players.find((player) => player.id === localPlayer.id)?.ready
  );
  const readyButtonLabel = pendingReady !== null
    ? (pendingReady ? "Unready" : "Ready Up")
    : (localPlayerReady ? "Unready" : "Ready Up");
  const readySummary = session
    ? `Ready ${readyPlayers}/${session.players.length}`
    : "";
  const inviteLink = roomId ? `${getOrigin()}/quiz?room=${roomId}` : "";
  const playerNameById = useMemo(() => {
    return Object.fromEntries((session?.players || []).map((player) => [player.id, player.name]));
  }, [session?.players]);

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setHasCopiedInvite(true);
      setTimeout(() => setHasCopiedInvite(false), 1500);
    } catch {
      setStatus("Could not copy invite link.");
    }
  };

  const joinRoom = () => {
    const nextRoomId = joinRoomId.trim();
    if (!nextRoomId) return;

    setRoomId(nextRoomId);
    router.replace(`/quiz?room=${encodeURIComponent(nextRoomId)}`, undefined, {
      shallow: true,
    });
  };

  const restoreSnapshot = (snapshot) => {
    if (!snapshot?.session || !snapshot?.catalog) return;

    const restoredLocalPlayer =
      localPlayer ||
      createPlayer({
        id: peerId || snapshot.peerId,
        name: hostName,
        isHost: snapshot.session.hostName === hostName,
      });
    const restoredSession = upsertPlayer(snapshot.session, restoredLocalPlayer);

    snapshotRevisionRef.current = snapshot.revision || 0;
    setRoomId(snapshot.roomId);
    setCatalog(snapshot.catalog);
    setSession(restoredSession);
    setLocalPlayer(restoredLocalPlayer);
    setPlaylistId(snapshot.session.playlistId || snapshot.catalog.playlistId || playlistId);
    setPlaylistName(snapshot.catalog.playlistName || playlistName);
    setPhase(snapshot.phase === "round-live" ? "round-interrupted" : snapshot.phase || "lobby");
    setIsRunning(false);
    setStopPlaying(true);
    setStatus("Room restored from this browser's one-hour cache.");
  };

  const connectToSignaling = (options = {}) => {
    if (!SIGNALING_URL) {
      setSignalStatus("Set NEXT_PUBLIC_SIGNALING_URL to connect to the signaling worker.");
      return;
    }

    if (!peerId || signalingRef.current?.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const nextRoomId = roomId || createRoomId();
    const nextLocalPlayer =
      localPlayer ||
      createPlayer({
        id: peerId,
        name: hostName,
        isHost: Boolean(session),
      });

    setLocalPlayer(nextLocalPlayer);

    if (!roomId && !options.silent) {
      setRoomId(nextRoomId);
      router.replace(`/quiz?room=${nextRoomId}`, undefined, { shallow: true });
    } else if (!roomId) {
      setRoomId(nextRoomId);
    }

    signalingRef.current?.close();
    webRtcRef.current?.close();
    const client = createSignalingClient({
      baseUrl: SIGNALING_URL,
      roomId: nextRoomId,
      peerId,
      name: hostName,
      role: session ? "host" : "player",
    });

    signalingRef.current = client;
    const webRtcRoom = createWebRtcRoom({
      peerId,
      signal: (to, payload) => {
        client.send({
          type: "signal",
          to,
          payload,
        });
      },
    });

    webRtcRef.current = webRtcRoom;
    setSignalStatus("Connecting to signaling room...");

    webRtcRoom.on("peer:open", ({ peerId: remotePeerId }) => {
      setConnectedPeerIds(webRtcRoom.getConnectedPeerIds());
      setSignalStatus("Peer data channel connected.");
      if (isHostRef.current) {
        sendCurrentSnapshotTo(remotePeerId);
      } else if (localPlayerRef.current) {
        webRtcRoom.sendTo(remotePeerId, {
          type: "session:player-join",
          player: localPlayerRef.current,
        });
      }
    });

    webRtcRoom.on("peer:close", () => {
      setConnectedPeerIds(webRtcRoom.getConnectedPeerIds());
    });

    webRtcRoom.on("message", ({ message, peerId: remotePeerId }) => {
      handleSessionMessage(message, remotePeerId);
    });

    client.socket.addEventListener("open", () => {
      setIsConnectedToSignal(true);
      setSignalStatus("Connected to signaling room.");
      client.send({
        type: "session:player-join",
        player: nextLocalPlayer,
      });

      const snapshot = loadRoomSnapshot(nextRoomId);
      if (snapshot) {
        client.send({
          type: "session:resume-available",
          revision: snapshot.revision,
          savedAt: snapshot.savedAt,
        });
      }
    });

    client.socket.addEventListener("close", () => {
      setIsConnectedToSignal(false);
      setSignalStatus("Disconnected from signaling room.");
    });

    client.on("room:welcome", (message) => {
      setHostPeerId(message.hostPeerId);
      setPeers(message.peers || []);

      (message.peers || [])
        .filter((peer) => peer.peerId < peerId)
        .forEach((peer) => {
          webRtcRoom.callPeer(peer.peerId).catch((error) => {
            console.error("Error calling peer:", error);
          });
        });
    });

    client.on("peer:joined", (message) => {
      setPeers((currentPeers) => [
        ...currentPeers.filter((peer) => peer.peerId !== message.peer.peerId),
        message.peer,
      ]);

      if (peerId < message.peer.peerId) {
        webRtcRoom.callPeer(message.peer.peerId).catch((error) => {
          console.error("Error calling joined peer:", error);
        });
      }
    });

    client.on("peer:left", (message) => {
      setPeers((currentPeers) =>
        currentPeers.filter((peer) => peer.peerId !== message.peerId)
      );
      webRtcRoom.removePeer(message.peerId);
      setConnectedPeerIds(webRtcRoom.getConnectedPeerIds());
    });

    client.on("host:changed", (message) => {
      setHostPeerId(message.hostPeerId);
      setSignalStatus(
        message.hostPeerId === peerId
          ? "You are now the live room host."
          : "The live room host changed."
      );
    });

    client.on("signal", (message) => {
      webRtcRoom.handleSignal(message.from, message.payload).catch((error) => {
        console.error("Error handling WebRTC signal:", error);
      });
    });

    client.on("session:resume-available", (message) => {
      const localSnapshot = loadRoomSnapshot(nextRoomId);
      const winner = chooseNewestSnapshot([
        localSnapshot,
        {
          revision: message.revision,
          savedAt: message.savedAt,
          peerId: message.from,
        },
      ]);

      if (winner?.peerId === peerId && localSnapshot) {
        client.send({
          type: "session:snapshot",
          revision: localSnapshot.revision,
          state: localSnapshot,
        });
      }
    });

    client.on("session:snapshot", (message) => {
      handleSessionMessage(message, message.from);
    });

    client.on("session:player-join", (message) => {
      handleSessionMessage(message, message.from);
    });

    client.on("session:player-ready", (message) => {
      handleSessionMessage(message, message.from);
    });

    client.on("session:claim", (message) => {
      handleSessionMessage(message, message.from);
    });

    client.on("session:start-request", (message) => {
      handleSessionMessage(message, message.from);
    });
  };

  useEffect(() => {
    if (!roomId || !peerId || autoConnectedRoomRef.current === roomId) return;

    autoConnectedRoomRef.current = roomId;
    connectToSignaling({ silent: true });
  }, [peerId, roomId]);

  const fetchCatalog = async () => {
    if (!token || !playlistId) return;

    setIsLoadingCatalog(true);
    setStatus("Fetching playlist catalog...");

    try {
      const playlistResponse = await getPlaylist(token, playlistId);
      if (!playlistResponse.ok) {
        setStatus(`Spotify returned ${playlistResponse.status} for that playlist.`);
        return;
      }

      const playlist = await playlistResponse.json();
      const nextRoomId = roomId || createRoomId();
      const cacheKey = `quiz-catalog:${playlist.id}:${playlist.snapshot_id}`;
      const cachedCatalog = localStorage.getItem(cacheKey);
      let nextCatalog;

      if (cachedCatalog) {
        nextCatalog = JSON.parse(cachedCatalog);
      } else {
        const tracks = await getSongsFromPlaylist(token, null, playlist.id);
        nextCatalog = buildQuizCatalog({
          playlistId: playlist.id,
          playlistName: playlist.name,
          playlistUri: playlist.uri,
          snapshotId: playlist.snapshot_id,
          tracks,
        });
        localStorage.setItem(cacheKey, JSON.stringify(nextCatalog));
      }

      const host = createPlayer({ id: peerId, name: hostName, isHost: true });
      const nextSession = createSession({
        playlistId: playlist.id,
        catalog: nextCatalog,
        hostName,
      });

      setCatalog(nextCatalog);
      setPlaylistName(playlist.name || "Songle");
      setLocalPlayer(host);
      setRoomId(nextRoomId);
      setHostPeerId(peerId);
      setSession({
        ...nextSession,
        id: nextRoomId,
        phase: "lobby",
        revision: snapshotRevisionRef.current,
        players: [host],
      });
      setPhase("lobby");
      router.replace(`/quiz?room=${nextRoomId}`, undefined, { shallow: true });
      setStatus(`Loaded ${nextCatalog.tracks.length} songs from the host playlist.`);
    } catch (error) {
      console.error("Error creating quiz session:", error);
      setStatus("Could not create the quiz session. Check the playlist ID and Spotify login.");
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    roundStartRef.current = performance.now();
    setElapsedTime(0);
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setElapsedTime(performance.now() - roundStartRef.current);
    }, 100);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setIsRunning(false);
    setStopPlaying(true);
  };

  const clearCountdown = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
    countdownIntervalRef.current = null;
    countdownTimeoutRef.current = null;
    setCountdownValue(null);
  };

  const scheduleRoundPlayback = (round) => {
    if (!round || startedRoundIdRef.current === round.id) return;

    clearCountdown();
    startedRoundIdRef.current = round.id;
    setSongGuess("");
    setArtistGuess("");
    setStopPlaying(false);
    setIsRunning(false);
    setStatus("Get ready...");

    const updateCountdown = () => {
      const secondsLeft = Math.ceil((round.startsAtEpoch - Date.now()) / 1000);
      const visibleValue = secondsLeft > 0 ? Math.min(3, secondsLeft) : null;
      setCountdownValue((previousValue) => {
        if (visibleValue && visibleValue !== previousValue) {
          playCountdownTick(visibleValue);
        }
        return visibleValue;
      });
    };

    updateCountdown();
    countdownIntervalRef.current = setInterval(updateCountdown, 100);

    countdownTimeoutRef.current = setTimeout(async () => {
      clearCountdown();

      const spotifyPlayer = playerInfoRef.current;
      const spotifyToken = tokenRef.current;

      if (!spotifyPlayer?.ready || !spotifyToken) {
        setStatus("Spotify player is not ready in this browser.");
        return;
      }

      try {
        const response = await playTrackUri(spotifyToken, round.trackUri, spotifyPlayer.id);
        if (!response.ok) {
          setStatus(`Spotify could not start playback (${response.status}).`);
          return;
        }

        startTimer();
        setPhase("round-live");
        setStatus("Round live. Guess as fast as you can.");
      } catch (error) {
        console.error("Error starting synchronized playback:", error);
        setStatus("Could not start synchronized playback.");
      }
    }, Math.max(0, round.startsAtEpoch - Date.now()));
  };

  useEffect(() => {
    if (session?.phase === "countdown" && session.currentRound) {
      scheduleRoundPlayback(session.currentRound);
      return;
    }

    if (session?.phase === "round-ended") {
      clearCountdown();
      stopTimer();
    }
  }, [session?.currentRound?.id, session?.phase]);

  const startRound = async () => {
    const currentCatalog = catalogRef.current;
    const currentSession = sessionRef.current;
    const currentPlayerInfo = playerInfoRef.current;

    if (
      !currentCatalog ||
      !currentSession ||
      !currentPlayerInfo?.ready ||
      !allPlayersReady(currentSession)
    ) {
      return;
    }

    const usedTrackIds = new Set(currentSession.rounds.map((round) => round.trackId));
    const availableTrackIds = currentCatalog.trackIds.filter((trackId) => !usedTrackIds.has(trackId));
    const pool = availableTrackIds.length > 0 ? availableTrackIds : currentCatalog.trackIds;
    const trackId = pool[Math.floor(Math.random() * pool.length)];
    const track = currentCatalog.tracksById[trackId];
    const round = createRound({
      roundNumber: currentSession.rounds.length + 1,
      trackId,
      trackUri: track.uri,
      startsAtEpoch: Date.now() + 4000,
    });

    setSongGuess("");
    setArtistGuess("");
    setStopPlaying(false);
    setPhase("countdown");
    setStatus("Starting synchronized countdown...");

    setSession((previousSession) => ({
      ...previousSession,
      currentRound: round,
      rounds: [...previousSession.rounds, round],
      phase: "countdown",
    }));
  };

  const setReadyForRound = () => {
    if (!localPlayer || !playerInfo?.ready || isRunning || phase === "countdown") return;
    const nextReady = !localPlayerReady;

    setSession((previousSession) =>
      previousSession ? setPlayerReady(previousSession, localPlayer.id, nextReady) : previousSession
    );
    setLocalPlayer((previousPlayer) =>
      previousPlayer ? { ...previousPlayer, ready: nextReady } : previousPlayer
    );
    setPendingReady(nextReady);
    setPendingReadyRoundNumber((sessionRef.current?.rounds.length || 0) + 1);

    sendSessionMessage({
      type: "session:player-ready",
      reliable: true,
      playerId: localPlayer.id,
      readyRoundNumber: (sessionRef.current?.rounds.length || 0) + 1,
      player: {
        ...localPlayer,
        ready: nextReady,
      },
      ready: nextReady,
    });
    setStatus(
      signalingRef.current?.socket?.readyState === WebSocket.OPEN
        ? (nextReady ? "Ready." : "Not ready.")
        : "Ready changed locally, but signaling is not connected."
    );
  };

  const requestStartRound = () => {
    if (isHost) {
      startRound();
      return;
    }

    sendSessionMessage({
      type: "session:start-request",
      reliable: true,
      playerId: localPlayer?.id,
    });
    setStatus("Start request sent to host.");
  };

  const submitClaim = (field, guess) => {
    if (!session?.currentRound || !currentTrack || !localPlayer || !roundStartRef.current) {
      return;
    }

    const isCorrect =
      field === "song"
        ? verifySongGuess(currentTrack, guess)
        : verifyArtistGuess(currentTrack, guess);

    if (!isCorrect) {
      setStatus(`No match for that ${field}.`);
      return;
    }

    const claim = {
      type: "round:claim",
      roundId: session.currentRound.id,
      playerId: localPlayer.id,
      playerName: localPlayer.name,
      field,
      elapsedMs: performance.now() - roundStartRef.current,
      guessText: guess,
      trackId: currentTrack.id,
    };

    if (!isHost) {
      sendSessionMessage({
        type: "session:claim",
        reliable: true,
        claim,
      });
      setStatus(`${field === "song" ? "Song" : "Artist"} claim sent to host.`);
      return;
    }

    applyHostClaim(claim);
  };

  const playerIsReadyHandler = (playerID) => {
    setPlayerInfo({
      id: playerID,
      ready: true,
    });
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen p-8 sm:p-16 grid place-items-center">
        <Card className="max-w-md">
          <CardTitle className="text-3xl text-center">Music Quiz</CardTitle>
          <CardContent className="mt-4">
            <Login onLoginSuccess={() => window.location.reload()} />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 sm:p-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {userData && <UserDashboard userData={userData} onLogout={() => window.location.assign("/")} />}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Music Quiz</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {!session && !cachedSnapshot && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-3">
                      <Button onClick={fetchCatalog} disabled={isLoadingCatalog || !playlistId}>
                        {isLoadingCatalog ? "Loading..." : "Create Session"}
                      </Button>
                    </div>
                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        joinRoom();
                      }}
                    >
                      <input
                        className="min-w-0 flex-1 border px-3 py-2"
                        value={joinRoomId}
                        onChange={(event) => setJoinRoomId(event.target.value)}
                        placeholder="Enter room ID"
                      />
                      <Button>Join</Button>
                    </form>
                  </div>
                )}

                {cachedSnapshot && !session && (
                  <Button onClick={() => restoreSnapshot(cachedSnapshot)}>
                    Resume Cached Room
                  </Button>
                )}

                {catalog && (
                  <Player
                    token={token}
                    isReady={playerIsReadyHandler}
                    stopPlaying={stopPlaying}
                  />
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    onClick={setReadyForRound}
                    disabled={!catalog || !playerInfo?.ready || isRunning || phase === "countdown"}
                  >
                    {readyButtonLabel}
                  </Button>
                  <Button
                    onClick={requestStartRound}
                    disabled={
                      !catalog ||
                      !playerInfo?.ready ||
                      !allReady ||
                      isRunning ||
                      phase === "countdown"
                    }
                  >
                    Start Round
                  </Button>
                  <span className="text-3xl font-bold">{formatTime(elapsedTime)}</span>
                  {countdownValue && (
                    <span className="text-5xl font-bold">{countdownValue}</span>
                  )}
                  {readySummary && <span>{readySummary}</span>}
                </div>

                {currentTrack && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <QuizGuessPicker
                      label="Song"
                      placeholder="Search for a song"
                      options={songNames}
                      value={songGuess}
                      disabled={!isRunning || hasSongClaim}
                      onChange={setSongGuess}
                      onSubmit={(nextGuess) => submitClaim("song", nextGuess || songGuess)}
                    />
                    <QuizGuessPicker
                      label="Artist"
                      placeholder="Search for an artist"
                      options={artistNames}
                      value={artistGuess}
                      disabled={!isRunning || hasArtistClaim}
                      onChange={setArtistGuess}
                      onSubmit={(nextGuess) => submitClaim("artist", nextGuess || artistGuess)}
                    />
                  </div>
                )}

                <div className="min-h-6">{status}</div>
              </CardContent>
            </Card>

            {session && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Previous Rounds</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[420px] overflow-y-auto pr-2">
                    <div className="flex flex-col gap-4">
                    {[...session.rounds].reverse().map((round) => (
                      <div key={round.id} className="border p-3">
                        <h2 className="font-bold">Round {round.roundNumber}</h2>
                        <ul className="mt-2 flex flex-col gap-2 text-sm">
                          {round.claims.length > 0 ? (
                            round.claims.map((claim) => (
                              <li
                                key={`${claim.playerId}-${claim.field}`}
                                className="grid items-center gap-2 border p-2 sm:grid-cols-[minmax(0,1fr)_72px_72px]"
                              >
                                <span className="min-w-0 truncate">
                                  <span className="font-bold">
                                    {playerNameById[claim.playerId] || claim.playerName}
                                  </span>{" "}
                                  guessed {claim.field} correctly
                                </span>
                                <span className="text-right">{formatTime(claim.elapsedMs)}</span>
                                <span className="text-right">+{claim.points}</span>
                              </li>
                            ))
                          ) : (
                            <li>No correct guesses yet.</li>
                          )}
                        </ul>
                      </div>
                    ))}
                    {session.rounds.length === 0 && <p>No rounds played yet.</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Session</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {roomId && (
                  <div className="border p-3 text-sm">
                    <p className="font-bold">Room ID</p>
                    <p className="mt-2 break-all">{roomId}</p>
                    <p className="mt-2">
                      {isHost ? "This browser is the live host." : "This browser is a player."}
                    </p>
                  </div>
                )}
                {(playlistName || catalog) && (
                  <div className="border p-3 text-sm">
                    <p className="font-bold">Playlist</p>
                    <p className="mt-2">{playlistName || catalog?.playlistName || "Songle"}</p>
                  </div>
                )}
                {session && (
                  <Button onClick={copyInviteLink}>
                    {hasCopiedInvite ? "Copied" : "Invite Friends - Copy Link"}
                  </Button>
                )}
                {signalStatus && <p className="text-sm">{signalStatus}</p>}
              </CardContent>
            </Card>

            {session && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Players</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2">
                    {session.players.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center justify-between border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold">
                            {player.name} {player.id === hostPeerId ? "(host)" : ""}
                          </p>
                          <p className="text-sm">
                            {connectedPeerIds.includes(player.id) || player.id === peerId
                              ? "online"
                              : "connected"}
                          </p>
                        </div>
                        <div className="ml-4 flex w-28 shrink-0 items-center justify-end gap-2">
                          {player.ready ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className="w-16 text-right text-sm">
                            {player.ready ? "Ready" : "Not ready"}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {session && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Leaderboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="flex flex-col gap-2">
                    {[...session.players]
                      .sort((a, b) => (session.scores[b.id] || 0) - (session.scores[a.id] || 0))
                      .map((player, index) => (
                        <li
                          key={player.id}
                          className="flex items-center justify-between border p-3"
                        >
                          <span className="min-w-0 truncate">
                            {index + 1}. {player.name}
                          </span>
                          <span className="ml-4 w-24 shrink-0 border p-2 text-right">
                            {session.scores[player.id] || 0} pts
                          </span>
                        </li>
                      ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
