import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Film, Tv, Flame, Play, Heart, History, User, Sparkles, 
  ArrowLeft, RotateCcw, Share2, Star, Clock, Trophy, BadgeAlert, Loader2,
  HelpCircle, Shuffle, ChevronRight, Check, ChevronLeft, Trash2
} from "lucide-react";
import { CartoonItem, CartoonDetails, Episode, WatchHistoryItem, UserProfile } from "./types";
import VideoPlayer from "./components/VideoPlayer";
import UserProfileModal from "./components/UserProfileModal";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [movies, setMovies] = useState<CartoonItem[]>([]);
  const [series, setSeries] = useState<CartoonItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "movies" | "series" | "watchlist" | "history">("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selected video view
  const [selectedCartoon, setSelectedCartoon] = useState<CartoonItem | null>(null);
  const [cartoonDetails, setCartoonDetails] = useState<CartoonDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);

  // Cinema server selection states
  const [activeServer, setActiveServer] = useState<"server1" | "server2" | "server3">("server1");
  const [extractionData, setExtractionData] = useState<any>(null);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  const [selectedExtractedLang, setSelectedExtractedLang] = useState<string>("");

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>({
    username: "OtakuPilot",
    avatarUrl: "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg",
    joinedDate: "May 2026",
    minutesWatched: 12,
    xp: 45,
    level: 1
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [availableAvatars, setAvailableAvatars] = useState<{ src: string; alt: string }[]>([]);

  // Lists stored in localStorage
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Intro / Onboarding States
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [introProgress, setIntroProgress] = useState(0);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [onboardingName, setOnboardingName] = useState("");
  const [showOnboardingSubmitError, setShowOnboardingSubmitError] = useState(false);

  // Footer Dynamic Modal States
  const [activeFooterModal, setActiveFooterModal] = useState<"about" | "contact" | "terms" | "privacy" | null>(null);

  // Dynamic Subpages/Wizard Interactive States
  const [contactStep, setContactStep] = useState(1);
  const [contactTopic, setContactTopic] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPriority, setContactPriority] = useState("STANDARD");
  const [transmissionSubmitted, setTransmissionSubmitted] = useState(false);
  const [transmissionHash, setTransmissionHash] = useState("");
  const [hasPurgeConfirmed, setHasPurgeConfirmed] = useState(false);

  // Handle random generation for nickname during entry onboarding
  const handleRandomizeOnboardingName = () => {
    const list = [
      "LuffyKing", "NarutoRamen", "ZoroLost", "SaitamaOne", "GokuWannabe",
      "AnyaPeanuts", "DekuHumble", "ToonTrooper", "PixelNinja", "Kakarot",
      "SpideyWeb", "ShadowMonk", "HokageInTraining", "SuperSaiyan", "ChibiHero",
      "NatsuFire", "GohanBeast", "SpikeSpiegel", "KilluaThief", "PikaSpark"
    ];
    const rand = list[Math.floor(Math.random() * list.length)];
    setOnboardingName(rand);
    setShowOnboardingSubmitError(false);
  };

  // Submit username entry onboarding form
  const handleOnboardingSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onboardingName.trim()) {
      setShowOnboardingSubmitError(true);
      return;
    }

    const nextProfile = {
      ...userProfile,
      username: onboardingName.trim()
    };
    setUserProfile(nextProfile);
    localStorage.setItem("cartoon_user_profile", JSON.stringify(nextProfile));
    localStorage.setItem("toonplay_onboarded", "true");
    setIsOnboarded(true);
    setLoadingIntro(false);
  };

  // Reset page whenever tab or search filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Sliding Hero State
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);

  // Take 3 items from series and 2 items from movies to form 5 items
  const heroItems = [
    ...series.slice(0, 3),
    ...movies.slice(0, 2)
  ].slice(0, 5);

  // Auto-sliding effect
  useEffect(() => {
    if (heroItems.length === 0) return;
    const interval = setInterval(() => {
      setActiveHeroIdx(prev => (prev + 1) % heroItems.length);
    }, 5000); // Auto-slide every 5 seconds
    return () => clearInterval(interval);
  }, [heroItems.length]);

  const deleteHistoryByCartoonId = (id: string) => {
    const next = watchHistory.filter(h => h.cartoonId !== id);
    setWatchHistory(next);
    localStorage.setItem("cartoon_history", JSON.stringify(next));
  };

  // Ticking for watch timer (XP accumulation during active watching)
  const isWatchingRef = useRef<boolean>(false);
  const watchStateHistoryRef = useRef<WatchHistoryItem[]>([]);

  // Initialize data on mount
  useEffect(() => {
    // Media Lists
    const fetchCatalog = async () => {
      try {
        setLoadingMedia(true);
        const [moviesP1Res, seriesP1Res] = await Promise.all([
          fetch("/api/cartoon/movies?page=1"),
          fetch("/api/cartoon/series?page=1")
        ]);
        const moviesP1 = await moviesP1Res.json();
        const seriesP1 = await seriesP1Res.json();
        
        let allMovies: CartoonItem[] = [];
        let allSeries: CartoonItem[] = [];
        
        let moviesTotalPages = 1;
        let seriesTotalPages = 1;

        if (moviesP1.success) {
          allMovies = moviesP1.data || [];
          if (moviesP1.pagination && moviesP1.pagination.totalPages) {
            moviesTotalPages = moviesP1.pagination.totalPages;
          }
        }
        if (seriesP1.success) {
          allSeries = seriesP1.data || [];
          if (seriesP1.pagination && seriesP1.pagination.totalPages) {
            seriesTotalPages = seriesP1.pagination.totalPages;
          }
        }

        const movieFetchers = [];
        for (let p = 2; p <= moviesTotalPages; p++) {
          movieFetchers.push(
            fetch(`/api/cartoon/movies?page=${p}`)
              .then(res => res.json())
              .then(data => (data.success && data.data) ? data.data : [])
              .catch(err => {
                console.error(`Error fetching movie page ${p}:`, err);
                return [];
              })
          );
        }

        const seriesFetchers = [];
        for (let p = 2; p <= seriesTotalPages; p++) {
          seriesFetchers.push(
            fetch(`/api/cartoon/series?page=${p}`)
              .then(res => res.json())
              .then(data => (data.success && data.data) ? data.data : [])
              .catch(err => {
                console.error(`Error fetching series page ${p}:`, err);
                return [];
              })
          );
        }

        const [fetchedMoviesList, fetchedSeriesList] = await Promise.all([
          Promise.all(movieFetchers),
          Promise.all(seriesFetchers)
        ]);

        for (const list of fetchedMoviesList) {
          allMovies = [...allMovies, ...list];
        }
        for (const list of fetchedSeriesList) {
          allSeries = [...allSeries, ...list];
        }

        const uniqueMovies = allMovies.filter((item, idx, self) => 
          self.findIndex(t => t.id === item.id) === idx
        );
        const uniqueSeries = allSeries.filter((item, idx, self) => 
          self.findIndex(t => t.id === item.id) === idx
        );

        setMovies(uniqueMovies);
        setSeries(uniqueSeries);
      } catch (err) {
        console.error("Error fetching media listing core:", err);
      } finally {
        setLoadingMedia(false);
      }
    };

    const fetchAvatars = async () => {
      try {
        const res = await fetch("https://animerulz.watch/profile-icons/icons.json");
        const data = await res.json();
        if (data && Array.isArray(data.avatars)) {
          const mapped = data.avatars.map((av: any) => {
            const src = av.src.startsWith("/") 
              ? `https://animerulz.watch${av.src}` 
              : av.src;
            return {
              src,
              alt: av.alt || `Avatar option ${av.src.split("/").pop()}`
            };
          });
          setAvailableAvatars(mapped);
          
          setUserProfile(current => {
            if (!current.avatarUrl || current.avatarUrl === "otaku-fox" || !current.avatarUrl.startsWith("http") || current.avatarUrl.endsWith("profile.webp")) {
              const defaultAvatar = mapped[0]?.src || "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg";
              return { ...current, avatarUrl: defaultAvatar };
            }
            return current;
          });
        }
      } catch (err) {
        console.error("Error fetching dynamic avatars:", err);
        const fallbackList = [
          { "src": "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg", "alt": "Avatar option avatar1" },
          { "src": "https://animerulz.watch/profile-icons/avatars/avatar2.jpeg", "alt": "Avatar option avatar2" },
          { "src": "https://animerulz.watch/profile-icons/avatars/avatar3.jpeg", "alt": "Avatar option avatar3" },
          { "src": "https://animerulz.watch/profile-icons/avatars/avatar4.jpeg", "alt": "Avatar option avatar4" },
          { "src": "https://animerulz.watch/profile-icons/avatars/avatar5.jpeg", "alt": "Avatar option avatar5" },
          { "src": "https://animerulz.watch/images/profile.webp", "alt": "Avatar option default" }
        ];
        setAvailableAvatars(fallbackList);
      }
    };

    fetchCatalog();
    fetchAvatars();

    // Local Storage Loading
    const storedWatchlist = localStorage.getItem("cartoon_watchlist");
    if (storedWatchlist) setWatchlist(JSON.parse(storedWatchlist));

    const storedHistory = localStorage.getItem("cartoon_history");
    if (storedHistory) setWatchHistory(JSON.parse(storedHistory));

    const storedProfile = localStorage.getItem("cartoon_user_profile");
    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile);
        if (parsed.avatarUrl === "otaku-fox" || !parsed.avatarUrl || !parsed.avatarUrl.startsWith("http") || parsed.avatarUrl.endsWith("profile.webp")) {
          parsed.avatarUrl = "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg";
        }
        setUserProfile(parsed);
      } catch (e) {
        console.error("Error reading stored profile:", e);
      }
    }

    const isCurrentlyOnboarded = localStorage.getItem("toonplay_onboarded") === "true";
    if (isCurrentlyOnboarded) {
      setIsOnboarded(true);
    }

    // Initial path-based footer modal routing
    const initialPath = window.location.pathname.replace(/^\//, "");
    if (initialPath === "about" || initialPath === "contact" || initialPath === "terms" || initialPath === "privacy") {
      setActiveFooterModal(initialPath as "about" | "contact" | "terms" | "privacy");
    }

    // Proactively clean up any legacy '#catalog' or other url hashes to keep URL pretty and clean at '/'
    if (window.location.hash) {
      window.history.replaceState(null, "", "/");
    }
  }, []);

  // Synchronize URL path with footer page state
  useEffect(() => {
    const currentPath = window.location.pathname.replace(/^\//, "");
    const targetPath = activeFooterModal || "";
    if (currentPath !== targetPath) {
      window.history.pushState(null, "", "/" + targetPath);
    }
  }, [activeFooterModal]);

  // Handle browser back and forward actions (popstate events)
  useEffect(() => {
    const handlePopState = () => {
      const pathName = window.location.pathname.replace(/^\//, "");
      if (pathName === "about" || pathName === "contact" || pathName === "terms" || pathName === "privacy") {
        setActiveFooterModal(pathName as "about" | "contact" | "terms" | "privacy");
      } else {
        setActiveFooterModal(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Intro loader progress timing
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const startTime = Date.now();
    const totalDuration = 2000; // 2 seconds loader speed

    const updateTick = () => {
      const elapsed = Date.now() - startTime;
      const progressValue = Math.min((elapsed / totalDuration) * 100, 100);
      setIntroProgress(Math.floor(progressValue));

      if (progressValue < 100) {
        timer = setTimeout(updateTick, 30);
      } else {
        const isCurrentlyOnboarded = localStorage.getItem("toonplay_onboarded") === "true";
        if (isCurrentlyOnboarded) {
          setLoadingIntro(false);
          setIsOnboarded(true);
        } else {
          // Keep loadingIntro screen active, but with progress 100 to show the username onboarding form
          setIsOnboarded(false);
        }
      }
    };

    updateTick();
    return () => clearTimeout(timer);
  }, []);

  // Update refs to avoid stale interval closures
  useEffect(() => {
    watchStateHistoryRef.current = watchHistory;
  }, [watchHistory]);

  // Keep tracking watching interval for leveling up
  useEffect(() => {
    let watchTimer: NodeJS.Timeout;

    if (activeEpisode !== null) {
      isWatchingRef.current = true;
      
      // Every 30 seconds, reward 5 XP and 0.5 minute watch time
      watchTimer = setInterval(() => {
        if (isWatchingRef.current && activeEpisode) {
          setUserProfile((current) => {
            const nextMinutes = current.minutesWatched + 1;
            const extraXp = 10;
            const nextXp = current.xp + extraXp;
            
            const xpNeeded = current.level * 100;
            let finalLevel = current.level;
            let finalXp = nextXp;

            if (finalXp >= xpNeeded) {
              finalXp -= xpNeeded;
              finalLevel += 1;
            }

            const updated = {
              ...current,
              minutesWatched: nextMinutes,
              xp: finalXp,
              level: finalLevel
            };
            localStorage.setItem("cartoon_user_profile", JSON.stringify(updated));
            return updated;
          });
        }
      }, 30000);
    } else {
      isWatchingRef.current = false;
    }

    return () => {
      if (watchTimer) clearInterval(watchTimer);
    };
  }, [activeEpisode]);

  // Trigger stream extraction when Server 2 is active
  useEffect(() => {
    if (activeServer === "server2" && cartoonDetails && cartoonDetails.watchServers && cartoonDetails.watchServers.length > 0) {
      const server1Url = cartoonDetails.watchServers[0].url;
      if (server1Url) {
        setLoadingExtraction(true);
        setExtractionData(null);
        fetch(`/api/extract?url=${encodeURIComponent(server1Url)}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.success) {
              setExtractionData(data);
              const cats = data.available_categories || [];
              if (cats.includes("hin")) {
                setSelectedExtractedLang("hin");
              } else if (cats.includes("eng")) {
                setSelectedExtractedLang("eng");
              } else if (cats.length > 0) {
                setSelectedExtractedLang(cats[0]);
              }
            } else {
              console.warn("Extraction API response indicates failure:", data);
            }
          })
          .catch(err => {
            console.error("Stream extraction failed:", err);
          })
          .finally(() => {
            setLoadingExtraction(false);
          });
      }
    }
  }, [activeServer, cartoonDetails]);

  // Sync watchlist to local storage
  const toggleWatchlist = (id: string) => {
    let next: string[];
    if (watchlist.includes(id)) {
      next = watchlist.filter(item => item !== id);
    } else {
      next = [...watchlist, id];
    }
    setWatchlist(next);
    localStorage.setItem("cartoon_watchlist", JSON.stringify(next));
  };

  // Select cartoon details of a specific item
  const handleSelectCartoon = async (item: CartoonItem, customEpisodeNumber?: number) => {
    setSelectedCartoon(item);
    setLoadingDetails(true);
    setCartoonDetails(null);
    setActiveEpisode(null);
    setActiveServer("server1");
    setExtractionData(null);
    setSelectedExtractedLang("");

    try {
      if (item.type === "movie") {
        const infoRes = await fetch(`/api/info?id=${encodeURIComponent(item.id)}`);
        const infoData = await infoRes.json();
        if (infoData.success && infoData.anime) {
          const anime = infoData.anime;
          const details: CartoonDetails = {
            id: item.id,
            title: anime.title || item.title,
            image: anime.image || item.image,
            type: "movie",
            description: anime.overview || "No overview available for this cinematic special.",
            rating: anime.rating || 9.2,
            ratingCount: anime.ratingCount || 1084,
            durationOrEpisodes: anime.duration || "1h 30m",
            genre: anime.genres || ["Animation", "Movie"],
            releaseYear: anime.year ? parseInt(anime.year, 10) : 2021,
            director: "Curated Cinema Selection",
            episodes: [{
              id: `${item.id}-movie-main`,
              number: 1,
              title: "Full Feature Film",
              duration: anime.duration || "1h 30m",
              videoUrl: anime.watchServers?.[0]?.url || "",
              description: anime.overview || "Click Play to begin the high-quality streaming journey."
            }],
            characters: [
              { name: "Main Characters", role: "Protagonist Cast" }
            ],
            trivia: [
              "Streaming servers are automatically balance routed and fully cached around your closest node.",
              "Features multi-language audio support and subtitles toggle via our advanced player options."
            ],
            watchServers: anime.watchServers || [],
            recommendations: anime.recommendations || [],
            languages: anime.languages || []
          };
          
          setCartoonDetails(details);
          setActiveEpisode(details.episodes[0]);
          setLoadingDetails(false);
          return;
        }
      }

      const res = await fetch("/api/cartoon/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          title: item.title,
          type: item.type,
          image: item.image
        })
      });
      const resData = await res.json();
      if (resData.success && resData.data) {
        const details: CartoonDetails = {
          ...resData.data,
          watchServers: resData.data.watchServers || []
        };
        setCartoonDetails(details);

        // Determine starting episode
        if (details.episodes && details.episodes.length > 0) {
          if (customEpisodeNumber) {
            const match = details.episodes.find(ep => ep.number === customEpisodeNumber);
            setActiveEpisode(match || details.episodes[0]);
          } else {
            // Check if we have progress saved
            const prevProgress = watchHistory.find(h => h.cartoonId === item.id);
            if (prevProgress) {
              const match = details.episodes.find(ep => ep.number === prevProgress.episodeNumber);
              setActiveEpisode(match || details.episodes[0]);
            } else {
              setActiveEpisode(details.episodes[0]);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error retrieving cartoon catalog info:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Play next episode automatically
  const handleNextEpisode = () => {
    if (!cartoonDetails || !activeEpisode) return;
    const currentNum = activeEpisode.number;
    const nextMatch = cartoonDetails.episodes.find(ep => ep.number === currentNum + 1);
    if (nextMatch) {
      setActiveEpisode(nextMatch);
    }
  };

  // Update progress in local history
  const handleTimeUpdate = (currentTime: number, duration: number) => {
    if (!selectedCartoon || !activeEpisode || duration === 0) return;
    
    // Update watch history state
    const currentHistory = watchStateHistoryRef.current;
    const existingIndex = currentHistory.findIndex(
      h => h.cartoonId === selectedCartoon.id && h.episodeId === activeEpisode.id
    );

    const newItem: WatchHistoryItem = {
      cartoonId: selectedCartoon.id,
      cartoonTitle: selectedCartoon.title,
      cartoonImage: selectedCartoon.image,
      cartoonType: selectedCartoon.type,
      episodeId: activeEpisode.id,
      episodeNumber: activeEpisode.number,
      episodeTitle: activeEpisode.title,
      progress: Math.floor(currentTime),
      duration: Math.floor(duration),
      lastWatched: new Date().toISOString()
    };

    let updatedHistory: WatchHistoryItem[];
    if (existingIndex > -1) {
      updatedHistory = [...currentHistory];
      updatedHistory[existingIndex] = newItem;
    } else {
      updatedHistory = [newItem, ...currentHistory];
    }

    // Limit history length to 20
    if (updatedHistory.length > 20) {
      updatedHistory = updatedHistory.slice(0, 20);
    }

    setWatchHistory(updatedHistory);
    localStorage.setItem("cartoon_history", JSON.stringify(updatedHistory));
  };

  const updateProfile = (updatedFields: Partial<UserProfile>) => {
    setUserProfile(current => {
      const next = { ...current, ...updatedFields };
      localStorage.setItem("cartoon_user_profile", JSON.stringify(next));
      return next;
    });
  };

  // Helper to interleave movies and series for a beautifully mixed directory
  const getMixedMediaList = (movieList: CartoonItem[], seriesList: CartoonItem[]): CartoonItem[] => {
    const mixed: CartoonItem[] = [];
    const maxLength = Math.max(movieList.length, seriesList.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < movieList.length) {
        mixed.push(movieList[i]);
      }
      if (i < seriesList.length) {
        mixed.push(seriesList[i]);
      }
    }
    return mixed;
  };

  // Shuffle random selector
  const handleSurpriseMe = () => {
    const combined = getMixedMediaList(movies, series);
    if (combined.length === 0) return;
    const rand = combined[Math.floor(Math.random() * combined.length)];
    handleSelectCartoon(rand);
  };

  // Filter list matching searches and categories
  const getFilteredItems = () => {
    let list: CartoonItem[] = [];
    if (activeTab === "all") {
      list = getMixedMediaList(movies, series);
    } else if (activeTab === "movies") {
      list = movies;
    } else if (activeTab === "series") {
      list = series;
    } else if (activeTab === "watchlist") {
      list = getMixedMediaList(movies, series).filter(item => watchlist.includes(item.id));
    } else if (activeTab === "history") {
      // Find unique items from history state
      const uniqueIds = Array.from(new Set(watchHistory.map(h => h.cartoonId)));
      list = getMixedMediaList(movies, series).filter(item => uniqueIds.includes(item.id));
    }

    if (searchQuery.trim() !== "") {
      const match = searchQuery.toLowerCase();
      list = list.filter(item => item.title.toLowerCase().includes(match));
    }

    return list;
  };

  // Spotlight Header selection
  const spotlightCartoon = movies.length > 0 ? movies[0] : null;

  return (
    <div id="toonplay-app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">

      {/* Cinematic Web Onboarding & Loader Intro */}
      <AnimatePresence mode="wait">
        {loadingIntro && (
          <motion.div
            key="intro-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            id="intro-onboarding-wrapper"
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {introProgress < 100 ? (
              /* PROGRESS STAGE: Pulsing Logo and sleek Loader line (animetsu.cc style) */
              <motion.div
                key="progress-anim"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center"
              >
                {/* Lightweight, refined modern emblem with a pulse effect */}
                <div className="w-14 h-14 rounded-full border border-slate-800/80 bg-slate-950/45 p-3 text-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/5 animate-pulse mb-4">
                  <Play className="w-6 h-6 fill-indigo-400/20 stroke-[1.5px] ml-0.5" />
                </div>
                
                <h1 className="text-xl font-sans font-extrabold tracking-wide text-white">
                  Toon<span className="text-indigo-400 font-medium">Play</span>
                </h1>
                
                <span className="text-[9px] font-mono tracking-widest text-[#a5b4fc] block mt-1.5 uppercase font-bold">
                  INITIALIZING SECURE MOUNT NODE...
                </span>

                {/* Sleek loading bar container */}
                <div className="w-56 h-[3px] bg-slate-900 rounded-full overflow-hidden mt-8 relative">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-75"
                    style={{ width: `${introProgress}%` }}
                  ></div>
                </div>

                <span className="text-[10px] font-mono text-slate-500 mt-3 tabular-nums">
                  LOAD MODULE: {introProgress}%
                </span>
              </motion.div>
            ) : (
              /* ONBOARDING USER REGISTRY NAME STAGE */
              <motion.div
                key="onboarding-form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-sm bg-slate-900/60 border border-slate-850 p-8 rounded-2xl flex flex-col items-center shadow-2xl backdrop-blur-sm"
              >
                <div className="w-12 h-12 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-center text-indigo-400 mb-4 shadow-sm">
                  <Sparkles className="w-5 h-5 stroke-[2px]" />
                </div>

                <h2 className="text-sm font-extrabold font-sans tracking-tight text-white mb-1">Create watch profile</h2>
                <p className="text-xs text-slate-400 max-w-[260px] leading-relaxed">
                  Enter an adventure username or trigger a random option to proceed into the portal stream.
                </p>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleOnboardingSubmit();
                  }} 
                  className="w-full flex flex-col gap-4 mt-6"
                >
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={18}
                      placeholder="e.g. MasterOtaku"
                      value={onboardingName}
                      onChange={(e) => {
                        setOnboardingName(e.target.value);
                        setShowOnboardingSubmitError(false);
                      }}
                      className={`w-full bg-slate-950 text-slate-100 px-4 py-3 rounded-xl border focus:outline-none focus:border-indigo-500 text-xs transition-colors placeholder-slate-700 text-center font-semibold tracking-wide ${
                        showOnboardingSubmitError ? "border-red-500/80" : "border-slate-800"
                      }`}
                    />
                    
                    {showOnboardingSubmitError && (
                      <span className="text-[9px] font-mono font-semibold text-red-400 mt-1 block">
                        × NICKNAME CANNOT BE BLANK
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <button
                      type="button"
                      onClick={handleRandomizeOnboardingName}
                      className="py-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-lg text-[10px] font-mono font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      🎲 CHOOSE RANDOM
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-[10px] font-mono font-bold text-white transition-all cursor-pointer shadow-lg shadow-indigo-600/15"
                    >
                      ENTER PORTAL [✓]
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Dynamic Header */}
      <header id="toonplay-header" className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-lg border-b border-slate-900/85 h-16 px-4 md:px-6 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => { setSelectedCartoon(null); setCartoonDetails(null); setActiveFooterModal(null); }}>
          <div className="w-8 h-8 rounded-full border border-slate-800/80 bg-slate-950/40 p-1.5 text-indigo-400 flex items-center justify-center shadow-md">
            <Play className="w-3.5 h-3.5 fill-indigo-400/20 stroke-[1.5px] ml-0.5" />
          </div>
          <span className="font-sans font-black text-[17px] tracking-wide text-white">
            Toon<span className="text-indigo-400 font-medium">Play</span>
          </span>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-4">
          {/* User Widget */}
          <div 
            id="user-widget-profile"
            onClick={() => setShowProfileModal(true)}
            className="flex items-center gap-2.5 bg-slate-900 border border-slate-800/80 p-1.5 pr-3 rounded-full hover:border-indigo-500/30 transition-all cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden shadow-inner group-hover:scale-105 transition-transform">
              <img
                src={userProfile.avatarUrl || "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg"}
                alt="User Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg";
                }}
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-medium text-slate-200 block truncate max-w-[80px]">{userProfile.username}</span>
              <span className="text-[9px] font-mono font-bold text-indigo-400 -mt-0.5">LVL {userProfile.level}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 flex flex-col gap-6 md:gap-8">
        
        <AnimatePresence mode="wait">
          {activeFooterModal ? (
            /* GENERAL DETAILS FULL-PAGES (ABOUT, CONTACT, TERMS, PRIVACY) */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key={`page-${activeFooterModal}`}
              className="flex flex-col gap-8 text-left"
            >
              {/* Breadcrumbs / Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setActiveFooterModal(null);
                      setContactStep(1);
                      setTransmissionSubmitted(false);
                      setHasPurgeConfirmed(false);
                    }}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-500 transition-all cursor-pointer shadow-lg outline-none"
                    title="Return to library"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[#a5b4fc] bg-indigo-950/55 border border-indigo-900/40 px-2 py-0.5 rounded-full font-medium">
                        TOONPLAY PORTAL
                      </span>
                      <span className="text-slate-800 font-mono text-[10px]">//</span>
                      <span className="text-slate-400 font-mono text-[10px] uppercase">
                        {activeFooterModal === "about" && "Streaming & Indexing"}
                        {activeFooterModal === "contact" && "Get in touch"}
                        {activeFooterModal === "terms" && "Usage conditions"}
                        {activeFooterModal === "privacy" && "Cookie & Storage state"}
                      </span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-sans font-medium text-white tracking-tight mt-1 uppercase">
                      {activeFooterModal === "about" && "ABOUT TOONPLAY"}
                      {activeFooterModal === "contact" && "CONTACT US"}
                      {activeFooterModal === "terms" && "TERMS OF SERVICE"}
                      {activeFooterModal === "privacy" && "PRIVACY POLICY"}
                    </h1>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveFooterModal(null);
                    setContactStep(1);
                    setTransmissionSubmitted(false);
                    setHasPurgeConfirmed(false);
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-805 hover:border-indigo-500/40 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-indigo-400 transition-all cursor-pointer shadow-md select-none"
                >
                  [✕] BACK TO LIBRARY
                </button>
              </div>

              {/* Subpage dynamic full layout routing */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. ABOUT SUBVIEW */}
                {activeFooterModal === "about" && (
                  <>
                    <div className="lg:col-span-2 flex flex-col gap-6 font-sans">
                      <div className="bg-slate-905 border border-slate-850 rounded-2xl p-6 shadow-xl relative overflow-hidden group/about-card text-left">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                        <h2 className="text-base sm:text-lg font-medium text-white mb-3">Our Core Mission</h2>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                          Welcome to ToonPlay! We created this application to provide cartoon fans and animation enthusiasts with a clean, high-performance catalog of animated works. Our objective is simple: to make discovering, streaming, and preserving memories of classic and modern animated stories as straightforward as possible.
                        </p>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                          We gather verified web links into a unified library interface, giving you immediate access to view and download stream networks without annoying ad networks, premium cost walls, or tracking trackers.
                        </p>
                      </div>

                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left">
                        <h2 className="text-base sm:text-lg font-medium text-white mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-indigo-400" />
                          Streaming & Downloading Your Cartoons
                        </h2>
                        
                        <div className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">
                          With ToonPlay, you aren't restricted to watching online only. Our system is optimized to easily facilitate two primary ways to enjoy animation:
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex flex-col gap-1.5 hover:border-slate-850 transition-colors">
                            <span className="text-[10px] font-mono uppercase text-indigo-400 font-medium tracking-wider">Fast Live Streams</span>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                              Watch episodes or full movies directly within our lightweight HTML5 interactive player window with instant buffering and clean video scaling controls.
                            </p>
                          </div>
                          
                          <div className="p-4 rounded-xl bg-slate-950 border border-slate-900 flex flex-col gap-1.5 hover:border-slate-850 transition-colors">
                            <span className="text-[10px] font-mono uppercase text-indigo-400 font-medium tracking-wider">Direct Media Downloads</span>
                            <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                              Easily grab cartoon streams using our dedicated video action triggers to download actual media files for continuous playback on any offline device.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left">
                        <span className="text-[9px] font-mono uppercase text-indigo-400 font-medium tracking-wider block mb-1">USER EXPERIENCE STATE</span>
                        <h3 className="text-sm font-medium text-white mb-3">Local Growth & Watch History</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                          Your profile utilizes offline, client-side bookmark arrays inside local storage to log your viewing milestones, XP levels, and list favorites. There is zero external profiling, meaning your watching habits stay completely on your device.
                        </p>
                      </div>


                    </div>
                  </>
                )}

                {/* 2. CONTACT SUBVIEW */}
                {activeFooterModal === "contact" && (
                  <>
                    <div className="lg:col-span-2 flex flex-col gap-6 font-sans">
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left">
                        <h2 className="text-base sm:text-lg font-medium text-white mb-3">Get in Touch</h2>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                          We want to keep ToonPlay as perfect as possible for you. If you need to request a specific anime season, report a broken stream, suggest download stream mirrors, or have any other suggestions, the easiest way to reach us is by sending a direct email.
                        </p>

                        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-mono uppercase text-indigo-400 font-medium tracking-wider">Contact Email Address</span>
                            <span className="text-base font-bold text-white font-sans select-all">support@toonplay.in</span>
                          </div>
                          
                          <a 
                            href="mailto:support@toonplay.in"
                            className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/30"
                          >
                            Send Email Directly
                          </a>
                        </div>
                      </div>

                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left">
                        <h2 className="text-base sm:text-lg font-medium text-white mb-3">Frequently Asked Questions</h2>
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-xs sm:text-sm font-medium text-slate-200">How often are new cartoon streams indexed?</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              We check requests weekly and sync newly working stream directories. If a stream is broken, let us know via email and we'll fix it as soon as we can.
                            </p>
                          </div>
                          <div>
                            <h3 className="text-xs sm:text-sm font-medium text-slate-200">How do I download physical files?</h3>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              When you are playing any show, use the direct download stream action triggers located below the player to download the video path source.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left">
                        <span className="text-[9px] font-mono uppercase text-indigo-400 font-medium block mb-1">Direct Communication</span>
                        <p className="text-[11px] text-slate-400 leading-relaxed font-sans mt-1">
                          We do not sell data or share your messages with third parties. Every email you send goes directly to a human archivist.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* 3. TERMS OF SERVICE SUBVIEW */}
                {activeFooterModal === "terms" && (
                  <>
                    <div className="lg:col-span-2 flex flex-col gap-6 font-sans">
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left leading-relaxed flex flex-col gap-5 text-slate-300">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded-full uppercase">ARTICLE I</span>
                          <h3 className="text-base font-medium text-white mt-1.5 mb-2">General Stream Etiquette and Access Credentials</h3>
                          <p className="text-xs sm:text-sm">
                            By launching, viewing, or interacting with ToonPlay media streaming catalog nodes, users enter a community index. Access is permitted strictly for private, domestic, non-commercial entertainment and curation indexing only.
                          </p>
                          <p className="text-xs sm:text-sm mt-2 font-semibold text-slate-200">
                            Automated crawling scripts, database scraping tools, API bypass injections, or launching denial-of-service queries count as terms violations.
                          </p>
                        </div>

                        <div className="border-t border-slate-850 pt-4">
                          <span className="text-[9px] font-mono font-bold text-[#818cf8] bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded-full uppercase">ARTICLE II</span>
                          <h3 className="text-base font-medium text-white mt-1.5 mb-2">Decentralized Experience Systems & Level Calculations</h3>
                          <p className="text-xs text-slate-305 leading-relaxed">
                            Our system incorporates a gamified progress logic tracker to logs client watching minutes. Level attributes are configured as follows:
                          </p>
                          <ul className="list-disc list-inside mt-2 space-y-2 text-xs">
                            <li><strong className="text-slate-100 font-semibold">Base Calculation Rate:</strong> Users earn exactly <span className="font-mono text-indigo-450 font-bold text-xs bg-slate-950 px-1.5 py-0.5 border border-slate-900 rounded">10 XP per minute</span> of continuous playback progress logged on active stream nodes.</li>
                            <li><strong className="text-slate-100 font-semibold">Profile Isolation Policy:</strong> All statistics remain compiled strictly on your client node storage. Attempting to hijack, write fake payload loops, or manipulate local storage cache triggers local mismatch indicators in level meters.</li>
                            <li><strong className="text-slate-100 font-semibold">Value of Organic Retention:</strong> Preserving the chronological accuracy of your watched statistics protects your genuine platform journey database.</li>
                          </ul>
                        </div>

                        <div className="border-t border-slate-850 pt-4">
                          <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded-full uppercase">ARTICLE III</span>
                          <h3 className="text-base font-medium text-white mt-1.5 mb-2">Streaming Media Proxy Disclosures</h3>
                          <p className="text-xs sm:text-sm">
                            ToonPlay functions strictly as a human-curated directory indexing database of media links hosted across decentralized public servers on the web. We do not store, host, convert, or distribute copyrighted video assets on local web servers.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left bg-gradient-to-tr from-slate-900 to-indigo-950/10">
                        <span className="text-[9px] font-mono uppercase text-[#a5b4fc] font-bold block mb-1 font-mono">LAST MODIFICATION SEAL</span>
                        <div className="text-base font-medium text-white font-mono mb-2">May 30, 2026</div>
                        <p className="text-slate-400 text-xs leading-relaxed font-sans">
                          Terms are actively updated to incorporate security safeguards against high-volume script queries and server-mirror bypasses.
                        </p>
                      </div>

                      <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 text-slate-400 text-[10px] font-mono leading-relaxed text-left flex flex-col gap-3">
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-850 pb-2">TERMS AUDIT CREDENTIALS</div>
                        <div>🔧 ENFORCEMENT NODE: ACTIVE</div>
                        <div>📡 PROTOCOL AGENT: RECENT WEB REF-3</div>
                        <div>⚖️ APPLICABLE REGION: DECENTRALIZED STREAM CLOUD</div>
                      </div>
                    </div>
                  </>
                )}

                {/* 4. PRIVACY POLICY SUBVIEW WITH SECURE STORAGE PURGER */}
                {activeFooterModal === "privacy" && (
                  <>
                    <div className="lg:col-span-2 flex flex-col gap-6 font-sans">
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left leading-relaxed flex flex-col gap-5 text-slate-300">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded-full uppercase">SECTION A</span>
                          <h3 className="text-base font-medium text-white mt-1.5 mb-2">Direct Server Node Streaming Core</h3>
                          <p className="text-xs sm:text-sm">
                            ToonPlay ensures that all player instances communicate directly with media storage hubs. No middleman telemetry tracking interfaces, user capture platforms, or profiling databases intercept your visual appreciation data streams.
                          </p>
                        </div>

                        <div className="border-t border-slate-850 pt-4">
                          <span className="text-[9px] font-mono font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded-full uppercase">SECTION B</span>
                          <h3 className="text-base font-medium text-white mt-1.5 mb-2">Zero Telemetry Seal Verification</h3>
                          <p className="text-xs sm:text-sm">
                            Most contemporary visual portals sell or monetize analytical coordinates. We follow absolute telemetry isolation:
                          </p>
                          <ul className="list-disc list-inside mt-2 space-y-2 text-xs text-slate-355">
                            <li><strong className="text-slate-100 font-semibold">Zero Analytics Middleware:</strong> No Google Analytics, Hotjar matrices, or custom server telemetry ping streams are linked inside compile boundaries.</li>
                            <li><strong className="text-slate-100 font-semibold">Zero Cookie Tracking:</strong> No tracking cookies are stored to trace searching indexes or media filters.</li>
                          </ul>
                        </div>

                        <div className="border-t border-slate-850 pt-4">
                          <span className="text-[9px] font-mono font-bold text-[#818cf8] bg-indigo-950/40 border border-indigo-900/30 px-2.5 py-0.5 rounded-full uppercase">SECTION C</span>
                          <h3 className="text-base font-medium text-white mt-1.5 mb-2">Decentralized Browser Sandbox Storage</h3>
                          <p className="text-xs sm:text-sm">
                            Every watch history database entry, custom experience milestone, custom avatar selector, and library favorite bookmarks stay fully sandboxed on your device inside standard physical <strong className="text-indigo-305 font-bold">HTML5 Local Storage (`localStorage`)</strong> nodes.
                          </p>
                        </div>

                        {/* SECTION D: INTERACTIVE DATA PURGER */}
                        <div className="border-t border-slate-850 pt-5 flex flex-col gap-3">
                          <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/40 border border-red-900/30 px-2.5 py-0.5 rounded-full uppercase self-start">SECTION D</span>
                          <h3 className="text-base font-medium text-white tracking-tight mt-1 mb-1">Interactive Private Storage Decoupler</h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            ToonPlay believes in deep client governance. Triggering the purge command instantly deletes all local cookies, usernames, watchlist records, and accumulated watch milestones from physical memory chips.
                          </p>

                          {!hasPurgeConfirmed ? (
                            <button
                              onClick={() => setHasPurgeConfirmed(true)}
                              className="self-start mt-2 px-5 py-3 bg-red-950/40 hover:bg-red-950 border border-red-900 hover:border-red-500 rounded-xl text-xs font-mono font-bold text-red-400 hover:text-white transition-all cursor-pointer flex items-center gap-2 select-none"
                            >
                              ⚠️ DETACH USER REGISTRY & PURGE STORAGE RECORDS
                            </button>
                          ) : (
                            <div className="mt-2.5 p-4 bg-red-950/20 border border-red-900/40 rounded-xl flex flex-col gap-3 animate-pulse">
                              <span className="text-xs font-mono text-red-400 font-bold tracking-wide">⚠️ CRITICAL DATA ERASURE WARNING</span>
                              <p className="text-[11px] text-slate-350 leading-relaxed font-sans">
                                Confirming this protocol permanently purges your username profile, watch records history log, level targets, and bookmark states. This action is decentralized and absolutely irreversible.
                              </p>
                              <div className="flex gap-2.5 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => setHasPurgeConfirmed(false)}
                                  className="px-4 py-2 border border-slate-800 bg-slate-900 hover:bg-slate-800 text-[10px] font-mono font-bold text-slate-300 rounded-lg cursor-pointer"
                                >
                                  ❌ CANCEL SIGNAL
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    localStorage.removeItem("cartoon_user_profile");
                                    localStorage.removeItem("toonplay_onboarded");
                                    localStorage.removeItem("cartoon_history");
                                    localStorage.removeItem("cartoon_watchlist");
                                    window.location.reload();
                                  }}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-550 border border-red-500 text-[10px] font-mono font-bold text-white rounded-lg cursor-pointer"
                                >
                                  💥 CONFIRM ERASE [ALL REPLICA CORE RESTORES]
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-xl text-left bg-gradient-to-tr from-slate-900 to-emerald-950/10 border-l-4 border-l-emerald-600">
                        <span className="text-[9px] font-mono uppercase text-emerald-400 font-bold block mb-1">ENCRYPTED PRIVACY COMPLIANT</span>
                        <div className="text-base font-bold text-white font-mono mb-2">COOKIE FREE PORTAL</div>
                        <p className="text-slate-400 text-xs leading-relaxed font-sans">
                          Your profile utilizes zero advertiser cookie handlers, respecting local node safety criteria at all points.
                        </p>
                      </div>

                      <div className="bg-slate-950 border border-slate-900 rounded-xl p-5 text-slate-400 text-[10px] font-mono leading-relaxed text-left flex flex-col gap-3">
                        <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-850 pb-2">PRIVACY REGULATION DEEDS</div>
                        <div>🍃 TRACKERS BLOCKED: ALWAYS ACTIVE</div>
                        <div>🔒 SECURITY TUNNELS: TLS v1.3 SECURE ENCRYPTION</div>
                        <div>👤 PROFILING MIDDLEWARES: ABSOLENT REMOVED</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ) : cartoonDetails && selectedCartoon ? (
            
            /* Cinematic WATCH Arena (Theater view) */
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              key="theater"
              id="cinematic-watch-arena"
              className="flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <button
                  id="go-back-to-library-btn"
                  onClick={() => {
                    setSelectedCartoon(null);
                    setCartoonDetails(null);
                  }}
                  className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-500 transition-all"
                  title="Return to library catalog"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-1.5 py-0.5 rounded">
                      {cartoonDetails.type === "series" ? "SERIES INFUSION" : "CINEMATIC SPECIAL"}
                    </span>
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Release Year: {cartoonDetails.releaseYear}
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-sans font-bold text-white tracking-tight mt-1">{cartoonDetails.title}</h1>
                   {/* Player and Episodes/Recommendations bento grids */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Custom Cinema Player column */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                  {cartoonDetails.type === "movie" && cartoonDetails.watchServers && cartoonDetails.watchServers.length > 0 ? (
                    <div className="flex flex-col gap-4">
                      {/* Display Selected Server View */}
                      {activeServer === "server1" && (
                        <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-slate-900 shadow-2xl">
                          <iframe
                            id="cinema-server1-iframe"
                            src={cartoonDetails.watchServers[0].url}
                            className="w-full h-full"
                            allowFullScreen
                            scrolling="no"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {activeServer === "server3" && (
                        <div className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-slate-900 shadow-2xl">
                          <iframe
                            id="cinema-server3-iframe"
                            src={cartoonDetails.watchServers[1]?.url || cartoonDetails.watchServers[0].url}
                            className="w-full h-full"
                            allowFullScreen
                            scrolling="no"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      {activeServer === "server2" && (
                        <div className="flex flex-col gap-3">
                          {loadingExtraction ? (
                            <div className="w-full aspect-video bg-slate-950 border border-slate-900 rounded-3xl flex flex-col items-center justify-center text-slate-500">
                              <Loader2 className="w-10 h-10 text-pink-500 animate-spin mb-3" />
                              <span className="text-xs font-mono tracking-widest text-slate-400">CONNECTING TO STREAM EXTRACTOR...</span>
                            </div>
                          ) : extractionData && extractionData.files && Object.keys(extractionData.files).length > 0 ? (
                            <>
                              <VideoPlayer
                                key={`extracted-${selectedExtractedLang}-${cartoonDetails.id}`}
                                videoUrl={extractionData.files[selectedExtractedLang]}
                                title={`${cartoonDetails.title}`}
                                subtitle={`${cartoonDetails.title} — Premium ${selectedExtractedLang.toUpperCase()}`}
                                savedProgress={watchHistory.find(h => h.cartoonId === selectedCartoon.id && h.episodeId === `${cartoonDetails.id}-movie-main`)?.progress || 0}
                                onTimeUpdate={handleTimeUpdate}
                                hasNextEpisode={false}
                              />

                              {/* Language Tracks Selection */}
                              <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col gap-2.5 text-left">
                                <span className="text-[10px] font-mono tracking-wider font-bold text-indigo-400 uppercase">SELECT AUDIO LANGUAGE TRACK</span>
                                <div className="flex flex-wrap gap-2">
                                  {extractionData.available_categories.map((langCode: string) => {
                                    const m3u8Url = extractionData.files[langCode];
                                    if (!m3u8Url) return null;
                                    return (
                                      <button
                                        key={langCode}
                                        id={`lang-sel-${langCode}`}
                                        onClick={() => setSelectedExtractedLang(langCode)}
                                        className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold transition-all cursor-pointer ${
                                          selectedExtractedLang === langCode
                                            ? "bg-indigo-600 text-white shadow shadow-indigo-600/30"
                                            : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600"
                                        }`}
                                      >
                                        🗣️ {langCode.toUpperCase()} TRACK
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="w-full aspect-video bg-slate-950 border border-slate-900 rounded-3xl flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                              <BadgeAlert className="w-10 h-10 text-rose-500 mb-3" />
                              <span className="text-sm font-sans font-medium text-slate-200">Extractor stream is temporarily rate-limited</span>
                              <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">Please switch back to Server 1 or 3 for stable and continuous default movie watching streams.</p>
                              <button
                                onClick={() => setActiveServer("server1")}
                                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-mono font-bold text-white transition-all shadow"
                              >
                                SWITCH BACK TO SERVER 1
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Server Selection Bar (Under the video player) */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 bg-slate-950 border border-slate-900 rounded-2xl sm:flex-nowrap shadow">
                        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                          <button
                            id="select-server-1"
                            onClick={() => setActiveServer("server1")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold tracking-wider cursor-pointer whitespace-nowrap transition-all ${
                              activeServer === "server1"
                                ? "bg-indigo-600 text-white shadow shadow-indigo-600/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            }`}
                          >
                            📺 SERVER 1 (DIRECT)
                          </button>
                          <button
                            id="select-server-2"
                            onClick={() => setActiveServer("server2")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold tracking-wider cursor-pointer whitespace-nowrap transition-all ${
                              activeServer === "server2"
                                ? "bg-gradient-to-r from-indigo-500 to-pink-500 text-white shadow shadow-violet-600/20"
                                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                            }`}
                          >
                            ⚡ SERVER 2 (EXTRACTED)
                          </button>
                          {cartoonDetails.watchServers.length > 1 && (
                            <button
                              id="select-server-3"
                              onClick={() => setActiveServer("server3")}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold tracking-wider cursor-pointer whitespace-nowrap transition-all ${
                                activeServer === "server3"
                                  ? "bg-indigo-600 text-white shadow shadow-indigo-600/20"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                              }`}
                            >
                              🔮 SERVER 3 (MULTI)
                            </button>
                          )}
                        </div>
                        <span className="hidden md:inline-block text-[9px] text-slate-500 font-mono tracking-wide px-3 select-none">
                          HLS SPEED BALANCER ACTIVE
                        </span>
                      </div>

                      {/* Unified Post-Video Actions Bar */}
                      <div className="flex items-center gap-3">
                        <button
                          id="watchlist-action-btn-movie"
                          onClick={() => toggleWatchlist(selectedCartoon.id)}
                          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl border border-transparent font-sans font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            watchlist.includes(selectedCartoon.id)
                              ? "bg-slate-950 text-red-400 border-slate-900/50 hover:text-red-300"
                              : "bg-indigo-600 text-white hover:bg-indigo-550 shadow-md shadow-indigo-650/10"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${watchlist.includes(selectedCartoon.id) ? "fill-red-400 text-red-400 animate-pulse" : ""}`} />
                          {watchlist.includes(selectedCartoon.id) ? "REMOVE FROM WATCHLIST" : "ADD TO MY WATCHLIST"}
                        </button>
                        <button
                          id="share-active-btn-movie"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied successfully to clipboard!");
                          }}
                          className="px-4 py-3 bg-slate-950 border border-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
                          title="Share movie link"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">SHARE</span>
                        </button>
                      </div>
                    </div>
                  ) : activeEpisode ? (
                    <div className="flex flex-col gap-4">
                      <VideoPlayer
                        key={activeEpisode.id}
                        videoUrl={activeEpisode.videoUrl}
                        title={activeEpisode.title}
                        subtitle={`${cartoonDetails.title} — ${
                          cartoonDetails.type === "series" ? `Episode ${activeEpisode.number}` : "Main Movie"
                        }`}
                        savedProgress={watchHistory.find(h => h.cartoonId === selectedCartoon.id && h.episodeId === activeEpisode.id)?.progress || 0}
                        onTimeUpdate={handleTimeUpdate}
                        hasNextEpisode={
                          cartoonDetails.type === "series" &&
                          cartoonDetails.episodes.some(ep => ep.number === activeEpisode.number + 1)
                        }
                        onNextEpisode={handleNextEpisode}
                      />

                      {/* Unified Post-Video Actions Bar for Series */}
                      <div className="flex items-center gap-3">
                        <button
                          id="watchlist-action-btn-series"
                          onClick={() => toggleWatchlist(selectedCartoon.id)}
                          className={`flex-1 sm:flex-none px-6 py-3 rounded-xl border border-transparent font-sans font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                            watchlist.includes(selectedCartoon.id)
                              ? "bg-slate-950 text-red-400 border-slate-900/50 hover:text-red-300"
                              : "bg-indigo-600 text-white hover:bg-indigo-550 shadow-md shadow-indigo-650/10"
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${watchlist.includes(selectedCartoon.id) ? "fill-red-400 text-red-400 animate-pulse" : ""}`} />
                          {watchlist.includes(selectedCartoon.id) ? "REMOVE FROM WATCHLIST" : "ADD TO MY WATCHLIST"}
                        </button>
                        <button
                          id="share-active-btn-series"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            alert("Link copied successfully to clipboard!");
                          }}
                          className="px-4 py-3 bg-slate-950 border border-slate-900 text-slate-400 hover:text-white rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer"
                          title="Share series link"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="hidden sm:inline">SHARE</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-500">
                      No playable video streams loaded on this node.
                    </div>
                  )}

                  {/* Clean Human-Readable Cartoon Information Specs Card */}
                  <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 shadow-xl text-left">
                    <div className="w-24 h-36 md:w-28 md:h-40 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-800 shadow-md">
                      <img
                        src={cartoonDetails.image}
                        alt={cartoonDetails.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 flex flex-col justify-center gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[9px] font-mono font-bold tracking-widest text-indigo-400 bg-indigo-950/60 border border-indigo-900/60 px-2 py-0.5 rounded-lg">
                            {cartoonDetails.type.toUpperCase()}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {cartoonDetails.releaseYear || "2021"}
                          </span>
                          <span className="text-slate-600 text-xs">•</span>
                          <span className="text-xs font-mono text-slate-400">
                            {cartoonDetails.type === "movie" 
                              ? (cartoonDetails.durationOrEpisodes || "1h 23m") 
                              : `${cartoonDetails.episodes.length} Episodes`}
                          </span>
                        </div>
                        <h2 className="text-lg md:text-xl font-bold text-white tracking-tight leading-snug">{cartoonDetails.title}</h2>
                      </div>

                      {/* Genres indicators */}
                      {cartoonDetails.genre && cartoonDetails.genre.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cartoonDetails.genre.map((g) => (
                            <span key={g} className="text-[10px] font-mono text-slate-300 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-full">
                              {g}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Display Languages row for movies or where available */}
                      {cartoonDetails.languages && cartoonDetails.languages.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">Available Tracks:</span>
                          {cartoonDetails.languages.map((langCode) => (
                            <span key={langCode} className="text-[9px] font-mono font-bold text-emerald-400 bg-slate-950 border border-emerald-900/30 px-2.5 py-0.5 rounded-md">
                              🗣️ {langCode.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-sm text-slate-300 leading-relaxed font-sans mt-1">{cartoonDetails.description}</p>
                    </div>
                  </div>
                </div>

                {/* Sidebar Details Drawer column */}
                <div className="flex flex-col gap-4">
                  {cartoonDetails.type === "movie" ? (
                    /* Movies: Recommendations card layout */
                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col gap-3 min-h-[400px]">
                      <div className="border-b border-slate-800/80 pb-3">
                        <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest block font-bold">SIMILAR ADVENTURES</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Exploration options recommended next</span>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {cartoonDetails.recommendations && cartoonDetails.recommendations.length > 0 ? (
                          cartoonDetails.recommendations.map((rec) => (
                            <div
                              key={rec.id}
                              id={`rec-item-${rec.id}`}
                              onClick={() => {
                                // Map recommendation to CartoonItem
                                const recItem: CartoonItem = {
                                  id: rec.id.replace(/\//g, "-"),
                                  title: rec.title,
                                  image: rec.image,
                                  type: "movie"
                                };
                                handleSelectCartoon(recItem);
                              }}
                              className="flex items-center gap-3 p-2 bg-slate-900/40 border border-slate-900/50 hover:border-indigo-500/30 hover:bg-slate-900 rounded-xl cursor-pointer group transition-all"
                            >
                              <img
                                src={rec.image}
                                alt={rec.title}
                                className="w-11 h-14 object-cover rounded-lg group-hover:scale-[1.03] transition-transform"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0 text-left">
                                <span className="text-xs font-sans font-semibold text-slate-200 group-hover:text-indigo-400 transition-colors truncate block">
                                  {rec.title}
                                </span>
                                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1 block">MOVIE SAGA</span>
                              </div>
                              <Play className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-400 transition-colors mr-1.5 opacity-0 group-hover:opacity-100" />
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-1.5">
                            <span className="text-xs font-mono font-bold uppercase">SAGA LIST IS BLANK</span>
                            <span className="text-[10px] text-slate-600 max-w-xs text-center leading-normal">Our cosmic indexes are currently retrieving similar recommended titles.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Series: Standard Episodes roster side drawers list */
                    <div className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col gap-3 min-h-[400px]">
                      <div className="border-b border-slate-800/80 pb-3">
                        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest block font-bold">EPISODES ROSTER</span>
                        <span className="text-[10px] text-slate-500 mt-0.5 block">Select file to initialize watching stream</span>
                      </div>

                      <div className="flex flex-col gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {cartoonDetails.episodes.map((ep) => {
                          const isCurrent = activeEpisode?.id === ep.id;
                          
                          // Check seen status from history
                          const hasSeen = watchHistory.some(h => h.cartoonId === selectedCartoon.id && h.episodeId === ep.id && h.progress >= h.duration * 0.82);

                          return (
                            <div
                              key={ep.id}
                              id={`episode-card-${ep.number}`}
                              onClick={() => setActiveEpisode(ep)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                                isCurrent 
                                  ? "bg-indigo-950/20 border-indigo-500/70 shadow-md shadow-indigo-500/5 scale-[1.01]" 
                                  : "bg-slate-900/50 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-mono font-bold text-indigo-400 min-w-[20px]">
                                  {ep.number < 10 ? `E0${ep.number}` : `E${ep.number}`}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-xs font-sans block truncate ${isCurrent ? 'text-white font-semibold' : 'text-slate-300'}`}>
                                    {ep.title}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono tracking-wide">{ep.duration}</span>
                                </div>
                                {hasSeen && (
                                  <span className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Seen">
                                    <Check className="w-3 h-3 stroke-[3.5px]" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-2 mt-1.5 leading-relaxed font-sans">{ep.description}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>    </button>
                </div>
              </div>


            </motion.div>
          ) : (
            
            /* Catalog Hub Section */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              key="catalog"
              className="flex flex-col gap-8"
              id="catalog-library-hud"
            >
              
              {/* Cinematic sliding hero banner if available */}
              {heroItems.length > 0 && (
                <div 
                  id="spotlight-spot-hero"
                  className="relative h-[280px] md:h-[350px] w-full bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden group/hero shadow-2xl flex items-end justify-between animate-fade-in"
                >
                  {/* Backdrop with elegant fade transitions */}
                  {heroItems.map((hero, idx) => {
                    const isActive = idx === activeHeroIdx;
                    return (
                      <div
                        key={hero.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                          isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                        }`}
                      >
                        <img
                          src={hero.image}
                          alt={hero.title}
                          className="w-full h-full object-cover opacity-20 blur-[1px] group-hover/hero:scale-101 transition-transform duration-700"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Backdrop Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/20 to-transparent"></div>

                        {/* Spotlight info content */}
                        <div className="absolute bottom-0 left-0 p-6 md:p-8 flex flex-col items-start gap-2.5 max-w-lg md:max-w-2xl select-none text-left">
                          <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-400 bg-indigo-950/70 border border-indigo-800/40 px-2.5 py-0.5 rounded-full uppercase">
                            ⭐ SPOTLIGHT {hero.type === "movie" ? "MOVIE" : "SERIES"} [{idx + 1}/5]
                          </span>
                          <h2 className="text-xl md:text-3xl font-sans font-black tracking-tight text-white leading-tight">
                            {hero.title}
                          </h2>
                          <p className="text-xs md:text-sm text-slate-400 line-clamp-2 leading-relaxed font-sans hidden md:block">
                            Diving back into classic animation reels with HD remastering. Explore this curated, high-stakes animation quest. Follow along to unlock level experience and watch tracking.
                          </p>
                          <div className="flex gap-3 mt-2 pointer-events-auto">
                            <button
                              id={`hero-stream-btn-${hero.id}`}
                              onClick={() => handleSelectCartoon(hero)}
                              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] text-white font-bold text-xs tracking-wider font-mono rounded-full transition-all shadow-lg shadow-indigo-600/25 cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-white stroke-[3px]" /> WATCH NOW
                            </button>
                            <button
                              id={`hero-watchlist-btn-${hero.id}`}
                              onClick={() => toggleWatchlist(hero.id)}
                              className="flex items-center justify-center p-2.5 rounded-full border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-slate-500 transition-all cursor-pointer"
                              title="Add to watchlist"
                            >
                              <Heart className={`w-4 h-4 ${watchlist.includes(hero.id) ? "fill-red-500 text-red-500" : ""}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Left manual slide navigation arrow */}
                  <button
                    id="hero-slide-prev-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHeroIdx(prev => (prev - 1 + heroItems.length) % heroItems.length);
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700 text-white flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-opacity transition-all cursor-pointer shadow-lg"
                    title="Previous Slide"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Right manual slide navigation arrow */}
                  <button
                    id="hero-slide-next-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveHeroIdx(prev => (prev + 1) % heroItems.length);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-slate-800/40 hover:border-slate-700 text-white flex items-center justify-center opacity-0 group-hover/hero:opacity-100 transition-opacity transition-all cursor-pointer shadow-lg"
                    title="Next Slide"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Dots slide indicators at bottom-right */}
                  <div id="hero-dots-indicators" className="absolute bottom-5 right-6 z-20 flex gap-1.5 bg-slate-950/40 px-3 py-1.5 rounded-full border border-slate-800/30 backdrop-blur-sm">
                    {heroItems.map((_, idx) => (
                      <button
                        key={idx}
                        id={`hero-dot-${idx}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveHeroIdx(idx);
                        }}
                        className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === activeHeroIdx 
                            ? "bg-indigo-500 w-3.5 shadow-lg shadow-indigo-500/55" 
                            : "bg-slate-500 hover:bg-slate-300"
                        }`}
                        title={`Go to slide ${idx + 1}`}
                      ></button>
                    ))}
                  </div>

                </div>
              )}

              {/* Continue Watching Section (if history exists) */}
              {watchHistory.length > 0 && searchQuery === "" && (
                <div id="continue-watching-carousels" className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-base font-sans font-bold text-white tracking-tight">Continue Watching</h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {watchHistory.slice(0, 4).map((hist) => {
                      const percentage = Math.min((hist.progress / hist.duration) * 100, 100);
                      const originalItem: CartoonItem = {
                        id: hist.cartoonId,
                        title: hist.cartoonTitle,
                        image: hist.cartoonImage,
                        type: hist.cartoonType
                      };

                      return (
                        <div
                          key={`${hist.cartoonId}-${hist.episodeId}`}
                          id={`history-row-${hist.cartoonId}`}
                          onClick={() => handleSelectCartoon(originalItem, hist.episodeNumber)}
                          className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden cursor-pointer group hover:border-slate-600 hover:scale-[1.01] transition-all flex flex-col relative"
                        >
                          {/* Close/Remove progress card overlay */}
                          <button
                            id={`remove-continue-watching-btn-${hist.cartoonId}-${hist.episodeId}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = watchHistory.filter(h => !(h.cartoonId === hist.cartoonId && h.episodeId === hist.episodeId));
                              setWatchHistory(next);
                              localStorage.setItem("cartoon_history", JSON.stringify(next));
                            }}
                            className="absolute top-2 right-2 z-20 w-6 h-6 rounded-lg bg-slate-950/85 hover:bg-red-950 text-red-400 border border-slate-850 hover:border-red-500/50 flex items-center justify-center transition-colors cursor-pointer shadow shadow-black/80 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                            title="Remove cartoon progress log"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>

                          {/* Small card backdrop */}
                          <div className="relative aspect-video bg-slate-950 overflow-hidden">
                            <img
                              src={hist.cartoonImage}
                              alt={hist.cartoonTitle}
                              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
                            {/* Play overlay symbol */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-400">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </div>
                            </div>
                            
                            {/* Tiny progressive bar */}
                            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-800">
                              <div 
                                className="h-full bg-indigo-400" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>

                          <div className="p-2.5 sm:p-3 text-left">
                            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">{hist.cartoonType}</span>
                            <span className="text-xs font-sans font-bold text-white mt-0.5 block truncate max-w-[170px]">{hist.cartoonTitle}</span>
                            <span className="text-[10px] text-slate-400 mt-1 block truncate">
                              {hist.cartoonType === "series" ? `E0${hist.episodeNumber}: ${hist.episodeTitle}` : "Stream Core"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Filtering + Search control HUD */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute top-3 left-3.5 w-4 h-4 text-slate-500" />
                  <input
                    id="library-search-input"
                    type="text"
                    placeholder="Search cartoon titles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 text-slate-100 pl-10 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-xs transition-colors placeholder-slate-600"
                  />
                </div>

                {/* Segment Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 border border-slate-800/90 p-1 rounded-xl self-start">
                  <button
                    id="tab-all-btn"
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer select-none ${
                      activeTab === "all" ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    ALL LIBRARY
                  </button>
                  <button
                    id="tab-movies-btn"
                    onClick={() => setActiveTab("movies")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer select-none ${
                      activeTab === "movies" ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Film className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> MOVIES
                  </button>
                  <button
                    id="tab-series-btn"
                    onClick={() => setActiveTab("series")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer select-none ${
                      activeTab === "series" ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Tv className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> SERIES
                  </button>
                  <button
                    id="tab-watchlist-btn"
                    onClick={() => setActiveTab("watchlist")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer relative select-none ${
                      activeTab === "watchlist" ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> MY WATCHLIST
                    {watchlist.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border border-slate-950 text-[9px] font-mono text-white flex items-center justify-center font-bold">
                        {watchlist.length}
                      </span>
                    )}
                  </button>
                  <button
                    id="tab-history-btn"
                    onClick={() => setActiveTab("history")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider transition-all cursor-pointer select-none ${
                      activeTab === "history" ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <History className="w-3.5 h-3.5 inline mr-1 -mt-0.5" /> HISTORIES
                  </button>
                </div>
              </div>

              {/* Dynamic Media Grid list */}
              {loadingMedia ? (
                <div id="media-grid-loading" className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-slate-800 border-t-indigo-400 rounded-full animate-spin"></div>
                  <span className="mt-4 text-xs font-mono text-slate-500 uppercase tracking-widest animate-pulse">LOADING TOONPLAY DIRECTORIES...</span>
                </div>
              ) : (
                (() => {
                  const filteredList = getFilteredItems();
                  const totalItemsCount = filteredList.length;
                  const totalPagesCount = Math.ceil(totalItemsCount / itemsPerPage);
                  const paginatedItems = filteredList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                  const getPageNumbers = () => {
                    const pages: (number | string)[] = [];
                    const maxNeighbours = 1;
                    if (totalPagesCount <= 5) {
                      for (let i = 1; i <= totalPagesCount; i++) {
                        pages.push(i);
                      }
                    } else {
                      pages.push(1);
                      let startPage = Math.max(2, currentPage - maxNeighbours);
                      let endPage = Math.min(totalPagesCount - 1, currentPage + maxNeighbours);
                      if (currentPage <= 3) {
                        endPage = 4;
                      } else if (currentPage >= totalPagesCount - 2) {
                        startPage = totalPagesCount - 3;
                      }
                      if (startPage > 2) {
                        pages.push("...");
                      }
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(i);
                      }
                      if (endPage < totalPagesCount - 1) {
                        pages.push("...");
                      }
                      pages.push(totalPagesCount);
                    }
                    return pages;
                  };

                  if (totalItemsCount === 0) {
                    return (
                      <div id="media-grid-empty" className="text-center py-20 bg-slate-900/10 rounded-2xl border border-dashed border-slate-800">
                        <BadgeAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-400 font-sans text-sm font-medium">No cartoons or movies found matching this query index.</p>
                        <p className="text-slate-600 font-mono text-xs mt-1">Shuffle or toggle different categories on the menu tabs.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-col gap-6">
                      <div id="media-grid-catalog" className="responsive-grid-columns">
                        {paginatedItems.map((item) => (
                          <motion.div
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            key={item.id}
                            id={`cartoon-card-${item.id}`}
                            onClick={() => handleSelectCartoon(item)}
                            className="group/card bg-slate-950/40 border border-slate-900/80 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:border-indigo-500/40 hover:bg-slate-900/30 hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between relative"
                          >
                            {/* Video clip cover overlay */}
                            <div className="aspect-[2/3] relative bg-slate-950 overflow-hidden">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover/card:scale-[1.02] transition-all duration-350 ease-out"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover/card:opacity-30 transition-opacity"></div>
                              
                              {/* Play and Quick actions */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:scale-115 active:scale-95 transition-transform shadow-lg shadow-indigo-600/25">
                                  <Play className="w-5 h-5 fill-white ml-0.5" />
                                </div>
                              </div>

                              {/* Top corner category tags */}
                              <div className="absolute top-2 left-2 flex flex-col gap-1.5 pointer-events-none">
                                <span className={`text-[8px] font-mono font-black border uppercase tracking-wider px-1.5 py-0.5 rounded shadow ${
                                  item.type === "movie" 
                                    ? "bg-slate-950/90 text-indigo-450 border-indigo-900/30" 
                                    : "bg-slate-950/90 text-pink-450 border-pink-900/30"
                                }`}>
                                  {item.type}
                                </span>
                              </div>

                              {/* Delete option for watchlist tab */}
                              {activeTab === "watchlist" && (
                                <button
                                  id={`delete-watchlist-item-${item.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleWatchlist(item.id);
                                  }}
                                  className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-slate-950/85 hover:bg-red-950 text-red-400 border border-slate-800 hover:border-red-500/50 flex items-center justify-center transition-colors cursor-pointer shadow-md"
                                  title="Remove from Watchlist"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete option for history tab */}
                              {activeTab === "history" && (
                                <button
                                  id={`delete-history-item-${item.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteHistoryByCartoonId(item.id);
                                  }}
                                  className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-slate-950/85 hover:bg-red-950 text-red-400 border border-slate-800 hover:border-red-500/50 flex items-center justify-center transition-colors cursor-pointer shadow-md"
                                  title="Remove from History"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Info details box */}
                            <div className="p-3.5 text-left flex flex-col gap-0.5">
                              <h4 className="text-[13px] font-sans font-semibold text-slate-250 group-hover/card:text-indigo-400 transition-colors line-clamp-1 leading-snug">
                                {item.title}
                              </h4>
                              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block font-medium">
                                {item.type}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Pagination UI strip */}
                      {totalPagesCount > 1 && (
                        <div id="grid-pagination-controls" className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2.5 mt-8 py-5 border-t border-slate-900 font-mono px-2">
                          <button
                            id="pagination-prev-btn"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
                          >
                            PREV
                          </button>

                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                            {getPageNumbers().map((pg, idx) => {
                              if (pg === "...") {
                                return (
                                  <span key={`dots-${idx}`} className="px-1.5 text-slate-500 font-bold text-xs">
                                    ...
                                  </span>
                                );
                              }
                              return (
                                <button
                                  key={pg}
                                  id={`pagination-page-${pg}`}
                                  onClick={() => setCurrentPage(pg as number)}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                                    pg === currentPage
                                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                                      : "text-slate-400 hover:text-white bg-slate-900/40 hover:bg-slate-800 border border-slate-900"
                                  }`}
                                >
                                  {pg}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            id="pagination-next-btn"
                            disabled={currentPage === totalPagesCount}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPagesCount))}
                            className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer select-none"
                          >
                            NEXT
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* User Profile customization Drawer Panel */}
      <AnimatePresence>
        {showProfileModal && (
          <UserProfileModal
            profile={userProfile}
            onUpdate={updateProfile}
            onClose={() => setShowProfileModal(false)}
            favoritesCount={watchlist.length}
            historyCount={Array.from(new Set(watchHistory.map(h => h.cartoonId))).length}
            avatars={availableAvatars}
          />
        )}
      </AnimatePresence>

      {/* Modern Fully Branded Footer */}
      <footer id="toonplay-footer" className="mt-24 border-t border-slate-900/90 bg-slate-950 px-4 md:px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-slate-800 bg-slate-950 flex items-center justify-center text-indigo-400">
                <Play className="w-2.5 h-2.5 fill-indigo-400/20 stroke-[1.5px] ml-0.5" />
              </div>
              <span className="font-sans font-black tracking-wide text-white text-[16px]">
                Toon<span className="text-indigo-400 font-medium">Play</span>
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-500 uppercase mt-1 tracking-wider">
              YOUR FAVORITE TOON ADVENTURE PORTAL
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-[11px] font-mono text-slate-400">
            <span onClick={() => setActiveFooterModal("about")} className="hover:text-white transition-colors cursor-pointer select-none">ABOUT</span>
            <span className="text-slate-800">|</span>
            <span onClick={() => setActiveFooterModal("contact")} className="hover:text-white transition-colors cursor-pointer select-none">CONTACT</span>
            <span className="text-slate-800">|</span>
            <span onClick={() => setActiveFooterModal("terms")} className="hover:text-white transition-colors cursor-pointer select-none">TERMS OF SERVICE</span>
            <span className="text-slate-800">|</span>
            <span onClick={() => setActiveFooterModal("privacy")} className="hover:text-white transition-colors cursor-pointer select-none">PRIVACY POLICY</span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[9px] font-mono text-slate-600">
          <span>© {new Date().getFullYear()} TOONPLAY NETWORKS. ALL RIGHTS RESERVED.</span>
          <span>FAST STREAMS HOSTED SECURELY ON TOONPLAY.IN</span>
        </div>
      </footer>

    </div>
  );
}
