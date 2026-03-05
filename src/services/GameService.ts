import type { User } from '../types/models';

export class GameService {
  static async submitScore(userId: number, score: number, distanceKm: number, crossings: number): Promise<User> {
    const response = await fetch('/api/game/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, score, distanceKm, crossings }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la sauvegarde de la partie');
    }

    return response.json();
  }
}
