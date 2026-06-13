import React, { useState, useEffect, useRef } from 'react';

function WebPlayback({token, isReady, stopPlaying, stopPlaybackRequest, onPlaybackState}) {
    const [player, setPlayer] = useState(undefined);
    const [current_track, setTrack] = useState(track);
    const [id, setId] = useState('');
    const [isPaused, setPaused] = useState(true);
    const [isActive, setActive] = useState(false);
    const isReadyRef = useRef(isReady);
    const onPlaybackStateRef = useRef(onPlaybackState);
    const tokenRef = useRef(token);

useEffect(() => {
    isReadyRef.current = isReady;
}, [isReady]);

useEffect(() => {
    onPlaybackStateRef.current = onPlaybackState;
}, [onPlaybackState]);

useEffect(() => {
    tokenRef.current = token;
}, [token]);

useEffect(() => {
    let spotifyPlayer = null;
    let isCancelled = false;
    let currentDeviceId = "";

    const emitPlaybackState = (nextState) => {
        onPlaybackStateRef.current?.(nextState);
    };

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {

        const player = new window.Spotify.Player({
            name: 'Songle',
            getOAuthToken: cb => { cb(tokenRef.current); },
            volume: 0.5
        });
        spotifyPlayer = player;

        setPlayer(player);
        emitPlaybackState({
            ready: false,
            connected: false,
            player,
            getCurrentState: () => player.getCurrentState(),
            activateElement: () => player.activateElement?.(),
        });

        player.addListener('ready', ({ device_id }) => {
            console.log('Ready with Device ID', device_id);
            if (isCancelled) return;
            currentDeviceId = device_id;
            setId(device_id);
            isReadyRef.current(device_id)
            emitPlaybackState({
                ready: true,
                connected: true,
                deviceId: device_id,
                player,
                getCurrentState: () => player.getCurrentState(),
                activateElement: () => player.activateElement?.(),
                lastError: null,
            });
        });

        player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
            if (isCancelled) return;
            emitPlaybackState({
                ready: false,
                connected: false,
                deviceId: device_id,
                player,
                getCurrentState: () => player.getCurrentState(),
                activateElement: () => player.activateElement?.(),
                lastError: 'not_ready',
            });
        });

        ['initialization_error', 'authentication_error', 'account_error', 'playback_error'].forEach((eventName) => {
            player.addListener(eventName, ({ message }) => {
                console.warn(`Spotify ${eventName}:`, message);
                if (isCancelled) return;
                const isPlaybackError = eventName === 'playback_error';
                const hasReadyDevice = Boolean(currentDeviceId);
                emitPlaybackState({
                    ready: isPlaybackError && hasReadyDevice,
                    connected: isPlaybackError && hasReadyDevice,
                    deviceId: currentDeviceId,
                    player,
                    getCurrentState: () => player.getCurrentState(),
                    activateElement: () => player.activateElement?.(),
                    lastError: `${eventName}: ${message}`,
                });
            });
        });


        player.connect().then(success => {
            if (isCancelled) return;
            if (success) {
              console.log('The Web Playback SDK successfully connected to Spotify!');
              emitPlaybackState({
                  connected: true,
                  player,
                  getCurrentState: () => player.getCurrentState(),
                  activateElement: () => player.activateElement?.(),
              });
            }
          })
          

        player.addListener('player_state_changed', ( state => {
            if (isCancelled) return;

            if (!state) {
                emitPlaybackState({
                    active: false,
                    player,
                    getCurrentState: () => player.getCurrentState(),
                    activateElement: () => player.activateElement?.(),
                });
                return;
            }
        
            setTrack(state.track_window.current_track);
            setPaused(state.paused);
            emitPlaybackState({
                active: true,
                paused: state.paused,
                currentTrackUri: state.track_window.current_track?.uri,
                currentTrackId: state.track_window.current_track?.id,
                position: state.position,
                player,
                getCurrentState: () => player.getCurrentState(),
                activateElement: () => player.activateElement?.(),
            });
        
            player.getCurrentState().then( state => {
                if (isCancelled) return;
                (!state)? setActive(false) : setActive(true)

            });
    

        
        }));

    };

    return () => {
        isCancelled = true;
        if (spotifyPlayer) {
            spotifyPlayer.disconnect();
            console.log('Spotify Web Playback SDK disconnected during cleanup.');
        }
    }
}, []);

useEffect(() => {
    if (!stopPlaying || !player) return;

    console.log('Stopping playback...');
    const fadeDurationMs = Math.max(0, stopPlaybackRequest?.fadeMs ?? 900);
    let isCancelled = false;
    const pauseAndRestoreVolume = () => {
        Promise.resolve(player.pause()).finally(() => {
            if (!isCancelled) {
                player.setVolume(0.5);
            }
        });
    };

    if (fadeDurationMs === 0) {
        player.setVolume(0);
        pauseAndRestoreVolume();
        return () => {
            isCancelled = true;
        };
    }

    const startVolume = 0.5;
    const startedAt = performance.now();
    const fadeInterval = setInterval(() => {
        const elapsedMs = performance.now() - startedAt;
        const progress = Math.min(1, elapsedMs / fadeDurationMs);
        const nextVolume = Math.max(0, startVolume * (1 - progress));
        player.setVolume(nextVolume);

        if (progress >= 1) {
            clearInterval(fadeInterval);
            pauseAndRestoreVolume();
        }
    }, 50);

    return () => {
        isCancelled = true;
        clearInterval(fadeInterval);
    };
}, [stopPlaying, stopPlaybackRequest, player]); 


return (
    <>
        <div className="container">
            <div className="main-wrapper">
            </div>
        </div>
     </>
)

}

export default WebPlayback

const track = {
    name: "",
    album: {
        images: [
            { url: "" }
        ]
    },
    artists: [
        { name: "" }
    ]
}
