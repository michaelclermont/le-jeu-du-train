import { db } from '../db/database';
import type { User } from '../types/models';
import { useToastStore } from '../store/useToastStore';

export const ACHIEVEMENTS = [
  // Existing
  { id: 'first', title: 'Premier Passage 🚂', description: 'Gagne ton premier point en réussissant un passage.', condition: (u: User) => u.totalEarned >= 1 },
  { id: 'ten', title: 'Dix Points ⭐', description: 'Atteins un score actuel de 10 points.', condition: (u: User) => u.points >= 10 },
  { id: 'fifty', title: 'Cinquante! 🏆', description: 'Atteins un score actuel de 50 points.', condition: (u: User) => u.points >= 50 },
  { id: 'hundred', title: 'Centurion 👑', description: 'Atteins un score actuel de 100 points.', condition: (u: User) => u.points >= 100 },
  { id: 'trips5', title: 'Voyageur 🗺️', description: 'Termine 5 trajets.', condition: (u: User) => u.tripCount >= 5 },
  { id: 'trips20', title: 'Globe-Trotter 🌍', description: 'Termine 20 trajets.', condition: (u: User) => u.tripCount >= 20 },
  { id: 'streak5', title: 'Sans Faute 🔥', description: 'Réussis 5 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 5 },
  { id: 'comeback', title: 'Renaissance 🦅', description: 'Gagne des points après avoir perdu une partie.', condition: (u: User) => u.hasLost && u.points > 0 },
  { id: 'long', title: 'Grand Voyage 🛣️', description: 'Effectue un trajet de plus de 200 km.', condition: (u: User) => u.longestTripKm >= 200 },
  { id: 'iron_marathoner', title: 'The Iron Marathoner 🏃', description: 'Parcours un total de 1000 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 1000 },
  { id: 'ten_x', title: 'Dix Barrières 🚧', description: 'Termine un trajet avec au moins 10 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 10 },

  // New - Easy
  { id: 'streak_3', title: 'Hat Trick 🎩', description: 'Réussis 3 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 3 },
  { id: 'beginner_5', title: 'Débutant 👶', description: 'Gagne un total de 5 points (cumulés).', condition: (u: User) => u.totalEarned >= 5 },
  { id: 'distance_50', title: 'Promeneur 🚶', description: 'Parcours un total de 50 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 50 },
  { id: 'oops', title: 'Oups! 💥', description: 'Perds une partie en oubliant de lever les jambes.', condition: (u: User) => u.hasLost },
  { id: 'crossings_5_trip', title: 'Cinq d\'un Coup 🖐️', description: 'Termine un trajet avec au moins 5 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 5 },

  // New - Medium
  { id: 'trips_10', title: 'Habitué 🚕', description: 'Termine 10 trajets.', condition: (u: User) => u.tripCount >= 10 },
  { id: 'points_25', title: 'Quart de Siècle 🪙', description: 'Atteins un score actuel de 25 points.', condition: (u: User) => u.points >= 25 },
  { id: 'streak_10', title: 'Sérieux 🔥', description: 'Réussis 10 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 10 },
  { id: 'collector_50', title: 'Collectionneur 📥', description: 'Gagne un total de 50 points (cumulés).', condition: (u: User) => u.totalEarned >= 50 },
  { id: 'distance_250', title: 'Aventurier 🤠', description: 'Parcours un total de 250 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 250 },
  { id: 'points_75', title: 'Soixante-Quinze 🎰', description: 'Atteins un score actuel de 75 points.', condition: (u: User) => u.points >= 75 },

  // New - Hard
  { id: 'trips_50', title: 'Chauffeur 🧢', description: 'Termine 50 trajets.', condition: (u: User) => u.tripCount >= 50 },
  { id: 'streak_20', title: 'Imbattable 🚀', description: 'Réussis 20 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 20 },
  { id: 'collector_200', title: 'Accumulateur 🏦', description: 'Gagne un total de 200 points (cumulés).', condition: (u: User) => u.totalEarned >= 200 },
  { id: 'points_150', title: 'Expert 🎓', description: 'Atteins un score actuel de 150 points.', condition: (u: User) => u.points >= 150 },
  { id: 'crossings_15_trip', title: 'Slalom Géant ⛷️', description: 'Termine un trajet avec au moins 15 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 15 },

  // New - Expert
  { id: 'distance_2000', title: 'Explorateur 🧭', description: 'Parcours un total de 2000 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 2000 },
  { id: 'trips_100', title: 'Centenaire 🎂', description: 'Termine 100 trajets.', condition: (u: User) => u.tripCount >= 100 },
  { id: 'streak_50', title: 'Légende Vivante 🌟', description: 'Réussis 50 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 50 },
  { id: 'points_300', title: 'Dieu du Rail ⚡', description: 'Atteins un score actuel de 300 points.', condition: (u: User) => u.points >= 300 },

  // New - Novice (Very Easy)
  { id: 'trip_2', title: 'Double Détente ✌️', description: 'Termine 2 trajets.', condition: (u: User) => u.tripCount >= 2 },
  { id: 'points_5', title: 'Petit Pas 🐾', description: 'Atteins un score actuel de 5 points.', condition: (u: User) => u.points >= 5 },
  { id: 'distance_10', title: 'Echauffement 👟', description: 'Parcours un total de 10 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 10 },
  { id: 'streak_2', title: 'Duo Dynamique 👯', description: 'Réussis 2 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 2 },
  { id: 'total_15', title: 'Tirelire 🐷', description: 'Gagne un total de 15 points (cumulés).', condition: (u: User) => u.totalEarned >= 15 },

  // New - Apprentice (Easy)
  { id: 'trip_15', title: 'Routier Sympa 🚛', description: 'Termine 15 trajets.', condition: (u: User) => u.tripCount >= 15 },
  { id: 'points_15', title: 'Quinze! 🎱', description: 'Atteins un score actuel de 15 points.', condition: (u: User) => u.points >= 15 },
  { id: 'points_20', title: 'Vingt/Vingt 🦉', description: 'Atteins un score actuel de 20 points.', condition: (u: User) => u.points >= 20 },
  { id: 'streak_7', title: 'Chanceux 🍀', description: 'Réussis 7 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 7 },
  { id: 'distance_100', title: 'Cent Bornes ⛽', description: 'Parcours un total de 100 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 100 },
  { id: 'total_30', title: 'Petite Fortune 💰', description: 'Gagne un total de 30 points (cumulés).', condition: (u: User) => u.totalEarned >= 30 },
  { id: 'crossings_3', title: 'Triple Barrière 🚧', description: 'Termine un trajet avec au moins 3 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 3 },
  { id: 'crossings_7', title: 'Sept Merveilles 🕌', description: 'Termine un trajet avec au moins 7 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 7 },

  // New - Journeyman (Medium)
  { id: 'trip_30', title: 'Grand Voyageur 🧳', description: 'Termine 30 trajets.', condition: (u: User) => u.tripCount >= 30 },
  { id: 'trip_40', title: 'Nomade ⛺', description: 'Termine 40 trajets.', condition: (u: User) => u.tripCount >= 40 },
  { id: 'points_30', title: 'Trente Glorieuses 📈', description: 'Atteins un score actuel de 30 points.', condition: (u: User) => u.points >= 30 },
  { id: 'points_40', title: 'Quarantaine 🦠', description: 'Atteins un score actuel de 40 points.', condition: (u: User) => u.points >= 40 },
  { id: 'streak_12', title: 'Douzaine 🥚', description: 'Réussis 12 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 12 },
  { id: 'streak_15', title: 'Quinze à la Suite 🎯', description: 'Réussis 15 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 15 },
  { id: 'distance_500', title: 'Demi-Millier 🏁', description: 'Parcours un total de 500 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 500 },
  { id: 'total_75', title: 'Bonne Récolte 🌾', description: 'Gagne un total de 75 points (cumulés).', condition: (u: User) => u.totalEarned >= 75 },
  { id: 'total_125', title: 'Gros Magot 💎', description: 'Gagne un total de 125 points (cumulés).', condition: (u: User) => u.totalEarned >= 125 },
  { id: 'crossings_8', title: 'Octogone 🛑', description: 'Termine un trajet avec au moins 8 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 8 },
  { id: 'crossings_12', title: 'Douze Travaux 💪', description: 'Termine un trajet avec au moins 12 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 12 },

  // New - Advanced (Hard)
  { id: 'trip_60', title: 'Route 66 🛣️', description: 'Termine 60 trajets.', condition: (u: User) => u.tripCount >= 60 },
  { id: 'trip_75', title: 'Diamant 💎', description: 'Termine 75 trajets.', condition: (u: User) => u.tripCount >= 75 },
  { id: 'points_60', title: 'Soixante ⏲️', description: 'Atteins un score actuel de 60 points.', condition: (u: User) => u.points >= 60 },
  { id: 'points_80', title: 'Quatre-Vingts 🌍', description: 'Atteins un score actuel de 80 points.', condition: (u: User) => u.points >= 80 },
  { id: 'points_90', title: 'Angle Droit 📐', description: 'Atteins un score actuel de 90 points.', condition: (u: User) => u.points >= 90 },
  { id: 'streak_25', title: 'Quart de Cent 💯', description: 'Réussis 25 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 25 },
  { id: 'streak_30', title: 'Trente Rugissants 🦁', description: 'Réussis 30 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 30 },
  { id: 'distance_1500', title: 'Mille Cinq 🏊', description: 'Parcours un total de 1500 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 1500 },
  { id: 'total_350', title: 'Banquier 🏦', description: 'Gagne un total de 350 points (cumulés).', condition: (u: User) => u.totalEarned >= 350 },
  { id: 'total_500', title: 'Demi-Kilo ⚖️', description: 'Gagne un total de 500 points (cumulés).', condition: (u: User) => u.totalEarned >= 500 },
  { id: 'crossings_18', title: 'Majeur 🔞', description: 'Termine un trajet avec au moins 18 passages à niveau.', condition: (u: User) => u.maxCrossingsInTrip >= 18 },

  // New - Master (Very Hard)
  { id: 'trip_150', title: 'Légende de la Route 🏎️', description: 'Termine 150 trajets.', condition: (u: User) => u.tripCount >= 150 },
  { id: 'trip_200', title: 'Bicentenaire 🏛️', description: 'Termine 200 trajets.', condition: (u: User) => u.tripCount >= 200 },
  { id: 'points_120', title: 'Super Cent 🦸', description: 'Atteins un score actuel de 120 points.', condition: (u: User) => u.points >= 120 },
  { id: 'points_180', title: 'Demi-Tour ↩️', description: 'Atteins un score actuel de 180 points.', condition: (u: User) => u.points >= 180 },
  { id: 'streak_40', title: 'Quarantaine Rugissante 🐯', description: 'Réussis 40 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 40 },
  { id: 'streak_60', title: 'Soixante Solide 🗿', description: 'Réussis 60 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 60 },
  { id: 'distance_3000', title: 'Transcontinental 🚂', description: 'Parcours un total de 3000 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 3000 },
  { id: 'distance_5000', title: '5K Run 🏃‍♂️', description: 'Parcours un total de 5000 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 5000 },
  { id: 'total_750', title: 'Investisseur 💼', description: 'Gagne un total de 750 points (cumulés).', condition: (u: User) => u.totalEarned >= 750 },
  { id: 'total_1000', title: 'Kilo-Point ⚖️', description: 'Gagne un total de 1000 points (cumulés).', condition: (u: User) => u.totalEarned >= 1000 },

  // New - Godlike (Extreme)
  { id: 'trip_300', title: 'Spartiate ⚔️', description: 'Termine 300 trajets.', condition: (u: User) => u.tripCount >= 300 },
  { id: 'points_250', title: 'Quart de Mille 🏁', description: 'Atteins un score actuel de 250 points.', condition: (u: User) => u.points >= 250 },
  { id: 'streak_75', title: 'Diamant Brut 💎', description: 'Réussis 75 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 75 },
  { id: 'streak_100', title: 'Siècle Parfait 💯', description: 'Réussis 100 passages d\'affilée sans erreur.', condition: (u: User) => u.streak >= 100 },
  { id: 'distance_10000', title: 'Tour du Monde 🌏', description: 'Parcours un total de 10000 km.', condition: (u: User) => (u.totalDistanceKm || 0) >= 10000 },
];

export class AchievementEngine {
  /**
   * Checks if the user has unlocked any new achievements based on their current state.
   */
  static async check(user: User) {
    if (!user.id) return;

    const unlocked = await db.achievements.where('userId').equals(user.id).toArray();
    const unlockedIds = new Set(unlocked.map(a => a.achievementId));

    for (const ach of ACHIEVEMENTS) {
      if (!unlockedIds.has(ach.id) && ach.condition(user)) {
        // Unlock new achievement
        await db.achievements.add({
          userId: user.id,
          achievementId: ach.id,
          unlockedAt: Date.now(),
        });

        // Show Toast
        useToastStore.getState().addToast({
          title: 'Succès Déverrouillé!',
          message: ach.title,
          type: 'achievement',
        });
      }
    }
  }
}
