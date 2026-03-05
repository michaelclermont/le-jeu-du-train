import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Medal, CheckCircle2, X, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../db/database';
import { useAuthStore } from '../store/useAuthStore';
import { ACHIEVEMENTS } from '../services/AchievementEngine';
import clsx from 'clsx';

export function AchievementsScreen() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [selectedAchievement, setSelectedAchievement] = useState<typeof ACHIEVEMENTS[0] | null>(null);

  useEffect(() => {
    const loadAchievements = async () => {
      if (!currentUser?.id) return;
      const unlocked = await db.achievements.where('userId').equals(currentUser.id).toArray();
      setUnlockedIds(new Set(unlocked.map(a => a.achievementId)));
    };
    loadAchievements();
  }, [currentUser?.id]);

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto relative">
      <header className="flex items-center gap-4 mb-8 mt-4">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Medal className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display text-white">Succès</h1>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 pb-8">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = unlockedIds.has(ach.id);
          // Split by space, assuming the last part is the emoji/icon
          const parts = ach.title.split(' ');
          const icon = parts.length > 1 ? parts[parts.length - 1] : '🏆';
          const title = parts.length > 1 ? parts.slice(0, -1).join(' ') : ach.title;

          return (
            <button 
              key={ach.id}
              onClick={() => setSelectedAchievement(ach)}
              className={clsx(
                "flex flex-col items-center justify-center p-6 rounded-3xl border transition-all text-center relative overflow-hidden h-40",
                isUnlocked 
                  ? "bg-primary/10 border-primary/30 shadow-[0_0_20px_rgba(255,193,7,0.15)] opacity-100 hover:bg-primary/20" 
                  : "bg-surface border-white/5 opacity-60 grayscale hover:opacity-80 hover:grayscale-0"
              )}
            >
              {isUnlocked ? (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
              ) : (
                <div className="absolute top-3 right-3">
                  <Lock className="w-4 h-4 text-white/30" />
                </div>
              )}
              
              <span className="text-4xl mb-3 drop-shadow-md">{icon}</span>
              <span className={clsx("font-bold text-sm leading-tight", isUnlocked ? "text-primary" : "text-white")}>
                {title}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedAchievement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAchievement(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-surface border border-white/10 rounded-3xl p-8 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setSelectedAchievement(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className={clsx(
                  "w-20 h-20 rounded-full flex items-center justify-center mb-6 text-5xl shadow-[0_0_30px_rgba(0,0,0,0.3)]",
                  unlockedIds.has(selectedAchievement.id) ? "bg-primary/20" : "bg-white/5 grayscale"
                )}>
                  {selectedAchievement.title.split(' ').pop() || '🏆'}
                </div>

                <h2 className="font-display text-2xl text-white mb-2">
                  {selectedAchievement.title.split(' ').slice(0, -1).join(' ')}
                </h2>

                <div className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6",
                  unlockedIds.has(selectedAchievement.id) 
                    ? "bg-primary/20 text-primary" 
                    : "bg-white/10 text-white/50"
                )}>
                  {unlockedIds.has(selectedAchievement.id) ? "Déverrouillé" : "Verrouillé"}
                </div>

                <p className="text-white/70 leading-relaxed">
                  {(selectedAchievement as any).description || "Pas de description disponible."}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
