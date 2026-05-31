import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, 
  ChevronRight, FastForward, Monitor, Loader2,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Hls from "hls.js";

interface VideoPlayerProps {
  key?: React.Key;
  videoUrl: string;
  title: string;
  subtitle: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  savedProgress?: number;
  hasNextEpisode?: boolean;
  onNextEpisode?: () => void;
}

export default function VideoPlayer({
  videoUrl,
  title,
  subtitle,
  onTimeUpdate,
  onEnded,
  savedProgress = 0,
  hasNextEpisode = false,
  onNextEpisode
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isPlaybackFinished, setIsPlaybackFinished] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Restart video if source changes
  useEffect(() => {
    setIsPlaybackFinished(false);
    setIsBuffering(true);
    setCountdown(null);
    setIsPlaying(false);

    if (videoRef.current) {
      // Clean up previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const isM3u8 = videoUrl.endsWith('.m3u8') || videoUrl.includes('.m3u8');
      
      if (isM3u8) {
        if (Hls.isSupported()) {
          const hls = new Hls({
            maxMaxBufferLength: 30,
            enableWorker: true,
          });
          hlsRef.current = hls;
          hls.loadSource(videoUrl);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setIsBuffering(false);
          });
          hls.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.warn("HLS network error, recovering...", data);
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.warn("HLS media error, recovering...", data);
                  hls.recoverMediaError();
                  break;
                default:
                  console.error("Unrecoverable HLS error:", data);
                  break;
              }
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // Native Safari source support
          videoRef.current.src = videoUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setIsBuffering(false);
          });
        } else {
          console.error("HLS streams are not natively supported on this browser.");
          setIsBuffering(false);
        }
      } else {
        // Fallback for standard files like MP4
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // Handle saved progress
  useEffect(() => {
    if (videoRef.current && savedProgress > 0 && duration > 0) {
      // Avoid infinite loop by only seeking once
      if (Math.abs(videoRef.current.currentTime - savedProgress) > 5) {
        videoRef.current.currentTime = savedProgress;
      }
    }
  }, [savedProgress, duration]);

  // Set up timer for mouse movement / controls visibility
  const triggerControlsActivity = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !isPlaybackFinished) {
        setIsControlsVisible(false);
      }
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying, isPlaybackFinished]);

  // Autoplay next episode countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown !== null && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setCountdown(null);
      if (onNextEpisode) onNextEpisode();
    }
    return () => clearTimeout(timer);
  }, [countdown, onNextEpisode]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log("Play interrupted", e));
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      videoRef.current.muted = nextMute;
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
    }
  };

  const cycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error("Error attempting fullscreen", err));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch(err => console.error("Error exiting fullscreen", err));
    }
  };

  // Monitor fullscreen events directly (e.g. esc key matches state)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div 
      ref={containerRef}
      id="custom-cinema-player"
      className="relative flex items-center justify-center w-full aspect-video bg-black rounded-2xl overflow-hidden group/player select-none cursor-pointer border border-slate-800"
      onMouseMove={triggerControlsActivity}
      onClick={handlePlayPause}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain"
        preload="auto"
        playsInline
        onPlay={() => {
          setIsPlaying(true);
          setIsPlaybackFinished(false);
          setCountdown(null);
        }}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => {
          const video = e.currentTarget;
          setCurrentTime(video.currentTime);
          if (onTimeUpdate) {
            onTimeUpdate(video.currentTime, video.duration);
          }
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          setIsPlaying(false);
          setIsPlaybackFinished(true);
          if (onEnded) onEnded();
          if (hasNextEpisode && onNextEpisode) {
            setCountdown(5);
          }
        }}
      >
        Your browser does not support HTML5 video streaming.
      </video>

      {/* Loading/Buffering overlay */}
      {isBuffering && !isPlaybackFinished && (
        <div id="player-loading-spinner" className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-none transition-opacity">
          <div className="flex flex-col items-center">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <span className="mt-3 text-slate-300 text-xs font-mono tracking-wider">LOADING STREAM...</span>
          </div>
        </div>
      )}

      {/* Big Center Play Overlay */}
      <AnimatePresence>
        {!isPlaying && !isBuffering && !isPlaybackFinished && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            id="center-play-button"
            className="absolute flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-400/35 hover:scale-110 active:scale-95 transition-transform"
          >
            <Play className="w-7 h-7 fill-indigo-400 ml-1" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Episode Countdowns */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            id="countdown-overlay"
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm uppercase tracking-wider text-indigo-400 font-mono font-bold mb-2">AUTOPLAY NEXT INFUSION</span>
            <h4 className="text-xl font-sans font-medium text-white mb-4">Starting the next saga...</h4>
            <div className="relative flex items-center justify-center w-24 h-24 mb-6">
              <svg className="absolute w-24 h-24 -rotate-90">
                <circle 
                  cx="48" 
                  cy="48" 
                  r="36" 
                  stroke="#334155" 
                  strokeWidth="4" 
                  fill="transparent" 
                />
                <circle 
                  cx="48" 
                  cy="48" 
                  r="36" 
                  stroke="#6366f1" 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray="226" 
                  strokeDashoffset={226 - (226 * (countdown / 5))}
                  className="transition-all duration-1000 ease-linear"
                />
              </svg>
              <span className="text-3xl font-mono text-white font-bold">{countdown}</span>
            </div>
            <div className="flex gap-4">
              <button 
                id="cancel-countdown-btn"
                onClick={() => setCountdown(null)}
                className="px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel Autoplay
              </button>
              <button 
                id="play-now-countdown-btn"
                onClick={() => {
                  setCountdown(null);
                  if (onNextEpisode) onNextEpisode();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-indigo-600/20"
              >
                Play Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Playback finished Replay Panel */}
      {isPlaybackFinished && countdown === null && (
        <div 
          id="replay-finished-overlay"
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h4 className="text-xl font-medium text-white mb-3">Replay this quest?</h4>
          <p className="text-xs text-slate-400 max-w-xs mb-5">You have completed watching this episode module. Let's restart or look at the details below.</p>
          <div className="flex gap-4">
            <button 
              id="finished-replay-btn"
              onClick={() => {
                setIsPlaybackFinished(false);
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play();
                }
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 hover:border-slate-500 rounded-lg text-xs font-medium text-white transition-all shadow-md"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-hover" /> Replay Episode
            </button>
            {hasNextEpisode && (
              <button 
                id="finished-next-btn"
                onClick={() => {
                  setIsPlaybackFinished(false);
                  if (onNextEpisode) onNextEpisode();
                }}
                className="flex items-center gap-1 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-pink-500 hover:opacity-90 rounded-lg text-xs font-bold text-white transition-all shadow-lg shadow-violet-500/10"
              >
                Next Episode <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* TOP DECK SHADOw Title Overlay */}
      <div 
        id="player-top-deck-banner"
        className={`absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex items-start justify-between px-6 py-4 transition-all duration-300 pointer-events-none ${
          isControlsVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest">{subtitle}</span>
          <h2 className="text-sm font-sans font-medium text-white mt-0.5 truncate max-w-sm md:max-w-md">{title}</h2>
        </div>
        <div className="flex items-center gap-2 bg-slate-950/60 backdrop-blur-md px-3 py-1 border border-slate-800/40 rounded-full text-[10px] text-indigo-400 font-mono tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span> HD STREAM
        </div>
      </div>

      {/* BOTTOM DECK CONTROLS */}
      <div 
        id="player-control-deck"
        className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-10 pb-4 px-6 transition-all duration-300 flex flex-col gap-3 ${
          isControlsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
        onClick={(e) => e.stopPropagation()} // stop controls background from registering play/pause
      >
        {/* Scrubber Range Bar */}
        <div className="flex items-center gap-4 w-full group/scrub">
          <span className="text-[10px] font-mono text-slate-400 min-w-[35px]">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 accent-indigo-400 bg-slate-800/80 rounded-lg appearance-none cursor-pointer hover:h-2 transition-all"
          />
          <span className="text-[10px] font-mono text-slate-400 min-w-[35px]">{formatTime(duration)}</span>
        </div>

        {/* Action controls row */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              id="player-play-btn"
              onClick={handlePlayPause}
              className="p-1.5 bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 hover:text-white hover:bg-indigo-500 hover:border-indigo-400 rounded-lg transition-all"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              id="player-skip-back-btn"
              onClick={skipBackward}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Rewind 10s"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              id="player-skip-forward-btn"
              onClick={skipForward}
              className="p-1.5 text-slate-400 hover:text-white transition-colors"
              title="Fast Forward 10s"
            >
              <FastForward className="w-4 h-4" />
            </button>

            {/* Volume bundle */}
            <div className="flex items-center gap-2 ml-2">
              <button
                id="player-volume-btn"
                onClick={toggleMute}
                className="p-1.5 text-slate-300 hover:text-indigo-400 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 h-1 bg-slate-800 accent-indigo-400 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Speed Control */}
            <button
              id="player-speed-btn"
              onClick={cycleSpeed}
              className="text-slate-300 hover:text-indigo-400 bg-slate-900/60 border border-slate-800/80 px-2.5 py-1 rounded text-[10px] font-mono tracking-wider transition-all cursor-pointer"
              title="Speed"
            >
              SPEED: {playbackSpeed}x
            </button>

            {/* Native Fullscreen */}
            <button
              id="player-fullscreen-btn"
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-300 hover:text-indigo-400 transition-colors"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
