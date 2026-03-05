import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { db } from './server/db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// Middlewares
function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Non autorisé' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token invalide' });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Accès refusé' });
  }
  next();
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1); // Trust first proxy (e.g., Nginx in AI Studio)

  app.use(helmet({
    contentSecurityPolicy: false, // Disabled for Vite dev server compatibility
  }));
  app.use(express.json({ limit: '10kb' }));

  const gameSubmitLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Limit each user to 10 requests per minute
    keyGenerator: (req: any) => req.user ? req.user.id.toString() : req.ip,
    message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
  });

  // Helper to parse JSON safely
  const safeJsonParse = (str: string | null) => {
    if (!str) return undefined;
    try { return JSON.parse(str); } catch { return undefined; }
  };

  // API Routes
  app.post('/api/auth/signup', authLimiter, async (req, res) => {
    const { username, displayName, password, recoveryPhrase, email, phone } = req.body;

    if (typeof username !== 'string' || typeof displayName !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: "Format de données invalide." });
    }
    if (!username.trim() || !displayName.trim() || !password) {
      return res.status(400).json({ error: "Champs requis manquants." });
    }
    if (username.length > 50 || displayName.length > 50) {
      return res.status(400).json({ error: "Nom d'utilisateur ou d'affichage trop long (max 50)." });
    }
    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({ error: "Le mot de passe doit contenir entre 8 et 128 caractères." });
    }
    if (email && (typeof email !== 'string' || email.length > 254)) {
       return res.status(400).json({ error: "Email invalide." });
    }
    if (phone && (typeof phone !== 'string' || phone.length > 20)) {
       return res.status(400).json({ error: "Téléphone invalide." });
    }
    if (recoveryPhrase && (typeof recoveryPhrase !== 'string' || recoveryPhrase.length > 200)) {
       return res.status(400).json({ error: "Phrase de récupération invalide." });
    }

    try {
      const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (existing) {
        return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris." });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(password, salt);
      const createdAt = Date.now();
      
      // Hash recovery data if provided
      const recoveryPhraseHash = recoveryPhrase ? bcrypt.hashSync(recoveryPhrase.toLowerCase().trim(), salt) : null;
      const emailHash = email ? bcrypt.hashSync(email.toLowerCase().trim(), salt) : null;
      const phoneHash = phone ? bcrypt.hashSync(phone.replace(/\s+/g, ''), salt) : null;
      
      // Check if first user (admin)
      const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      const isAdmin = count.count === 0 ? 1 : 0;

      const stmt = db.prepare(`
        INSERT INTO users (username, display_name, password_hash, created_at, is_admin, recovery_phrase, email, phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const info = stmt.run(username, displayName, passwordHash, createdAt, isAdmin, recoveryPhraseHash, emailHash, phoneHash);
      const userId = info.lastInsertRowid;

      const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      
      const token = jwt.sign(
        { id: newUser.id, isAdmin: newUser.is_admin === 1 },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          displayName: newUser.display_name,
          points: newUser.points,
          totalEarned: newUser.total_earned,
          tripCount: newUser.trip_count,
          streak: newUser.streak,
          longestTripKm: newUser.longest_trip_km,
          totalDistanceKm: newUser.total_distance_km,
          maxCrossingsInTrip: newUser.max_crossings_in_trip,
          createdAt: newUser.created_at,
          isAdmin: newUser.is_admin === 1,
          preferences: safeJsonParse(newUser.preferences),
          homeLocation: safeJsonParse(newUser.home_location)
        }
      });
    } catch (error: any) {
      console.error('Signup error:', error.message);
      res.status(500).json({ error: 'Erreur lors de l\'inscription.' });
    }
  });

  app.post('/api/auth/login', authLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: "Format de données invalide." });
    }
    if (!username.trim() || !password) {
      return res.status(400).json({ error: "Nom d'utilisateur et mot de passe requis." });
    }

    // Artificial delay
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      
      if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }

      const token = jwt.sign(
        { id: user.id, isAdmin: user.is_admin === 1 },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          points: user.points,
          totalEarned: user.total_earned,
          tripCount: user.trip_count,
          streak: user.streak,
          longestTripKm: user.longest_trip_km,
          totalDistanceKm: user.total_distance_km,
          maxCrossingsInTrip: user.max_crossings_in_trip,
          createdAt: user.created_at,
          isAdmin: user.is_admin === 1,
          preferences: safeJsonParse(user.preferences),
          homeLocation: safeJsonParse(user.home_location)
        }
      });
    } catch (error: any) {
      console.error('Login error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la connexion.' });
    }
  });

  app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
    const { username, recoveryPhrase, newPassword } = req.body;

    if (typeof username !== 'string' || typeof recoveryPhrase !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: "Format de données invalide." });
    }
    if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir entre 8 et 128 caractères." });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé." });
      }

      const methodLower = (recoveryPhrase || '').toLowerCase().trim();
      const matchesPhrase = user.recovery_phrase && bcrypt.compareSync(methodLower, user.recovery_phrase);

      if (!matchesPhrase) {
        return res.status(401).json({ error: "Phrase de récupération incorrecte." });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(newPassword, salt);

      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, user.id);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Reset password error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la réinitialisation du mot de passe.' });
    }
  });

  app.post('/api/auth/request-reset', authLimiter, async (req, res) => {
    const { username, contactMethod } = req.body;

    if (typeof username !== 'string' || typeof contactMethod !== 'string') {
      return res.status(400).json({ error: "Format de données invalide." });
    }
    if (contactMethod.length > 254) {
      return res.status(400).json({ error: "Méthode de contact trop longue." });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
      
      if (!user) {
        // Return success anyway to prevent username enumeration
        return res.json({ success: true });
      }

      // Verify if the contact method matches the hashed email or phone
      const methodLower = (contactMethod || '').toLowerCase().trim();
      const methodPhone = (contactMethod || '').replace(/\s+/g, '');

      const matchesEmail = user.email && bcrypt.compareSync(methodLower, user.email);
      const matchesPhone = user.phone && bcrypt.compareSync(methodPhone, user.phone);

      if (!matchesEmail && !matchesPhone) {
        // Return success anyway to prevent enumeration, but don't create ticket
        return res.json({ success: true });
      }

      // Store the PLAINTEXT contact method in the ticket so admins can see it and contact them
      db.prepare(`
        INSERT INTO password_reset_requests (user_id, contact_method, created_at)
        VALUES (?, ?, ?)
      `).run(user.id, contactMethod, Date.now());

      res.json({ success: true });
    } catch (error: any) {
      console.error('Request reset error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la demande de réinitialisation.' });
    }
  });

  app.get('/api/admin/reset-requests', requireAuth, requireAdmin, (req: any, res: any) => {
    try {
      const requests = db.prepare(`
        SELECT r.id, r.status, r.contact_method, r.created_at, u.username, u.email, u.phone
        FROM password_reset_requests r
        JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
      `).all();
      res.json(requests);
    } catch (error: any) {
      console.error('Get reset requests error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la récupération des demandes.' });
    }
  });

  app.post('/api/admin/resolve-reset', requireAuth, requireAdmin, async (req: any, res: any) => {
    const { requestId, newPassword } = req.body;

    if (typeof requestId !== 'number' || typeof newPassword !== 'string') {
      return res.status(400).json({ error: "Format de données invalide." });
    }
    if (!newPassword || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit contenir entre 8 et 128 caractères." });
    }

    try {
      const request = db.prepare('SELECT * FROM password_reset_requests WHERE id = ?').get(requestId) as any;
      if (!request) {
        return res.status(404).json({ error: "Demande non trouvée." });
      }

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(request.user_id) as any;
      if (!user) {
        return res.status(404).json({ error: "Utilisateur non trouvé." });
      }

      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(newPassword, salt);

      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, request.user_id);
      db.prepare('UPDATE password_reset_requests SET status = ?, contact_method = ? WHERE id = ?').run('resolved', '[EFFACÉ]', requestId);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Resolve reset error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la résolution de la demande.' });
    }
  });

  app.get('/api/leaderboard', requireAuth, (req, res) => {
    try {
      const users = db.prepare(`
        SELECT id, username, display_name, points, total_earned, trip_count, streak, longest_trip_km, total_distance_km
        FROM users
        ORDER BY points DESC
        LIMIT 10
      `).all();
      res.json(users);
    } catch (error: any) {
      console.error('Leaderboard error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la récupération du classement.' });
    }
  });

  app.post('/api/game/submit', requireAuth, gameSubmitLimiter, (req: any, res: any) => {
    const { score, distanceKm, crossings, isFailed } = req.body;
    const userId = req.user.id; // Extracted securely from JWT

    // Input validation
    if (typeof score !== 'number' || score < 0 || score > 50000 || !Number.isInteger(score)) {
      return res.status(400).json({ error: 'Score invalide' });
    }
    if (typeof distanceKm !== 'number' || distanceKm < 0 || distanceKm > 10000) {
      return res.status(400).json({ error: 'Distance invalide' });
    }
    if (typeof crossings !== 'number' || crossings < 0 || crossings > 1000 || !Number.isInteger(crossings)) {
      return res.status(400).json({ error: 'Nombre de passages invalide' });
    }
    if (isFailed !== undefined && typeof isFailed !== 'boolean') {
      return res.status(400).json({ error: 'Format isFailed invalide' });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const now = Date.now();
      
      if (isFailed) {
        db.prepare(`
          UPDATE users 
          SET points = 0, 
              streak = 0,
              has_lost = 1,
              trip_count = trip_count + 1, 
              total_distance_km = total_distance_km + ?, 
              longest_trip_km = MAX(longest_trip_km, ?), 
              max_crossings_in_trip = MAX(max_crossings_in_trip, ?)
          WHERE id = ?
        `).run(distanceKm, distanceKm, crossings, userId);
      } else {
        db.prepare(`
          UPDATE users 
          SET points = points + ?, 
              total_earned = total_earned + ?, 
              streak = streak + ?,
              trip_count = trip_count + 1, 
              total_distance_km = total_distance_km + ?, 
              longest_trip_km = MAX(longest_trip_km, ?), 
              max_crossings_in_trip = MAX(max_crossings_in_trip, ?)
          WHERE id = ?
        `).run(score, score, score > 0 ? 1 : 0, distanceKm, distanceKm, crossings, userId);
      }

      // Record session
      db.prepare(`
        INSERT INTO game_sessions (user_id, score, distance_km, crossings, ended_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, score, distanceKm, crossings, now);

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.display_name,
        points: updatedUser.points,
        totalEarned: updatedUser.total_earned,
        tripCount: updatedUser.trip_count,
        streak: updatedUser.streak,
        longestTripKm: updatedUser.longest_trip_km,
        totalDistanceKm: updatedUser.total_distance_km,
        maxCrossingsInTrip: updatedUser.max_crossings_in_trip,
        createdAt: updatedUser.created_at,
        isAdmin: updatedUser.is_admin === 1,
        preferences: safeJsonParse(updatedUser.preferences),
        homeLocation: safeJsonParse(updatedUser.home_location)
      });
    } catch (error: any) {
      console.error('Submit game error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la sauvegarde de la partie.' });
    }
  });

  app.get('/api/history', requireAuth, (req: any, res: any) => {
    const userId = req.user.id; // Extracted securely from JWT

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
    } catch (error: any) {
      console.error('History error:', error.message);
      res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique.' });
    }
  });

  // User Profile Endpoints
  app.get('/api/users/me', requireAuth, (req: any, res: any) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
      if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      res.json({
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        points: user.points,
        totalEarned: user.total_earned,
        tripCount: user.trip_count,
        streak: user.streak,
        longestTripKm: user.longest_trip_km,
        totalDistanceKm: user.total_distance_km,
        maxCrossingsInTrip: user.max_crossings_in_trip,
        createdAt: user.created_at,
        isAdmin: user.is_admin === 1,
        preferences: safeJsonParse(user.preferences),
        homeLocation: safeJsonParse(user.home_location)
      });
    } catch (error: any) {
      console.error('Get me error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.put('/api/users/me', requireAuth, (req: any, res: any) => {
    const { displayName, preferences, homeLocation } = req.body;

    if (displayName && (typeof displayName !== 'string' || displayName.length > 50)) {
      return res.status(400).json({ error: 'Nom d\'affichage invalide' });
    }

    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;
      if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      const newDisplayName = displayName || user.display_name;
      const newPreferences = preferences ? JSON.stringify(preferences) : user.preferences;
      const newHomeLocation = homeLocation ? JSON.stringify(homeLocation) : user.home_location;

      db.prepare(`
        UPDATE users 
        SET display_name = ?, preferences = ?, home_location = ?
        WHERE id = ?
      `).run(newDisplayName, newPreferences, newHomeLocation, req.user.id);

      const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as any;

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.display_name,
        points: updatedUser.points,
        totalEarned: updatedUser.total_earned,
        tripCount: updatedUser.trip_count,
        streak: updatedUser.streak,
        longestTripKm: updatedUser.longest_trip_km,
        totalDistanceKm: updatedUser.total_distance_km,
        maxCrossingsInTrip: updatedUser.max_crossings_in_trip,
        createdAt: updatedUser.created_at,
        isAdmin: updatedUser.is_admin === 1,
        preferences: safeJsonParse(updatedUser.preferences),
        homeLocation: safeJsonParse(updatedUser.home_location)
      });
    } catch (error: any) {
      console.error('Update me error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.get('/api/users/:id', requireAuth, (req: any, res: any) => {
    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId)) return res.status(400).json({ error: 'ID invalide' });

      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId) as any;
      if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      const prefs = safeJsonParse(user.preferences);
      if (prefs && prefs.isPublicProfile === false && req.user.id !== user.id && !req.user.isAdmin) {
        return res.status(403).json({ error: 'Profil privé' });
      }

      // Check friendship status
      let friendStatus = 'none';
      if (req.user.id === user.id) {
        friendStatus = 'self';
      } else {
        const sentRequest = db.prepare('SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?').get(req.user.id, user.id) as any;
        const receivedRequest = db.prepare('SELECT * FROM friend_requests WHERE sender_id = ? AND receiver_id = ?').get(user.id, req.user.id) as any;

        if (sentRequest?.status === 'accepted' || receivedRequest?.status === 'accepted') {
          friendStatus = 'friends';
        } else if (sentRequest?.status === 'pending') {
          friendStatus = 'pending_sent';
        } else if (receivedRequest?.status === 'pending') {
          friendStatus = 'pending_received';
        }
      }

      // Load recent trips if allowed
      let recentTrips: any[] = [];
      const canViewTrips = prefs?.showTripHistory !== false;
      if (canViewTrips) {
        const sessions = db.prepare(`
          SELECT * FROM game_sessions 
          WHERE user_id = ? 
          ORDER BY ended_at DESC
          LIMIT 5
        `).all(user.id);
        
        recentTrips = sessions.map((session: any) => ({
          id: session.id,
          userId: session.user_id,
          routeName: 'Trajet',
          distanceKm: session.distance_km,
          crossingsCount: session.crossings,
          success: session.score > 0,
          date: session.ended_at
        }));
      }

      res.json({
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          points: user.points,
          totalEarned: user.total_earned,
          tripCount: user.trip_count,
          streak: user.streak,
          longestTripKm: user.longest_trip_km,
          totalDistanceKm: user.total_distance_km,
          maxCrossingsInTrip: user.max_crossings_in_trip,
          createdAt: user.created_at,
          preferences: prefs
        },
        friendStatus,
        recentTrips
      });
    } catch (error: any) {
      console.error('Get user error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Friends Endpoints
  app.get('/api/friends', requireAuth, (req: any, res: any) => {
    try {
      const requests = db.prepare(`
        SELECT fr.id, fr.sender_id, fr.receiver_id, fr.status, fr.created_at,
               u1.username as sender_username, u1.display_name as sender_display_name,
               u2.username as receiver_username, u2.display_name as receiver_display_name
        FROM friend_requests fr
        JOIN users u1 ON fr.sender_id = u1.id
        JOIN users u2 ON fr.receiver_id = u2.id
        WHERE fr.sender_id = ? OR fr.receiver_id = ?
      `).all(req.user.id, req.user.id);
      
      res.json(requests);
    } catch (error: any) {
      console.error('Get friends error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/friends/request', requireAuth, (req: any, res: any) => {
    const { targetUserId } = req.body;
    if (typeof targetUserId !== 'number' || targetUserId === req.user.id) {
      return res.status(400).json({ error: 'ID utilisateur invalide' });
    }

    try {
      const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as any;
      if (!targetUser) return res.status(404).json({ error: 'Utilisateur non trouvé' });

      const prefs = safeJsonParse(targetUser.preferences);
      if (prefs && prefs.allowFriendRequests === false) {
        return res.status(403).json({ error: 'Cet utilisateur n\'accepte pas les demandes d\'amis' });
      }

      db.prepare(`
        INSERT INTO friend_requests (sender_id, receiver_id, created_at)
        VALUES (?, ?, ?)
      `).run(req.user.id, targetUserId, Date.now());

      res.json({ success: true });
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(400).json({ error: 'Demande déjà envoyée' });
      }
      console.error('Friend request error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/friends/accept', requireAuth, (req: any, res: any) => {
    const { requestId } = req.body;
    if (typeof requestId !== 'number') return res.status(400).json({ error: 'ID invalide' });

    try {
      const info = db.prepare(`
        UPDATE friend_requests 
        SET status = 'accepted' 
        WHERE id = ? AND receiver_id = ? AND status = 'pending'
      `).run(requestId, req.user.id);

      if (info.changes === 0) return res.status(404).json({ error: 'Demande non trouvée ou déjà traitée' });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Accept friend error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.post('/api/friends/reject', requireAuth, (req: any, res: any) => {
    const { requestId } = req.body;
    if (typeof requestId !== 'number') return res.status(400).json({ error: 'ID invalide' });

    try {
      const info = db.prepare(`
        UPDATE friend_requests 
        SET status = 'rejected' 
        WHERE id = ? AND receiver_id = ? AND status = 'pending'
      `).run(requestId, req.user.id);

      if (info.changes === 0) return res.status(404).json({ error: 'Demande non trouvée ou déjà traitée' });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Reject friend error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Admin User Moderation
  app.get('/api/admin/users', requireAuth, requireAdmin, (req: any, res: any) => {
    try {
      const users = db.prepare(`
        SELECT id, username, display_name, points, total_earned, trip_count, streak, longest_trip_km, total_distance_km, created_at, is_admin
        FROM users
        ORDER BY created_at DESC
      `).all();
      
      const formattedUsers = users.map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        points: u.points,
        totalEarned: u.total_earned,
        tripCount: u.trip_count,
        streak: u.streak,
        longestTripKm: u.longest_trip_km,
        totalDistanceKm: u.total_distance_km,
        createdAt: u.created_at,
        isAdmin: u.is_admin === 1
      }));

      res.json(formattedUsers);
    } catch (error: any) {
      console.error('Admin get users error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  app.delete('/api/admin/users/:id', requireAuth, requireAdmin, (req: any, res: any) => {
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId === req.user.id) {
      return res.status(400).json({ error: 'ID invalide' });
    }

    try {
      db.transaction(() => {
        db.prepare('DELETE FROM game_sessions WHERE user_id = ?').run(targetId);
        db.prepare('DELETE FROM password_reset_requests WHERE user_id = ?').run(targetId);
        db.prepare('DELETE FROM friend_requests WHERE sender_id = ? OR receiver_id = ?').run(targetId, targetId);
        db.prepare('DELETE FROM users WHERE id = ?').run(targetId);
      })();
      res.json({ success: true });
    } catch (error: any) {
      console.error('Admin delete user error:', error.message);
      res.status(500).json({ error: 'Erreur serveur' });
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
