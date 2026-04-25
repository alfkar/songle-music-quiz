const SONG_POINTS = 1000;
const ARTIST_POINTS = 750;
const MIN_POINTS = 100;

export function createSession({ playlistId, catalog, hostName }) {
  return {
    id: crypto.randomUUID(),
    playlistId,
    catalogSnapshotId: catalog.snapshotId,
    hostName,
    players: [],
    rounds: [],
    currentRound: null,
    scores: {},
  };
}

export function createPlayer({ id, name, isHost = false }) {
  return {
    id: id || crypto.randomUUID(),
    name: name || "Player",
    isHost,
    ready: false,
  };
}

export function createRound({ roundNumber, trackId, trackUri, startsAtEpoch }) {
  return {
    id: crypto.randomUUID(),
    roundNumber,
    trackId,
    trackUri,
    startsAtEpoch,
    claims: [],
    completedFields: {
      song: false,
      artist: false,
    },
  };
}

export function upsertPlayer(session, player) {
  const existingPlayer = session.players.find((currentPlayer) => currentPlayer.id === player.id);
  const players = existingPlayer
    ? session.players.map((currentPlayer) =>
        currentPlayer.id === player.id
          ? { ...currentPlayer, ...player }
          : currentPlayer
      )
    : [...session.players, player];

  return {
    ...session,
    players,
  };
}

export function setPlayerReady(session, playerId, ready) {
  return {
    ...session,
    players: session.players.map((player) =>
      player.id === playerId ? { ...player, ready } : player
    ),
  };
}

export function resetPlayerReadiness(session) {
  return {
    ...session,
    players: session.players.map((player) => ({
      ...player,
      ready: false,
    })),
  };
}

export function allPlayersReady(session) {
  return session.players.length > 0 && session.players.every((player) => player.ready);
}

export function pointsForClaim(field, elapsedMs) {
  const base = field === "song" ? SONG_POINTS : ARTIST_POINTS;
  const penalty = Math.floor(elapsedMs / 100);
  return Math.max(MIN_POINTS, base - penalty);
}

export function applyClaim(session, claim) {
  if (!session.currentRound || session.currentRound.id !== claim.roundId) {
    return session;
  }

  const alreadyClaimed = session.currentRound.claims.some(
    (existingClaim) =>
      existingClaim.playerId === claim.playerId &&
      existingClaim.field === claim.field
  );

  if (alreadyClaimed) {
    return session;
  }

  const points = pointsForClaim(claim.field, claim.elapsedMs);
  const scoredClaim = {
    ...claim,
    points,
    submittedAt: performance.now(),
  };

  return {
    ...session,
    currentRound: {
      ...session.currentRound,
      claims: [...session.currentRound.claims, scoredClaim],
      completedFields: {
        ...session.currentRound.completedFields,
        [claim.field]: true,
      },
    },
    rounds: session.rounds.map((round) =>
      round.id === session.currentRound.id
        ? {
            ...round,
            claims: [...round.claims, scoredClaim],
            completedFields: {
              ...round.completedFields,
              [claim.field]: true,
            },
          }
        : round
    ),
    scores: {
      ...session.scores,
      [claim.playerId]: (session.scores[claim.playerId] || 0) + points,
    },
  };
}

export function isRoundComplete(round) {
  return Boolean(round?.completedFields.song && round?.completedFields.artist);
}
