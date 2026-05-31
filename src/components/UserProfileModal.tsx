import { useState } from "react";
import { UserProfile } from "../types";
import { X, Award, Flame, Tv, Clock, Check } from "lucide-react";
import { motion } from "motion/react";

interface UserProfileModalProps {
  profile: UserProfile;
  onUpdate: (updated: Partial<UserProfile>) => void;
  onClose: () => void;
  favoritesCount: number;
  historyCount: number;
  avatars: { src: string; alt: string }[];
}

export default function UserProfileModal({
  profile,
  onUpdate,
  onClose,
  favoritesCount,
  historyCount,
  avatars
}: UserProfileModalProps) {
  const [username, setUsername] = useState(profile.username);
  const [selectedAvatar, setSelectedAvatar] = useState(profile.avatarUrl);
  const [isSaved, setIsSaved] = useState(false);

  // Level progression calculate
  const xpNeeded = profile.level * 100;
  const xpPercentage = Math.min((profile.xp / xpNeeded) * 100, 100);

  const handleSave = () => {
    if (!username.trim()) return;
    onUpdate({
      username: username.trim(),
      avatarUrl: selectedAvatar
    });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 1800);
  };

  return (
    <div id="profile-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        id="profile-panel-container"
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-pink-500 to-indigo-900 relative flex items-end p-6">
          <button
            id="close-profile-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-950/30 backdrop-blur-md text-white hover:bg-slate-950/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Avatar floating wrapper */}
          <div className="absolute -bottom-8 left-6 flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border-4 border-slate-900 shadow-xl overflow-hidden bg-slate-800">
              <img
                src={selectedAvatar || "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg"}
                alt="Selected Profile Avatar"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg";
                }}
              />
            </div>
            <div className="mb-2">
              <span className="text-[10px] font-mono tracking-widest text-indigo-200 uppercase font-bold bg-indigo-900/40 border border-indigo-500/25 px-2 py-0.5 rounded-full">
                LEVEL: {profile.level}
              </span>
            </div>
          </div>
        </div>

        {/* Edit fields details row */}
        <div className="pt-12 px-6 pb-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          <div>
            <label className="block text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-2">Anime Nickname</label>
            <div className="flex gap-2">
              <input
                id="profile-username-input"
                type="text"
                placeholder="Enter nickname..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                className="flex-1 bg-slate-950 text-white px-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 text-sm transition-colors font-sans"
              />
              <button
                id="save-profile-btn"
                onClick={handleSave}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold font-mono tracking-wider text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSaved ? <Check className="w-4 h-4 stroke-[3px]" /> : "SAVE"}
              </button>
            </div>
          </div>

          {/* XP & Level up progress bar */}
          <div className="bg-slate-950 p-4 border border-slate-800/65 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> XP PROGRESS
              </span>
              <span className="text-xs font-mono text-slate-300">
                {profile.xp} / {xpNeeded} <span className="text-slate-500">XP</span>
              </span>
            </div>
            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800/80 p-[2px]">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-pink-400 to-indigo-700 transition-all duration-500"
                style={{ width: `${xpPercentage}%` }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-sans">
              🌟 You earn <span className="text-indigo-400">10 XP</span> for every minute you stream! Watch more cartoons to level up your avatar rank.
            </p>
          </div>

          {/* Avatar selections */}
          <div>
            <label className="block text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-3">Choose Your Spirit Character</label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-[180px] overflow-y-auto p-1.5 bg-slate-950/40 rounded-xl border border-slate-800/50">
              {avatars.map((avatar, index) => {
                const isSelected = selectedAvatar === avatar.src;
                return (
                  <button
                    key={avatar.src}
                    id={`avatar-btn-${index}`}
                    onClick={() => setSelectedAvatar(avatar.src)}
                    className={`p-1 rounded-xl border aspect-square flex items-center justify-center transition-all outline-none overflow-hidden relative cursor-pointer ${
                      isSelected 
                        ? "bg-indigo-900/40 border-indigo-500 scale-105 shadow-md shadow-indigo-500/20" 
                        : "bg-slate-950 border-slate-900 hover:bg-slate-800/40 hover:border-slate-700"
                    }`}
                    title={avatar.alt}
                  >
                    <img
                      src={avatar.src}
                      alt={avatar.alt}
                      className="w-full h-full object-cover rounded-lg"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = "https://animerulz.watch/profile-icons/avatars/avatar1.jpeg";
                      }}
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-indigo-600/10 border-2 border-indigo-500 rounded-lg pointer-events-none" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Statistics widgets */}
          <div>
            <label className="block text-[11px] font-mono tracking-wider text-slate-400 uppercase mb-3">Quest Statistics</label>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70 text-center">
                <Clock className="w-5 h-5 text-indigo-400 mx-auto mb-1.5" />
                <span className="block text-lg font-mono font-bold text-white">{profile.minutesWatched}</span>
                <span className="text-[9px] text-slate-400 tracking-wider">MINS WATCHED</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70 text-center">
                <Tv className="w-5 h-5 text-pink-400 mx-auto mb-1.5" />
                <span className="block text-lg font-mono font-bold text-white">{historyCount}</span>
                <span className="text-[9px] text-slate-400 tracking-wider">MODULES SEEN</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/70 text-center">
                <Flame className="w-5 h-5 text-red-400 mx-auto mb-1.5" />
                <span className="block text-lg font-mono font-bold text-white">{favoritesCount}</span>
                <span className="text-[9px] text-slate-400 tracking-wider">FAVORITES</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
