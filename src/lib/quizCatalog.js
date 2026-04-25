import { normalizeList } from "./guessVerifier.js";

function getArtistNames(track) {
  return Array.isArray(track?.artists)
    ? track.artists.map((artist) => artist?.name).filter(Boolean)
    : [];
}

export function compactSpotifyTrack(track) {
  const artistNames = getArtistNames(track);
  const albumImage = track?.album?.images?.[0]?.url || "";

  return {
    id: track.id,
    uri: track.uri,
    name: track.name,
    artists: artistNames,
    durationMs: track.duration_ms || 0,
    albumImage,
    normalizedSongNames: normalizeList([track.name]),
    normalizedArtistNames: normalizeList(artistNames),
  };
}

export function buildQuizCatalog({ playlistId, playlistName, playlistUri, snapshotId, tracks }) {
  const compactTracks = tracks
    .filter((track) => track?.id && track?.uri && track?.name)
    .map(compactSpotifyTrack);

  return {
    playlistId,
    playlistName,
    playlistUri,
    snapshotId,
    tracks: compactTracks,
    trackIds: compactTracks.map((track) => track.id),
    tracksById: Object.fromEntries(
      compactTracks.map((track) => [track.id, track])
    ),
  };
}

export function getUniqueArtists(catalog) {
  const artistNames = new Set();

  catalog.tracks.forEach((track) => {
    track.artists.forEach((artist) => artistNames.add(artist));
  });

  return Array.from(artistNames).sort((a, b) => a.localeCompare(b));
}
