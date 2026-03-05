import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, MapPin, Trophy, Calendar, UserPlus, Check, X, Shield, Clock } from 'lucide-react';
import { AuthService } from '../services/AuthService';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import type { User, Trip, FriendRequest } from '../types/models';
import clsx from 'clsx';
import { motion } from 'motion/react';

export function PublicProfileScreen() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const addToast = useToastStore((state) => state.addToast);

  const [user, setUser] = useState<User | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends' | 'self'>('none');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId || !currentUser?.id) return;
      const targetUserId = parseInt(userId);

      if (targetUserId === currentUser.id) {
        // Load own profile from API to get accurate recent trips
        try {
          const response = await fetch(`/api/users/${targetUserId}`, {
            headers: AuthService.getAuthHeaders()
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setFriendStatus('self');
            setRecentTrips(data.recentTrips);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/users/${targetUserId}`, {
          headers: AuthService.getAuthHeaders()
        });

        if (!response.ok) {
          if (response.status === 403) {
             addToast({ title: 'Privé', message: 'Ce profil est privé.', type: 'info' });
          } else {
             addToast({ title: 'Erreur', message: 'Utilisateur introuvable.', type: 'error' });
          }
          navigate('/leaderboard');
          return;
        }

        const data = await response.json();
        setUser(data.user);
        setFriendStatus(data.friendStatus);
        setRecentTrips(data.recentTrips);

      } catch (error) {
        console.error(error);
        addToast({ title: 'Erreur', message: 'Impossible de charger le profil.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userId, currentUser, navigate, addToast]);

  const handleSendRequest = async () => {
    if (!currentUser?.id || !user?.id) return;
    
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: AuthService.getAuthHeaders(),
        body: JSON.stringify({ targetUserId: user.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Impossible d\'envoyer la demande.');
      }

      setFriendStatus('pending_sent');
      addToast({ title: 'Succès', message: 'Demande envoyée !', type: 'success' });
    } catch (error: any) {
      console.error(error);
      addToast({ title: 'Erreur', message: error.message, type: 'error' });
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentUser?.id || !user?.id) return;
    
    try {
      // We need the requestId to accept. The backend API requires requestId.
      // But we only have targetUserId here. Let's fetch friends list to find the request ID.
      const friendsRes = await fetch('/api/friends', { headers: AuthService.getAuthHeaders() });
      if (!friendsRes.ok) throw new Error('Failed to fetch requests');
      const requests = await friendsRes.json();
      
      const request = requests.find((r: any) => r.sender_id === user.id && r.receiver_id === currentUser.id && r.status === 'pending');
      
      if (request?.id) {
        const acceptRes = await fetch('/api/friends/accept', {
          method: 'POST',
          headers: AuthService.getAuthHeaders(),
          body: JSON.stringify({ requestId: request.id })
        });
        
        if (!acceptRes.ok) throw new Error('Failed to accept');

        setFriendStatus('friends');
        addToast({ title: 'Succès', message: 'Vous êtes maintenant amis !', type: 'success' });
      }
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erreur', message: 'Action impossible.', type: 'error' });
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const showStats = user.preferences?.showStats !== false;
  const showFullTripDetails = user.preferences?.showFullTripDetails === true;

  return (
    <div className="min-h-screen flex flex-col p-6 max-w-md mx-auto relative pb-24">
      <header className="flex items-center gap-4 mb-8 mt-4">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-surface border border-white/10 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display text-white">Profil</h1>
      </header>

      <div className="flex flex-col gap-6">
        
        {/* Profile Header */}
        <section className="bg-surface border border-white/5 rounded-3xl p-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 border-2 border-white/10 flex items-center justify-center mb-4 text-4xl">
            {/* Simple avatar placeholder */}
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-1">{user.displayName}</h2>
          <p className="text-white/50 text-sm mb-6">@{user.username}</p>

          {/* Action Button */}
          {friendStatus !== 'self' && (
            <div className="w-full">
              {friendStatus === 'none' && user.preferences?.allowFriendRequests !== false && (
                <button 
                  onClick={handleSendRequest}
                  className="w-full py-2 bg-primary text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Ajouter en ami
                </button>
              )}
              {friendStatus === 'pending_sent' && (
                <div className="w-full py-2 bg-white/10 text-white/50 font-bold rounded-xl flex items-center justify-center gap-2 cursor-default">
                  <Clock className="w-4 h-4" />
                  Demande envoyée
                </div>
              )}
              {friendStatus === 'pending_received' && (
                <button 
                  onClick={handleAcceptRequest}
                  className="w-full py-2 bg-success text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-success/90 transition-colors"
                >
                  <Check className="w-4 h-4" />
                  Accepter la demande
                </button>
              )}
              {friendStatus === 'friends' && (
                <div className="w-full py-2 bg-success/20 text-success font-bold rounded-xl flex items-center justify-center gap-2 border border-success/20">
                  <Check className="w-4 h-4" />
                  Amis
                </div>
              )}
              {friendStatus === 'none' && user.preferences?.allowFriendRequests === false && (
                <div className="text-xs text-white/30 italic">
                  Cet utilisateur n'accepte pas les demandes.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Stats Section */}
        {showStats ? (
          <section className="grid grid-cols-2 gap-3">
            <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Trophy className="w-6 h-6 text-yellow-400 mb-2" />
              <span className="text-2xl font-display text-white">{user.points}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Points</span>
            </div>
            <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <MapPin className="w-6 h-6 text-purple-400 mb-2" />
              <span className="text-2xl font-display text-white">{user.tripCount}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Trajets</span>
            </div>
            <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Calendar className="w-6 h-6 text-blue-400 mb-2" />
              <span className="text-2xl font-display text-white">{user.streak}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Jours Streak</span>
            </div>
            <div className="bg-surface border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
              <Shield className="w-6 h-6 text-green-400 mb-2" />
              <span className="text-2xl font-display text-white">{Math.round(user.totalDistanceKm)}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Km Total</span>
            </div>
          </section>
        ) : (
          <div className="bg-surface border border-white/5 rounded-2xl p-6 text-center text-white/40 italic text-sm">
            Les statistiques de cet utilisateur sont privées.
          </div>
        )}

        {/* Recent Trips */}
        <section>
          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Trajets récents
          </h3>
          
          {user.preferences?.showTripHistory === false ? (
             <div className="bg-surface border border-white/5 rounded-2xl p-6 text-center text-white/40 italic text-sm">
               L'historique des trajets est privé.
             </div>
          ) : recentTrips.length > 0 ? (
            <div className="flex flex-col gap-3">
              {recentTrips.map(trip => (
                <div key={trip.id} className="bg-surface border border-white/5 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex flex-col min-w-0 mr-4">
                    <span className="text-white font-bold text-sm truncate">
                      {showFullTripDetails ? trip.routeName : "Trajet masqué"}
                    </span>
                    <span className="text-white/40 text-xs">
                      {new Date(trip.date).toLocaleDateString()} • {trip.distanceKm.toFixed(1)} km
                    </span>
                  </div>
                  <div className={clsx("px-2 py-1 rounded text-[10px] font-bold uppercase", trip.success ? "bg-success/20 text-success" : "bg-failure/20 text-failure")}>
                    {trip.success ? "Réussi" : "Échoué"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/30 text-sm py-4">
              Aucun trajet récent.
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
