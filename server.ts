import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { db } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/auth/signup', async (req, res) => {
    const { username, displayName, password } = req.body;

    try {
      const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (existing) {
        return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris." });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      const createdAt = Date.now();
      
      // Check if first user (admin)
      const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const isAdmin = count.count === 0 ? 1 : 0;

      const stmt = db.prepare(`
        INSERT INTO users (username, display_name, password_hash, created_at, is_admin)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(username, displayName, passwordHash, createdAt, isAdmin);
      const userId = info.lastInsertRowid;

      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      const { password_hash, ...safeUser } = newUser as any;
      
      res.json(safeUser);
    } catch (error: any) {
      console.error('Signup error:', error);
      res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    // Artificial delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }

      const { password_hash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Erreur lors de la connexion.' });
    }
  });

  app.get('/api/leaderboard', (req, res) => {
    try {
      const users = db.prepare(`
        SELECT id, username, display_name, points, total_earned, trip_count, streak, longest_trip_km, total_distance_km
        FROM users
        ORDER BY points DESC
        LIMIT 10
      `).all();
      res.json(users);
    } catch (error) {
      console.error('Leaderboard error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du classement.' });
    }
  });

  app.post('/api/game/submit', (req, res) => {
    const { userId, score, distanceKm, crossings } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const now = Date.now();
      
      // Update user stats
      const newPoints = user.points + score; // Accumulate points? Or replace if higher? Assuming accumulate for now based on "totalEarned" vs "points"
      // Wait, usually "points" is current score/currency, "totalEarned" is lifetime.
      // Let's assume "points" is current balance.
      
      const newTotalEarned = user.total_earned + score;
      const newTripCount = user.trip_count + 1;
      const newTotalDistance = user.total_distance_km + distanceKm;
      const newLongestTrip = Math.max(user.longest_trip_km, distanceKm);
      const newMaxCrossings = Math.max(user.max_crossings_in_trip, crossings);

      db.prepare(`
        UPDATE users 
        SET points = ?, total_earned = ?, trip_count = ?, total_distance_km = ?, longest_trip_km = ?, max_crossings_in_trip = ?
        WHERE id = ?
      `).run(newPoints, newTotalEarned, newTripCount, newTotalDistance, newLongestTrip, newMaxCrossings, userId);

      // Record session
      db.prepare(`
        INSERT INTO game_sessions (user_id, score, distance_km, crossings, ended_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, score, distanceKm, crossings, now);

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      const { password_hash, ...safeUser } = updatedUser as any;
      
      res.json(safeUser);
    } catch (error) {
      console.error('Submit game error:', error);
      res.status(500).json({ error: 'Erreur lors de la sauvegarde de la partie.' });
    }
  });

  app.get('/api/history', (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    try {
      const sessions = db.prepare(`
        SELECT * FROM game_sessions 
        WHERE user_id = ? 
        ORDER BY ended_at DESC
      `).all(userId);
      
      const trips = sessions.map((session: any) => ({
        id: session.id,
        userId: session.user_id,
        routeName: 'Trajet', // Default name as backend doesn't store route name yet
        distanceKm: session.distance_km,
        crossingsCount: session.crossings,
        success: session.score > 0, // Simplified success check
        date: session.ended_at
      }));

      res.json(trips);
    } catch (error) {
      console.error('History error:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
