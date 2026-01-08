
'use client';

import { useEffect, useRef, useState } from 'react';

import { ShaderAnimation } from './shader-animation';

const Loading = () => {
  const [loadingProgress, setLoadingProgress] = useState(1);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // iOS Safari: autoplay works reliably only when video is muted + plays inline.
    // Set via properties + attributes to cover WebKit edge cases.
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const tryPlay = () => {
      video.play().catch(() => {});
    };

    tryPlay();
    const raf = requestAnimationFrame(tryPlay);
    const t = window.setTimeout(tryPlay, 250);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div className="loading-root">
      {/* Text overlay - always visible */}
      {/* <div className="overlay">
        <img className="overlay-logo" src="/logo.svg" alt="FeelME Town" />
        <span className="overlay-overline">FeelME Town</span>
        <h1 className="overlay-heading">Curating your private world</h1>
        <p className="overlay-subtitle">Please hold on while we set the ambience.</p>
      </div> */}

      <div className="video-layer">
        <video
          className="background-video"
          ref={videoRef}
          src="/loading.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          controls={false}
          disablePictureInPicture
          x-webkit-airplay="deny"
          onLoadedData={(e) => {
            const video = e.target as HTMLVideoElement;
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.setAttribute('muted', '');
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.play().catch(() => {});
          }}
        />
      </div>

      {/* Shader Animation - loads in background */}
      {/* <div className="animation-layer">
        <ShaderAnimation />
      </div> */}

      {/* Progress indicator */}
      <div className="progress-indicator">{loadingProgress}%</div>

      <style jsx>{`
        .loading-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          height: 100svh;
          height: 100dvh;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          overflow: hidden;
        }

        .video-layer {
          position: absolute;
          inset: 0;
          z-index: 0;
          width: 100vw;
          height: 100vh;
          height: 100svh;
          height: 100dvh;
          overflow: hidden;
        }

        .background-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.6) contrast(1.1);
          pointer-events: none;
        }

        .background-video::-webkit-media-controls {
          display: none !important;
        }

        .background-video::-webkit-media-controls-panel {
          display: none !important;
        }

        .background-video::-webkit-media-controls-start-playback-button {
          display: none !important;
          -webkit-appearance: none;
        }

        .background-video::-webkit-media-controls-overlay-play-button {
          display: none !important;
          -webkit-appearance: none;
        }

        @media (max-width: 768px) {
          .background-video {
            object-fit: contain;
          }
        }

        .animation-layer {
          position: absolute;
          inset: 0;
          opacity: 0.5; /* Set to 50% opacity by default */
          transition: opacity 0.5s ease-in-out;
          z-index: 1;
        }

        .animation-layer :global(div) {
          width: 100% !important;
          height: 100% !important;
        }

        .overlay {
          position: relative;
          z-index: 2;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 2rem;
          pointer-events: none;
        }

        .overlay-logo {
          width: 72px;
          height: 72px;
          margin: 0 auto;
          display: block;
          filter: drop-shadow(0 0 18px rgba(255, 0, 5, 0.35));
        }

        .overlay-overline {
          color: rgba(255, 255, 255, 0.65);
          font-family: 'Paralucent-Medium', Arial, sans-serif;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          font-size: 0.75rem;
        }

        .overlay-heading {
          margin: 0;
          font-size: clamp(2rem, 4vw, 3.5rem);
          font-family: 'Paralucent-DemiBold', Arial, sans-serif;
          color: #ffffff;
          text-shadow: 0 0 30px rgba(255, 0, 5, 0.45);
          letter-spacing: 0.05em;
        }

        .overlay-subtitle {
          margin: 0;
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: rgba(255, 255, 255, 0.8);
          font-family: 'Paralucent-Medium', Arial, sans-serif;
        }

        .progress-indicator {
          position: absolute;
          bottom: 2.5rem;
          right: 3rem;
          z-index: 2;
          font-family: 'Hacker', monospace;
          font-size: 1.75rem;
          color: rgba(255, 255, 255, 0.9);
          text-shadow: 0 0 12px rgba(255, 0, 5, 0.6);
        }

        @media (max-width: 768px) {
          .overlay {
            gap: 0.5rem;
            padding: 1.5rem;
          }

          .overlay-logo {
            width: 58px;
            height: 58px;
          }

          .overlay-overline {
            font-size: 0.65rem;
            letter-spacing: 0.3em;
          }

          .overlay-heading {
            font-size: clamp(1.75rem, 8vw, 2.5rem);
            letter-spacing: 0.04em;
          }

          .overlay-subtitle {
            font-size: clamp(0.95rem, 3vw, 1.1rem);
          }

          .progress-indicator {
            bottom: 1.5rem;
            right: 1.75rem;
            font-size: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .overlay {
            padding: 1.25rem;
          }

          .overlay-logo {
            width: 52px;
            height: 52px;
          }

          .overlay-overline {
            font-size: 0.6rem;
            letter-spacing: 0.25em;
          }

          .progress-indicator {
            bottom: 1.25rem;
            right: 1.25rem;
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;