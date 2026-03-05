import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeft, Send, Bug, MessageSquare, Clock, CheckCircle2, XCircle, Loader2, MessageCircle, Lock } from 'lucide-react';
import { db } from '../db/database';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { Button } from '../components/Button';
import clsx from 'clsx';
import type { FeedbackType, FeedbackStatus, FeedbackReply } from '../types/models';

export function FeedbackScreen() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const addToast = useToastStore((state) => state.addToast);
  
  const [type, setType] = useState<FeedbackType>('feedback');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyText, setReplyText] = useState<{[key: number]: string}>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const myFeedback = useLiveQuery(
    () => currentUser?.id ? db.feedback.where('userId').equals(currentUser.id).reverse().sortBy('createdAt') : [],
    [currentUser?.id]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await db.feedback.add({
        userId: currentUser.id,
        type,
        message: message.trim(),
        status: 'pending',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        replies: []
      });
      
      setMessage('');
      addToast({ title: 'Envoyé!', message: 'Merci pour votre retour.', type: 'success' });
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erreur', message: "Impossible d'envoyer le message.", type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (feedbackId: number) => {
    if (!currentUser?.id || !replyText[feedbackId]?.trim()) return;

    try {
      const feedback = await db.feedback.get(feedbackId);
      if (!feedback) return;

      // Security check: Ensure user owns the feedback
      if (feedback.userId !== currentUser.id) {
        addToast({ title: 'Erreur', message: "Action non autorisée.", type: 'error' });
        return;
      }

      const newReply: FeedbackReply = {
        senderId: currentUser.id,
        isAdmin: false,
        message: replyText[feedbackId].trim(),
        createdAt: Date.now()
      };

      const updatedReplies = [...(feedback.replies || []), newReply];
      
      await db.feedback.update(feedbackId, { 
        replies: updatedReplies,
        updatedAt: Date.now()
      });

      setReplyText(prev => ({ ...prev, [feedbackId]: '' }));
      addToast({ title: 'Envoyé!', message: 'Réponse ajoutée.', type: 'success' });
    } catch (error) {
      console.error(error);
      addToast({ title: 'Erreur', message: "Impossible d'envoyer la réponse.", type: 'error' });
    }
  };

  const getStatusIcon = (status: FeedbackStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'in_progress': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'resolved': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusLabel = (status: FeedbackStatus) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'in_progress': return 'En cours';
      case 'resolved': return 'Résolu';
      case 'rejected': return 'Rejeté';
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
          <MessageSquare className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-display text-white">Aide & Retours</h1>
        </div>
      </header>

      {/* Form */}
      <div className="bg-surface border border-white/5 rounded-3xl p-6 mb-8">
        <h2 className="font-bold text-lg mb-4 text-white">Nouveau message</h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
            <button
              type="button"
              onClick={() => setType('feedback')}
              className={clsx(
                "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                type === 'feedback' ? "bg-primary text-black shadow-lg" : "text-white/50 hover:text-white"
              )}
            >
              <MessageSquare className="w-4 h-4" />
              Suggestion
            </button>
            <button
              type="button"
              onClick={() => setType('bug')}
              className={clsx(
                "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                type === 'bug' ? "bg-failure text-white shadow-lg" : "text-white/50 hover:text-white"
              )}
            >
              <Bug className="w-4 h-4" />
              Bug
            </button>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={type === 'feedback' ? "Une idée pour améliorer le jeu ?" : "Décrivez le problème rencontré..."}
            className="w-full h-32 bg-black/20 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:border-primary/50 transition-colors resize-none"
            required
          />

          <Button type="submit" disabled={isSubmitting || !message.trim()} fullWidth>
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Envoyer</>}
          </Button>
        </form>
      </div>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="font-bold text-lg text-white">Mes messages</h2>
          <div className="flex items-center gap-1 text-[10px] text-white/40 uppercase tracking-wider font-bold">
            <Lock className="w-3 h-3" />
            Privé
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          {myFeedback?.map((item) => (
            <div key={item.id} className="bg-surface border border-white/5 rounded-2xl p-4 overflow-hidden">
              <div 
                className="flex items-start justify-between mb-2 cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id!)}
              >
                <div className="flex items-center gap-2">
                  {item.type === 'bug' ? (
                    <span className="bg-failure/20 text-failure text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex items-center gap-1">
                      <Bug className="w-3 h-3" /> Bug
                    </span>
                  ) : (
                    <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Suggestion
                    </span>
                  )}
                  <span className="text-xs text-white/30">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className={clsx(
                  "flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full border",
                  item.status === 'pending' && "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                  item.status === 'in_progress' && "bg-blue-500/10 text-blue-500 border-blue-500/20",
                  item.status === 'resolved' && "bg-green-500/10 text-green-500 border-green-500/20",
                  item.status === 'rejected' && "bg-red-500/10 text-red-500 border-red-500/20",
                )}>
                  {getStatusIcon(item.status)}
                  {getStatusLabel(item.status)}
                </div>
              </div>
              
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{item.message}</p>

              {/* Replies Section */}
              {item.replies && item.replies.length > 0 && (
                <div className="mt-4 pl-4 border-l-2 border-white/10 space-y-3">
                  {item.replies.map((reply, idx) => (
                    <div key={idx} className={clsx("text-sm", reply.isAdmin ? "text-primary/90" : "text-white/70")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs uppercase tracking-wider">
                          {reply.isAdmin ? 'Support' : 'Moi'}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{reply.message}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Input */}
              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText[item.id!] || ''}
                      onChange={(e) => setReplyText(prev => ({ ...prev, [item.id!]: e.target.value }))}
                      placeholder="Répondre..."
                      className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (item.id) handleReply(item.id);
                        }
                      }}
                    />
                    <button
                      onClick={() => item.id && handleReply(item.id)}
                      disabled={!replyText[item.id!]?.trim()}
                      className="p-2 bg-white/10 rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Expand/Collapse Hint */}
              {(!expandedId || expandedId !== item.id) && (
                <div 
                  className="mt-2 text-center"
                  onClick={() => setExpandedId(item.id!)}
                >
                  <button className="text-[10px] text-white/30 uppercase tracking-wider hover:text-white/50 flex items-center justify-center gap-1 w-full">
                    <MessageCircle className="w-3 h-3" />
                    {item.replies?.length ? `${item.replies.length} réponse(s)` : 'Répondre'}
                  </button>
                </div>
              )}
            </div>
          ))}

          {myFeedback?.length === 0 && (
            <div className="text-center text-white/30 py-8 bg-surface/50 rounded-2xl border border-white/5 border-dashed">
              Aucun message envoyé pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
