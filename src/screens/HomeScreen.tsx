import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Map, Trophy, Medal, History, CarFront, Zap, Minus, Plus, ShieldAlert, MessageSquare, Settings, Users, AlertTriangle, Info, AlertOctagon } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { db } from '../db/database';
import { AchievementEngine } from '../services/AchievementEngine';
import { GameService } from '../services/GameService';
import { ScoreCard } from '../components/ScoreCard';
import { Button } from '../components/Button';
import clsx from 'clsx';

type ActiveOption = 'none' | 'free' | 'quick';

export function HomeScreen() {
  const navigate = useNavigate();
  const { currentUser, logout, setCurrentUser } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const [activeOption, setActiveOption] = useState<ActiveOption>('none');
  const [freeCrossings, setFreeCrossings] = useState(1);
  const [announcement, setAnnouncement] = useState<{message: string, type: 'info'|'warning'|'alert'} | null>(null);
  const [globalMultiplier, setGlobalMultiplier] = useState(1);

  useEffect(() => {
    const loadSettings = async () => {
      const msg = await db.settings.get('announcement');
      const type = await db.settings.get('announcementType');
      const mult = await db.settings.get('globalMultiplier');

      if (msg && msg.value) {
        setAnnouncement({ 
          message: msg.value, 
          type: (type?.value as any) || 'info' 
        });
      }
      if (mult && mult.value) {
        setGlobalMultiplier(Number(mult.value));
      }
    };
    loadSettings();
  }, []);

  if (!currentUser) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFC107', '#FFD54F', '#FFA000']
    });
  };

  const handleQuickAdd = async (success: boolean) => {
    if (!currentUser.id) return;
    
    try {
      const points = success ? (1 * globalMultiplier) : 0;
      const updatedUser = await GameService.submitScore(points, 0, 1);
      
      if (success) {
        triggerConfetti();
        addToast({ title: `+${points} point(s)! 🎉`, type: 'success' });
      } else {
        addToast({ title: 'Points remis à zéro! 💥', type: 'error' });
      }

      setCurrentUser(updatedUser);
      await AchievementEngine.check(updatedUser);
      setActiveOption('none');
    } catch (error: any) {
      addToast({ title: 'Erreur', message: error.message, type: 'error' });
    }
  };

  const handleFreeTrip = async (success: boolean) => {
    if (!currentUser.id || freeCrossings <= 0) return;
    
    try {
      const points = success ? (freeCrossings * globalMultiplier) : 0;
      const updatedUser = await GameService.submitScore(points, 0, freeCrossings);

      if (success) {
        triggerConfetti();
        addToast({ title: `Trajet libre: +${points} points 🎉`, type: 'success' });
      } else {
        addToast({ title: 'Points remis à zéro! 💥', type: 'error' });
      }

      setCurrentUser(updatedUser);
      await AchievementEngine.check(updatedUser);
      setActiveOption('none');
      setFreeCrossings(1);
    } catch (error: any) {
      addToast({ title: 'Erreur', message: error.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto relative pb-24">
      {/* Announcement Banner */}
      {announcement && (
        <div className={clsx(
          "mb-4 p-4 rounded-2xl border flex items-start gap-3",
          announcement.type === 'info' ? "bg-blue-500/10 border-blue-500/20 text-blue-200" :
          announcement.type === 'warning' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-200" :
          "bg-red-500/10 border-red-500/20 text-red-200"
        )}>
          {announcement.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
          {announcement.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
          {announcement.type === 'alert' && <AlertOctagon className="w-5 h-5 shrink-0" />}
          <div className="text-sm font-medium leading-relaxed">
            {announcement.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between mb-8 mt-4">
        <div>
          <p className="text-white/50 text-sm font-bold uppercase tracking-wider">Salut,</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display text-white">{currentUser.displayName}</h1>
            {currentUser.isAdmin && (
              <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Admin</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.isAdmin && (
            <button 
              onClick={() => navigate('/admin')}
              className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors"
              title="Administration"
            >
              <ShieldAlert className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={() => navigate('/friends')}
            className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Amis"
          >
            <Users className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate('/feedback')}
            className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Aide & Retours"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button 
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Paramètres"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Score */}
      <ScoreCard points={currentUser.points} className="mb-8" />

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-2xl font-display text-white">{currentUser.totalEarned}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold mt-1 text-center">Total Gagné</span>
        </div>
        <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-2xl font-display text-white">{currentUser.tripCount}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold mt-1 text-center">Trajets</span>
        </div>
        <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center">
          <span className="text-2xl font-display text-white">{currentUser.streak}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold mt-1 text-center">Série 🔥</span>
        </div>
      </div>

      {/* 3 Distinct Options */}
      <div className="flex flex-col gap-3 mb-8">
        
        {/* Option 1: Planned Trip */}
        <button 
          onClick={() => navigate('/planner')} 
          className="bg-surface border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Map className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Trajet Planifié</h3>
            <p className="text-xs text-white/50 mt-0.5">Calcul d'itinéraire automatique</p>
          </div>
        </button>

        {/* Option 2: Free Trip */}
        <div className={clsx(
          "bg-surface border rounded-2xl overflow-hidden transition-colors",
          activeOption === 'free' ? "border-blue-500/50 bg-blue-500/5" : "border-white/10"
        )}>
          <button 
            onClick={() => setActiveOption(a => a === 'free' ? 'none' : 'free')} 
            className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <CarFront className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Trajet Libre</h3>
              <p className="text-xs text-white/50 mt-0.5">Saisis tes passages après coup</p>
            </div>
          </button>
          
          <AnimatePresence>
            {activeOption === 'free' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="p-4 pt-0 border-t border-white/5 mt-2">
                  <div className="flex items-center justify-between bg-black/20 rounded-xl p-3 mb-4">
                    <span className="text-sm text-white/70">Nombre de passages :</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setFreeCrossings(Math.max(1, freeCrossings - 1))}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 shrink-0"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      
                      <input 
                        type="number" 
                        min="1"
                        max="999"
                        value={freeCrossings || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            setFreeCrossings(val);
                          } else if (e.target.value === '') {
                            setFreeCrossings(0); // Temporary state for empty input
                          }
                        }}
                        onBlur={() => {
                          if (freeCrossings < 1) setFreeCrossings(1);
                        }}
                        className="w-16 bg-transparent text-center font-display text-xl text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 rounded-md"
                      />

                      <button 
                        onClick={() => setFreeCrossings(freeCrossings + 1)}
                        className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <p className="text-center text-sm mb-4">As-tu levé les jambes à <strong>tous</strong> les passages ?</p>
                  <div className="flex gap-3 mb-3">
                    <Button variant="danger" fullWidth onClick={() => handleFreeTrip(false)}>😬 Non</Button>
                    <Button className="bg-success/20 text-success border border-success/30 hover:bg-success/30 shadow-none" fullWidth onClick={() => handleFreeTrip(true)}>🦵 Oui!</Button>
                  </div>
                  <button 
                    onClick={() => setActiveOption('none')}
                    className="w-full text-center text-xs text-white/40 hover:text-white/70 py-2 uppercase tracking-wider font-bold"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Option 3: Quick Add */}
        <div className={clsx(
          "bg-surface border rounded-2xl overflow-hidden transition-colors",
          activeOption === 'quick' ? "border-purple-500/50 bg-purple-500/5" : "border-white/10"
        )}>
          <button 
            onClick={() => setActiveOption(a => a === 'quick' ? 'none' : 'quick')} 
            className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Passage Rapide</h3>
              <p className="text-xs text-white/50 mt-0.5">Ajout manuel instantané (+1)</p>
            </div>
          </button>

          <AnimatePresence>
            {activeOption === 'quick' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="p-4 pt-0 border-t border-white/5 mt-2">
                  <p className="text-center text-sm mb-4 mt-2">Viens-tu de lever les jambes ?</p>
                  <div className="flex gap-3 mb-3">
                    <Button variant="danger" fullWidth onClick={() => handleQuickAdd(false)}>😬 Non</Button>
                    <Button className="bg-success/20 text-success border border-success/30 hover:bg-success/30 shadow-none" fullWidth onClick={() => handleQuickAdd(true)}>🦵 Oui!</Button>
                  </div>
                  <button 
                    onClick={() => setActiveOption('none')}
                    className="w-full text-center text-xs text-white/40 hover:text-white/70 py-2 uppercase tracking-wider font-bold"
                  >
                    Annuler
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Navigation Buttons */}
      <div className="grid grid-cols-3 gap-3 mt-auto">
        <button 
          onClick={() => navigate('/leaderboard')}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-white/5 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Trophy className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Classement</span>
        </button>
        <button 
          onClick={() => navigate('/achievements')}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-white/5 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Medal className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Succès</span>
        </button>
        <button 
          onClick={() => navigate('/history')}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-surface border border-white/5 text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <History className="w-6 h-6" />
          <span className="text-xs font-bold uppercase tracking-wider">Historique</span>
        </button>
      </div>
    </div>
  );
}
