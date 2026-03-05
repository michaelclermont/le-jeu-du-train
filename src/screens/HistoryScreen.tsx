import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, CheckCircle2, XCircle, MapPin } from 'lucide-react';
import { db } from '../db/database';
import { useAuthStore } from '../store/useAuthStore';
import { AuthService } from '../services/AuthService';
import type { Trip } from '../types/models';
import clsx from 'clsx';

export function HistoryScreen() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentUser?.id) return;
      try {
        const response = await fetch('/api/history', {
          headers: AuthService.getAuthHeaders()
        });
        if (response.ok) {
          const userTrips = await response.json();
          setTrips(userTrips);
        }
      } catch (error) {
        console.error('Failed to load history', error);
      }
    };
    loadHistory();
  }, [currentUser?.id]);

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('fr-CA', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  };

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
          <History className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display text-white">Historique</h1>
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {trips.map((trip) => (
          <div 
            key={trip.id}
            className={clsx(
              "flex flex-col p-4 rounded-2xl border transition-all",
              trip.success 
                ? "bg-success/5 border-success/20" 
                : "bg-failure/5 border-failure/20"
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 text-sm text-white/50">
                <MapPin className="w-4 h-4" />
                <span className="truncate max-w-[200px]">{trip.routeName}</span>
              </div>
              <span className="text-xs text-white/30 shrink-0">{formatDate(trip.date)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {trip.success ? (
                  <CheckCircle2 className="w-6 h-6 text-success" />
                ) : (
                  <XCircle className="w-6 h-6 text-failure" />
                )}
                <div className="flex flex-col">
                  <span className={clsx("font-bold", trip.success ? "text-success" : "text-failure")}>
                    {trip.success ? "Réussi" : "Échoué"}
                  </span>
                  <span className="text-xs text-white/40">
                    {trip.distanceKm.toFixed(1)} km • {trip.crossingsCount} passages
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className={clsx("font-display text-xl", trip.success ? "text-success" : "text-failure")}>
                  {trip.success ? `+${trip.crossingsCount}` : "0"}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Points</span>
              </div>
            </div>
          </div>
        ))}

        {trips.length === 0 && (
          <div className="text-center text-white/50 py-10">
            Aucun trajet enregistré.
          </div>
        )}
      </div>
    </div>
  );
}
