import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

// Audio-element playback for the no-login "Online" quiz mode. Mirrors the
// stopPlaying / stopPlaybackRequest fade contract used by the Spotify Player
// component so the surrounding quiz logic can drive either engine the same way.
const PreviewPlayer = forwardRef(function PreviewPlayer(
  { onReady, stopPlaying, stopPlaybackRequest },
  ref
) {
  const audioRef = useRef(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio();
    audio.preload = "auto";
    audioRef.current = audio;
    onReadyRef.current?.("preview");

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    async play(previewUrl) {
      const audio = audioRef.current;
      if (!audio || !previewUrl) return false;

      audio.src = previewUrl;
      audio.currentTime = 0;
      audio.muted = false;
      audio.volume = 0.5;

      try {
        await audio.play();
        return true;
      } catch (error) {
        console.warn("Preview playback was blocked.", error);
        return false;
      }
    },
    // Satisfy the browser autoplay policy by priming the element during a user
    // gesture, so the later countdown-triggered play() is allowed.
    unlock() {
      const audio = audioRef.current;
      if (!audio) return;

      // A playable src is required for play() to grant autoplay permission to
      // this element. Without one the promise rejects silently and the first
      // real song is still blocked by the browser's autoplay policy.
      audio.src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      audio.muted = true;
      Promise.resolve(audio.play())
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
        })
        .catch(() => {})
        .finally(() => {
          audio.muted = false;
          audio.src = "";
        });
    },
  }));

  useEffect(() => {
    if (!stopPlaying) return;
    const audio = audioRef.current;
    if (!audio) return;

    const fadeDurationMs = Math.max(0, stopPlaybackRequest?.fadeMs ?? 900);
    let isCancelled = false;

    const pauseAndRestoreVolume = () => {
      audio.pause();
      if (!isCancelled) {
        audio.volume = 0.5;
      }
    };

    if (fadeDurationMs === 0) {
      audio.volume = 0;
      pauseAndRestoreVolume();
      return () => {
        isCancelled = true;
      };
    }

    const startVolume = audio.volume || 0.5;
    const startedAt = performance.now();
    const fadeInterval = setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / fadeDurationMs);
      audio.volume = Math.max(0, startVolume * (1 - progress));

      if (progress >= 1) {
        clearInterval(fadeInterval);
        pauseAndRestoreVolume();
      }
    }, 50);

    return () => {
      isCancelled = true;
      clearInterval(fadeInterval);
    };
  }, [stopPlaying, stopPlaybackRequest]);

  return null;
});

export default PreviewPlayer;
