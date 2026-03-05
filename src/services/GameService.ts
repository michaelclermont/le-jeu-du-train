import type { User } from '../types/models';
import { AuthService } from './AuthService';

export class GameService {
  static async submitScore(score: number, distanceKm: number, crossings: number, isFailed: boolean = false): Promise<User> {
    const response = await fetch('/api/game/submit', {
      method: 'POST',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify({ score, distanceKm, crossings, isFailed }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erreur lors de la sauvegarde de la partie');
    }

    return response.json();
  }
}
