# From Testing to Production: The Ultimate Guide

This guide outlines the professional workflow for moving your game from a development/testing environment to a live production server.

## 1. The "Golden Rule" of Environments
Never use the same configuration for testing and production.

| Feature | Testing (Development) | Production (Live) |
| :--- | :--- | :--- |
| **Database** | `./data/game.db` (Temporary/Messy) | `/var/lib/app/prod.db` (Safe/Backed up) |
| **API Keys** | Your personal Gemini Key | A dedicated Project Gemini Key |
| **Errors** | Detailed logs in terminal | Logged to files, hidden from users |
| **Performance** | Vite Dev Server (Slow) | Compiled Static Files (Fast) |

---

## 2. The Deployment Workflow (The "Loop")

Every time you want to update the production server, follow these 3 steps:

### Step A: On Your Computer (Push)
1. Verify the code works locally.
2. `git add .`
3. `git commit -m "Description of change"`
4. `git push origin main`

### Step B: On the Server (Pull & Build)
1. `git pull origin main`
2. `npm install` (Only if you added new libraries)
3. `npm run build` (Crucial: This updates the actual website files)

### Step C: On the Server (Restart)
1. `pm2 restart le-jeu-du-train`

---

## 3. Production Checklist

### [ ] Environment Variables (`.env`)
Ensure the production server has its own `.env` file with:
- `NODE_ENV=production`
- `DATABASE_PATH` pointing to a persistent location.
- `GEMINI_API_KEY` (Paid/Tiered key if expecting many users).

### [ ] Process Management (PM2)
Don't use `npm start` directly on a server. Use PM2 to ensure the app restarts if the server crashes:
```bash
npm install -g pm2
pm2 start server.ts --name "le-jeu-du-train" --interpreter tsx
pm2 save
pm2 startup
```

### [ ] Database Backups
Since SQLite is a single file, backups are easy. Set up a "cron job" (scheduled task) to copy your `.db` file to a safe location once a day.

### [ ] Security
- Ensure port 3000 is open in the firewall.
- (Advanced) Use Nginx as a "Reverse Proxy" to add SSL (HTTPS) so the URL looks like `https://lejeudutrain.com` instead of `http://IP:3000`.

---

## 4. How to Test "In Production" Safely
If you want to test a big new feature without breaking the game for everyone:
1. Create a "Staging" folder on the server.
2. Deploy the code there first.
3. Connect it to a `staging.db`.
4. If it works there, then repeat the steps for the main Production folder.
