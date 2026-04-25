export function normalizeGuess(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " and ")
    .replace(/\b(feat|ft|featuring)\.?\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeList(values) {
  return values.map(normalizeGuess).filter(Boolean);
}

export function verifySongGuess(track, guess) {
  if (!track) return false;
  const normalizedGuess = normalizeGuess(guess);
  return track.normalizedSongNames.includes(normalizedGuess);
}

export function verifyArtistGuess(track, guess) {
  if (!track) return false;
  const normalizedGuess = normalizeGuess(guess);
  return track.normalizedArtistNames.includes(normalizedGuess);
}
