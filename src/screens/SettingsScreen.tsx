import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Shield, Home, Trash2, Save, Loader2, Eye, EyeOff, Map, History, BarChart3, UserPlus } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { db } from '../db/database';
import { Button } from '../components/Button';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';
import type { GeocodeResult } from '../types/models';

export function SettingsScreen() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, logout } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [isPublicProfile, setIsPublicProfile] = useState(currentUser?.preferences?.isPublicProfile ?? true);
  const [showFullTripDetails, setShowFullTripDetails] = useState(currentUser?.preferences?.showFullTripDetails ?? false);
  const [showTripHistory, setShowTripHistory] = useState(currentUser?.preferences?.showTripHistory ?? true);
  const [showStats, setShowStats] = useState(currentUser?.preferences?.showStats ?? true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(currentUser?.preferences?.allowFriendRequests ?? true);
  
  const [homeLocation, setHomeLocation] = useState<GeocodeResult | undefined>(currentUser?.homeLocation);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!currentUser) return null;

  const handleSave = async () => {
    if (!currentUser.id) return;
    setIsSaving(true);

    try {
      const updatedUser = {
        ...currentUser,
        displayName,
        homeLocation,
        preferences: {
          ...currentUser.preferences,
          isPublicProfile,
          showTripsOnLeaderboard: isPublicProfile, // Sync for now
          allowFriendRequests,
          showFullTripDetails,
          showTripHistory,
          showStats
        }
      };

      await db.users.update(currentUser.id, updatedUser);
      setCurrentUser(updatedUser);
      addToast({ title: 'Succès', message: 'Paramètres enregistrés.', type: 'success' });
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erreur', message: 'Impossible de sauvegarder.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentUser.id) return;
    try {
      await db.users.delete(currentUser.id);
      await db.trips.where('userId').equals(currentUser.id).delete();
      await db.achievements.where('userId').equals(currentUser.id).delete();
      await db.feedback.where('userId').equals(currentUser.id).delete();
      
      logout();
      navigate('/login');
      addToast({ title: 'Compte supprimé', message: 'Au revoir !', type: 'info' });
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erreur', message: 'Impossible de supprimer le compte.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto relative pb-24">
      <header className="flex items-center gap-4 mb-8 mt-4">
        <button 
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display text-white">Paramètres</h1>
      </header>

      <div className="flex flex-col gap-6">
        
        {/* Profile Section */}
        <section className="bg-surface border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4 text-primary">
            <User className="w-5 h-5" />
            <h2 className="font-bold text-lg text-white">Profil</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider font-bold mb-2">Nom d'affichage</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 uppercase tracking-wider font-bold mb-2">Nom d'utilisateur</label>
              <div className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed">
                @{currentUser.username}
              </div>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="bg-surface border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4 text-blue-400">
            <Shield className="w-5 h-5" />
            <h2 className="font-bold text-lg text-white">Confidentialité</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", isPublicProfile ? "bg-success/20 text-success" : "bg-white/10 text-white/30")}>
                {isPublicProfile ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Profil Public</h3>
                <p className="text-xs text-white/50">Visible dans le classement</p>
              </div>
            </div>
            <button
              onClick={() => setIsPublicProfile(!isPublicProfile)}
              className={clsx(
                "w-12 h-6 rounded-full p-1 transition-colors relative",
                isPublicProfile ? "bg-primary" : "bg-white/10"
              )}
            >
              <motion.div
                animate={{ x: isPublicProfile ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          {/* Show Full Trip Details */}
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 mt-3">
            <div className="flex items-center gap-3">
              <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", showFullTripDetails ? "bg-purple-500/20 text-purple-400" : "bg-white/10 text-white/30")}>
                <Map className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Détails des trajets</h3>
                <p className="text-xs text-white/50">Afficher les adresses complètes</p>
              </div>
            </div>
            <button
              onClick={() => setShowFullTripDetails(!showFullTripDetails)}
              className={clsx(
                "w-12 h-6 rounded-full p-1 transition-colors relative",
                showFullTripDetails ? "bg-purple-500" : "bg-white/10"
              )}
            >
              <motion.div
                animate={{ x: showFullTripDetails ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          {/* Show Trip History */}
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 mt-3">
            <div className="flex items-center gap-3">
              <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", showTripHistory ? "bg-blue-500/20 text-blue-400" : "bg-white/10 text-white/30")}>
                <History className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Historique des trajets</h3>
                <p className="text-xs text-white/50">Visible par les autres utilisateurs</p>
              </div>
            </div>
            <button
              onClick={() => setShowTripHistory(!showTripHistory)}
              className={clsx(
                "w-12 h-6 rounded-full p-1 transition-colors relative",
                showTripHistory ? "bg-blue-500" : "bg-white/10"
              )}
            >
              <motion.div
                animate={{ x: showTripHistory ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          {/* Show Stats */}
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 mt-3">
            <div className="flex items-center gap-3">
              <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", showStats ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-white/30")}>
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Statistiques</h3>
                <p className="text-xs text-white/50">Afficher mes stats globales</p>
              </div>
            </div>
            <button
              onClick={() => setShowStats(!showStats)}
              className={clsx(
                "w-12 h-6 rounded-full p-1 transition-colors relative",
                showStats ? "bg-yellow-500" : "bg-white/10"
              )}
            >
              <motion.div
                animate={{ x: showStats ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>

          {/* Allow Friend Requests */}
          <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5 mt-3">
            <div className="flex items-center gap-3">
              <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", allowFriendRequests ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/30")}>
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Demandes d'amis</h3>
                <p className="text-xs text-white/50">Autoriser les autres à m'ajouter</p>
              </div>
            </div>
            <button
              onClick={() => setAllowFriendRequests(!allowFriendRequests)}
              className={clsx(
                "w-12 h-6 rounded-full p-1 transition-colors relative",
                allowFriendRequests ? "bg-green-500" : "bg-white/10"
              )}
            >
              <motion.div
                animate={{ x: allowFriendRequests ? 24 : 0 }}
                className="w-4 h-4 bg-white rounded-full shadow-sm"
              />
            </button>
          </div>
        </section>

        {/* Address Section */}
        <section className="bg-surface border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4 text-purple-400">
            <Home className="w-5 h-5" />
            <h2 className="font-bold text-lg text-white">Adresses</h2>
          </div>

          <div>
            <label className="block text-xs text-white/50 uppercase tracking-wider font-bold mb-2">Domicile</label>
            <p className="text-xs text-white/40 mb-3">
              Saisis "Maison" ou "Home" dans la recherche de trajet pour utiliser cette adresse.
            </p>
            <AddressAutocomplete
              placeholder="Rechercher ton adresse..."
              initialValue={homeLocation?.display_name}
              onSelect={(result) => setHomeLocation(result || undefined)}
              icon={<Home className="w-5 h-5 text-purple-400" />}
            />
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-surface border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4 text-failure">
            <Trash2 className="w-5 h-5" />
            <h2 className="font-bold text-lg text-white">Zone Danger</h2>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 px-4 bg-failure/10 text-failure hover:bg-failure/20 rounded-xl font-bold text-sm transition-colors border border-failure/20"
            >
              Supprimer mon compte
            </button>
          ) : (
            <div className="bg-failure/10 border border-failure/20 rounded-xl p-4">
              <p className="text-white text-sm mb-4 text-center font-bold">Es-tu vraiment sûr ?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="flex-1 py-2 bg-failure hover:bg-failure/80 text-white rounded-lg text-xs font-bold transition-colors shadow-lg shadow-failure/20"
                >
                  Confirmer
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="sticky bottom-6 mt-4">
          <Button fullWidth onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Enregistrer</>}
          </Button>
        </div>

      </div>
    </div>
  );
}
