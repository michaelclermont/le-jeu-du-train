import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Check, X, Users } from 'lucide-react';
import { db } from '../db/database';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import type { User, FriendRequest } from '../types/models';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export function FriendsScreen() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const addToast = useToastStore((state) => state.addToast);

  const [pendingRequests, setPendingRequests] = useState<(FriendRequest & { sender: User })[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadFriendsData = async () => {
      if (!currentUser?.id) return;

      try {
        // 1. Load Pending Requests (Received)
        const requests = await db.friendRequests
          .where('receiverId')
          .equals(currentUser.id)
          .filter(req => req.status === 'pending')
          .toArray();

        // Fetch sender details for each request
        const requestsWithSenders = await Promise.all(
          requests.map(async (req) => {
            const sender = await db.users.get(req.senderId);
            return { ...req, sender: sender! };
          })
        );
        setPendingRequests(requestsWithSenders.filter(r => r.sender)); // Filter out if sender deleted

        // 2. Load Friends (Accepted)
        // Find requests where I am sender OR receiver AND status is accepted
        const sentAccepted = await db.friendRequests
          .where('senderId')
          .equals(currentUser.id)
          .filter(req => req.status === 'accepted')
          .toArray();
        
        const receivedAccepted = await db.friendRequests
          .where('receiverId')
          .equals(currentUser.id)
          .filter(req => req.status === 'accepted')
          .toArray();

        const friendIds = [
          ...sentAccepted.map(r => r.receiverId),
          ...receivedAccepted.map(r => r.senderId)
        ];

        // Deduplicate IDs just in case
        const uniqueFriendIds = Array.from(new Set(friendIds));

        const friendsList = await db.users.bulkGet(uniqueFriendIds);
        setFriends(friendsList.filter((f): f is User => !!f));

      } catch (error) {
        console.error("Error loading friends:", error);
        addToast({ title: 'Erreur', message: 'Impossible de charger les amis.', type: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    loadFriendsData();
  }, [currentUser?.id, addToast]);

  const handleAccept = async (requestId: number) => {
    try {
      await db.friendRequests.update(requestId, { status: 'accepted' });
      
      // Move from pending to friends list locally
      const request = pendingRequests.find(r => r.id === requestId);
      if (request) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        setFriends(prev => [...prev, request.sender]);
        addToast({ title: 'Succès', message: 'Ami ajouté !', type: 'success' });
      }
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erreur', message: 'Action impossible.', type: 'error' });
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await db.friendRequests.update(requestId, { status: 'rejected' });
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
      addToast({ title: 'Refusé', message: 'Demande supprimée.', type: 'info' });
    } catch (error) {
      console.error(error);
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
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display text-white">Amis</h1>
        </div>
      </header>

      <div className="flex flex-col gap-8">
        
        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <section>
            <h2 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider opacity-70">
              <UserPlus className="w-4 h-4" />
              Demandes en attente ({pendingRequests.length})
            </h2>
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {pendingRequests.map(req => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-surface border border-white/10 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {req.sender.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-white font-bold block">{req.sender.displayName}</span>
                        <span className="text-white/40 text-xs">@{req.sender.username}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => req.id && handleReject(req.id)}
                        className="w-8 h-8 rounded-full bg-failure/10 text-failure flex items-center justify-center hover:bg-failure/20 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => req.id && handleAccept(req.id)}
                        className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success/20 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* Friends List */}
        <section>
          <h2 className="text-white font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider opacity-70">
            <Users className="w-4 h-4" />
            Mes Amis ({friends.length})
          </h2>
          
          {friends.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {friends.map(friend => (
                <div 
                  key={friend.id}
                  onClick={() => navigate(`/profile/${friend.id}`)}
                  className="bg-surface border border-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold">
                      {friend.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-white font-bold block">{friend.displayName}</span>
                      <span className="text-white/40 text-xs">@{friend.username}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-primary font-display text-lg block">{friend.points}</span>
                    <span className="text-[10px] uppercase text-white/30 font-bold">Points</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-surface/50 rounded-2xl border border-white/5 border-dashed">
              <Users className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/50 text-sm">Vous n'avez pas encore d'amis.</p>
              <p className="text-white/30 text-xs mt-1">Ajoutez des joueurs depuis le classement !</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
